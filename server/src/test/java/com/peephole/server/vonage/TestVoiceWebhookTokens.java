package com.peephole.server.vonage;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// Builds the JWT Vonage puts in the Authorization header of its voice webhooks: signed with SHA-256 HMAC and with the
// SHA-256 of the body in its payload_hash claim, so the tests never need a real call from Vonage
public final class TestVoiceWebhookTokens {

    private static final Base64.Encoder BASE64_URL = Base64.getUrlEncoder().withoutPadding();

    private TestVoiceWebhookTokens() {}

    /** The Authorization header Vonage would send with {@code body}. */
    public static String authorizationFor(String secret, String body) {
        return "Bearer " + signed(secret, "\"payload_hash\":\"" + sha256(body) + "\"");
    }

    /** A token correctly signed, but with no payload_hash claim. */
    public static String authorizationWithoutBodyHash(String secret) {
        return "Bearer " + signed(secret, "\"jti\":\"test\"");
    }

    private static String signed(String secret, String extraClaim) {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        // Issued a minute ago, so it is never in the future for the check
        String payload = encode("{\"iat\":" + Instant.now().minusSeconds(60).getEpochSecond() + ",\"iss\":\"Vonage\","
                + extraClaim + "}");
        String unsigned = header + "." + payload;
        return unsigned + "." + BASE64_URL.encodeToString(hmac(secret, unsigned));
    }

    private static String encode(String json) {
        return BASE64_URL.encodeToString(json.getBytes(UTF_8));
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static byte[] hmac(String secret, String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(UTF_8), "HmacSHA256"));
            return mac.doFinal(data.getBytes(UTF_8));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HmacSHA256 is not available", exception);
        }
    }
}
