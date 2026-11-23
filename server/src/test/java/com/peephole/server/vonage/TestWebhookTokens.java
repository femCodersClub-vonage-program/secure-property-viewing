package com.peephole.server.vonage;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// Builds a JWT signed with SHA-256 HMAC, like the one Vonage puts in the Authorization header of its webhooks, so the
// tests never need a real callback from Vonage
public final class TestWebhookTokens {

    private static final Base64.Encoder BASE64_URL = Base64.getUrlEncoder().withoutPadding();

    private TestWebhookTokens() {}

    public static String signedWith(String secret) {
        String header = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        // Issued a minute ago, so it is never in the future for the check
        String payload = encode("{\"iat\":" + Instant.now().minusSeconds(60).getEpochSecond() + "}");
        String unsigned = header + "." + payload;
        return unsigned + "." + BASE64_URL.encodeToString(hmac(secret, unsigned));
    }

    private static String encode(String json) {
        return BASE64_URL.encodeToString(json.getBytes(UTF_8));
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
