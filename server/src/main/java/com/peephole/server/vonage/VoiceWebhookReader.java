package com.peephole.server.vonage;

import com.vonage.client.voice.DtmfResult;
import com.vonage.client.voice.EventWebhook;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Checks and reads the webhooks Vonage sends during a voice call, so features never parse them with the SDK. */
public class VoiceWebhookReader {

    private static final String BEARER = "Bearer ";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final WebhookSignatureVerifier signatureVerifier;

    public VoiceWebhookReader(WebhookSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    /**
     * Whether Vonage signed this webhook and its body. The signature alone doesn't cover the body, so a JWT that
     * leaked, such as through the ngrok inspector, could otherwise come with a forged key or status.
     */
    public boolean isSignedByVonage(String authorization, String body) {
        return signatureVerifier.isValid(authorization) && bodyMatchesItsHash(authorization, body);
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

    // The payload_hash claim is the SHA-256 of the body as compact JSON. The body is compared as it arrived and, in
    // case it came with spaces, as compact JSON in the same order
    private static boolean bodyMatchesItsHash(String authorization, String body) {
        try {
            String[] parts = authorization.substring(BEARER.length()).strip().split("\\.");
            JsonNode claims = JSON.readTree(Base64.getUrlDecoder().decode(parts[1]));
            String expected = claims.path("payload_hash").asString("");
            return !expected.isEmpty()
                    && (expected.equalsIgnoreCase(sha256(body))
                            || expected.equalsIgnoreCase(sha256(JSON.writeValueAsString(JSON.readTree(body)))));
        } catch (RuntimeException exception) {
            // A token or a body that can't be read can't match
            return false;
        }
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
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
