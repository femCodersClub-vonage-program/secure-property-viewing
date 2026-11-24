package com.peephole.server.vonage;

import com.vonage.client.voice.DtmfResult;
import com.vonage.client.voice.EventWebhook;
import java.util.Optional;

/** Checks and reads the webhooks Vonage sends during a voice call, so features never parse them with the SDK. */
public class VoiceWebhookReader {

    private final WebhookSignatureVerifier signatureVerifier;

    public VoiceWebhookReader(WebhookSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    /**
     * Whether Vonage signed this webhook and its body. The signature alone doesn't cover the body, so a JWT that
     * leaked, such as through the ngrok inspector, could otherwise come with a forged key or status. Voice always
     * sends the payload_hash claim, so a token without it is rejected.
     */
    public boolean isSignedByVonage(String authorization, String body) {
        return signatureVerifier.isValid(authorization) && BodyHash.check(authorization, body) == BodyHash.MATCHES;
    }

    /** The key pressed after the question, or an empty {@code digits} when none arrived in time. */
    public Optional<KeyInput> readKeyInput(String body) {
        return parse(body).map(webhook -> {
            DtmfResult dtmf = webhook.getDtmf();
            String digits = dtmf == null || dtmf.getDigits() == null ? "" : dtmf.getDigits();
            return new KeyInput(webhook.getCallUuid(), digits);
        });
    }

    /** The call's new status in lowercase, such as {@code busy} or {@code completed}. */
    public Optional<CallEvent> readEvent(String body) {
        return parse(body)
                .filter(webhook -> webhook.getStatus() != null)
                .map(webhook ->
                        new CallEvent(webhook.getCallUuid(), webhook.getStatus().toString()));
    }

    // A body Vonage signed but that can't be read is treated like one about an unknown call
    private static Optional<EventWebhook> parse(String body) {
        try {
            return Optional.of(EventWebhook.fromJson(body));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    public record KeyInput(String callUuid, String digits) {}

    public record CallEvent(String callUuid, String status) {}
}
