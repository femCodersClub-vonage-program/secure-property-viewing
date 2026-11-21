package com.peephole.server.vonage;

import com.vonage.jwt.Jwt;

// Checks the JWT that Vonage puts in the Authorization header of its webhooks, signed with the signature secret of
// the Vonage account (SHA-256 HMAC). Never logs the header or the secret
public class WebhookSignatureVerifier {

    private static final String BEARER = "Bearer ";

    private final String secret;

    public WebhookSignatureVerifier(String secret) {
        this.secret = secret == null ? "" : secret.strip();
    }

    public boolean isValid(String authorization) {
        // Without a secret nothing can be checked, so every call is rejected
        if (secret.isEmpty() || authorization == null || !authorization.startsWith(BEARER)) {
            return false;
        }
        try {
            return Jwt.verifySignature(authorization.substring(BEARER.length()).strip(), secret);
        } catch (RuntimeException exception) {
            // A token that cannot be read is not a valid signature either
            return false;
        }
    }
}
