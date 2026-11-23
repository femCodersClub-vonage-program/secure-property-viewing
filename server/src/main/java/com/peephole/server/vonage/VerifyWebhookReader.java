package com.peephole.server.vonage;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Checks and reads the Verify status webhook, as VoiceWebhookReader does for the voice calls. */
public class VerifyWebhookReader {

    private static final String BEARER = "Bearer ";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final WebhookSignatureVerifier signatureVerifier;

    public VerifyWebhookReader(WebhookSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    /**
     * Whether Vonage signed this webhook and, when its JWT carries a payload_hash claim, its body too. The signature
     * alone does not cover the body, so a JWT that leaked could otherwise come with a forged status.
     */
    public boolean isSignedByVonage(String authorization, String body) {
        return signatureVerifier.isValid(authorization) && bodyMatchesItsHash(authorization, body);
    }

    public Optional<VerifyStatusCallback> read(String body) {
        return VerifyStatusCallback.fromJson(body);
    }

    // The Vonage documentation does not say whether Verify adds payload_hash, so without the claim the signature is
    // enough. The claim is signed too, so nobody can remove it without the secret. With it, the hash is the SHA-256 of
    // the body as compact JSON, compared with the body as it arrived and, in case it came with spaces, as compact JSON
    private static boolean bodyMatchesItsHash(String authorization, String body) {
        try {
            String[] parts = authorization.substring(BEARER.length()).strip().split("\\.");
            JsonNode claims = JSON.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!claims.has("payload_hash")) {
                return true;
            }
            String expected = claims.path("payload_hash").asString("");
            String text = body == null ? "" : body;
            return !expected.isEmpty()
                    && (expected.equalsIgnoreCase(sha256(text))
                            || expected.equalsIgnoreCase(sha256(JSON.writeValueAsString(JSON.readTree(text)))));
        } catch (RuntimeException exception) {
            // A token or a body that cannot be read cannot match
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
}
