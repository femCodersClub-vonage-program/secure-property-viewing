package com.peephole.server.postvisitcall;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.common.WebhookSignatureInvalidException;
import com.peephole.server.vonage.SpanishSpeech;
import com.peephole.server.vonage.VoiceWebhookReader;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Called by Vonage during the post-visit call. Under /api/webhooks, so they need no CSRF token: the JWT that Vonage
// signs with the account's signature secret is checked instead
@RestController
@RequestMapping("/api/webhooks/voice")
@Tag(name = "Voice webhooks", description = "Called by Vonage during the post-visit call")
class VoiceWebhookController {

    private static final Logger LOGGER = LoggerFactory.getLogger(VoiceWebhookController.class);

    private final PostVisitCallService service;
    private final VoiceWebhookReader reader;

    VoiceWebhookController(PostVisitCallService service, VoiceWebhookReader reader) {
        this.service = service;
        this.reader = reader;
    }

    @PostMapping(path = "/input", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Receive the key pressed",
            description = "Records the visitor's key the first time and answers with the closing sentence as an NCCO."
                    + " A repeat answers the same sentence and changes nothing. Signed by Vonage with a JWT.")
    @ApiResponse(responseCode = "200", description = "The NCCO that ends the call")
    @ApiResponse(
            responseCode = "401",
            description = "WEBHOOK_SIGNATURE_INVALID: the Authorization header has no JWT signed by Vonage for this"
                    + " body",
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
    String receiveKey(
            @RequestParam long callId,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody String body) {
        checkSignature(authorization, body);
        String closing = reader.readKeyInput(body)
                .map(input -> service.recordKey(callId, input))
                .orElseGet(() -> {
                    LOGGER.warn("Ignored an unreadable key webhook for post-visit call {}", callId);
                    return PostVisitCallTexts.NO_VALID_KEY;
                });
        return SpanishSpeech.closingNcco(closing);
    }

    @PostMapping("/event")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Receive a call status",
            description = "Marks the call as not reached when it was busy, unanswered, rejected, answered by voicemail"
                    + " or completed with no key. Other statuses are ignored. Signed by Vonage with a JWT.")
    @ApiResponse(responseCode = "204", description = "The status was received")
    @ApiResponse(
            responseCode = "401",
            description = "WEBHOOK_SIGNATURE_INVALID: the Authorization header has no JWT signed by Vonage for this"
                    + " body",
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
    void receiveEvent(
            @RequestParam long callId,
            @RequestHeader(name = HttpHeaders.AUTHORIZATION, required = false) String authorization,
            @RequestBody String body) {
        checkSignature(authorization, body);
        reader.readEvent(body)
                .ifPresentOrElse(
                        event -> service.recordEvent(callId, event),
                        () -> LOGGER.warn("Ignored an unreadable event webhook for post-visit call {}", callId));
    }

    private void checkSignature(String authorization, String body) {
        if (!reader.isSignedByVonage(authorization, body)) {
            throw new WebhookSignatureInvalidException();
        }
    }
}
