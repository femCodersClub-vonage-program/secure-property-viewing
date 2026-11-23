package com.peephole.server.phoneverification;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.common.WebhookSignatureInvalidException;
import com.peephole.server.vonage.VerifyWebhookReader;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Vonage's event and summary callbacks for Silent Authentication (specs/silent-authentication.md). It is under
// /api/webhooks/**, so it needs no CSRF token and is checked with the JWT that Vonage signs instead
@RestController
@RequestMapping("/api/webhooks/verify")
@Tag(name = "Vonage webhooks", description = "Callbacks from Vonage, checked with the JWT it signs")
class VerifyWebhookController {

    private static final Logger LOGGER = LoggerFactory.getLogger(VerifyWebhookController.class);

    private final VerifyWebhookReader webhookReader;
    private final VerifyStatusCallbackService callbackService;

    VerifyWebhookController(VerifyWebhookReader webhookReader, VerifyStatusCallbackService callbackService) {
        this.webhookReader = webhookReader;
        this.callbackService = callbackService;
    }

    @PostMapping("/status")
    @Operation(
            summary = "Receive a Verify status callback",
            description = "Called by Vonage, not by the client, with a JWT in the Authorization header signed with the"
                    + " signature secret of the Vonage account. When the JWT carries a payload_hash, the body has to"
                    + " match it. A rejected or failed silent check moves a real number on to SMS and ends a +990 one"
                    + " FAILED, a blocked one ends FAILED, and an expired or cancelled request marks the verification"
                    + " EXPIRED")
    @ApiResponse(
            responseCode = "200",
            description = "The callback was applied, changed nothing or could not be read, so Vonage does not send it"
                    + " again")
    @ApiResponse(
            responseCode = "401",
            description = "WEBHOOK_SIGNATURE_INVALID: the Authorization header has no valid signature from Vonage, or"
                    + " the body does not match its payload_hash",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "500",
            description = "INTERNAL_ERROR: Vonage or the database failed while applying the callback. Nothing changes,"
                    + " and Vonage sends it again",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    void status(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody(required = false) String body) {
        if (!webhookReader.isSignedByVonage(authorization, body)) {
            // Without the header or the body, so nothing from the request reaches the logs
            LOGGER.warn("Rejected a Verify status callback without a valid signature");
            throw new WebhookSignatureInvalidException();
        }
        webhookReader
                .read(body)
                .ifPresentOrElse(
                        callbackService::handle,
                        // Without the body, which may carry personal data
                        () -> LOGGER.warn("Ignored a signed Verify status callback whose body could not be read"));
    }
}
