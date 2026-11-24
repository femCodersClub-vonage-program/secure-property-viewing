package com.peephole.server.vonage;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

// JWTs for the Verify status webhook that carry the payload_hash claim, as Vonage signs them: the SHA-256 of the body
// in hex. Built by hand, so the tests need no other library
public final class VerifyWebhookTokens {

    private static final Base64.Encoder BASE64_URL = Base64.getUrlEncoder().withoutPadding();

    private VerifyWebhookTokens() {}

    public static String signedWithHashOf(String secret, String body) {
        return signed(secret, "{\"payload_hash\":\"" + sha256(body) + "\"}");
    }

    private static String signed(String secret, String claims) {
        String unsigned = encode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}") + "." + encode(claims);
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return unsigned + "." + BASE64_URL.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HmacSHA256 is not available", exception);
        }
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static String encode(String json) {
        return BASE64_URL.encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }
}
