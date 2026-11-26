package com.peephole.server.vonage;

import java.util.Optional;

/**
 * Checks and reads the Verify status webhook. Unlike Voice, a token without the payload_hash claim is accepted on its
 * signature, because the Vonage documentation does not say whether Verify adds it.
 */
public class VerifyWebhookReader {

    private final WebhookSignatureVerifier signatureVerifier;

    public VerifyWebhookReader(WebhookSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    /**
     * Whether Vonage signed this webhook and, when its JWT carries a payload_hash claim, its body too. The signature
     * alone does not cover the body, so a JWT that leaked could otherwise come with a forged status.
     */
    public boolean isSignedByVonage(String authorization, String body) {
        return signatureVerifier.isValid(authorization)
                && BodyHash.check(authorization, body) != BodyHash.DOES_NOT_MATCH;
    }

    public Optional<VerifyStatusCallback> read(String body) {
        return VerifyStatusCallback.fromJson(body);
    }
}
