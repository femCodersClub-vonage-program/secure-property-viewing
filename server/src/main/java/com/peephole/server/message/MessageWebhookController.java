package com.peephole.server.message;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.common.WebhookSignatureInvalidException;
import com.peephole.server.vonage.MessagesWebhookReader;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Called by Vonage. Under /api/webhooks, so they need no CSRF token: the JWT that Vonage signs is checked instead
@RestController
@RequestMapping("/api/webhooks/messages")
@Tag(name = "Messages webhooks", description = "Called by Vonage with the status of each SMS")
class MessageWebhookController {

    private static final Logger LOGGER = LoggerFactory.getLogger(MessageWebhookController.class);

    private final MessageService service;
    private final MessagesWebhookReader reader;
    private final Clock clock;

    MessageWebhookController(MessageService service, MessagesWebhookReader reader, Clock clock) {
        this.service = service;
        this.reader = reader;
        this.clock = clock;
    }

    @PostMapping("/status")
    @Operation(
            summary = "Receive the status of an SMS",
            description = "Moves the message by its client_ref, as the table in specs/messages.md describes."
                    + " DELIVERED and FAILED are final. Signed by Vonage with a JWT.")
    @ApiResponse(
            responseCode = "200",
            description = "The status was applied, changed nothing or could not be read, so Vonage does not send it"
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
            description = "INTERNAL_ERROR: the database failed, so Vonage sends the webhook again",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    void status(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody(required = false) String body) {
        checkSignature(authorization, body);
        reader.readStatus(body)
                .ifPresentOrElse(
                        update -> service.recordStatus(update, OffsetDateTime.now(clock)),
                        () -> LOGGER.warn("Ignored a signed message status whose body could not be read"));
    }

    // Replies are out of scope, so the body is never read or logged
    @PostMapping("/inbound")
    @Operation(
            summary = "Receive an inbound SMS",
            description = "Answers 200 and ignores the message. Signed by Vonage with a JWT.")
    @ApiResponse(responseCode = "200", description = "The message was received and ignored")
    @ApiResponse(
            responseCode = "401",
            description = "WEBHOOK_SIGNATURE_INVALID: the Authorization header has no valid signature from Vonage",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    void inbound(
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody(required = false) String body) {
        checkSignature(authorization, body);
    }

    private void checkSignature(String authorization, String body) {
        if (!reader.isSignedByVonage(authorization, body)) {
            LOGGER.warn("Rejected a Messages webhook without a valid signature");
            throw new WebhookSignatureInvalidException();
        }
    }
}
