package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class VerifyWebhookReaderTest {

    private static final String SECRET = "test-signature-secret";
    private static final String BODY =
            "{\"request_id\":\"c11236f4-00bf-4b89-84ba-88b25df97315\",\"type\":\"summary\",\"status\":\"expired\"}";

    private final VerifyWebhookReader reader = new VerifyWebhookReader(new WebhookSignatureVerifier(SECRET));

    // The Vonage documentation does not say whether Verify adds payload_hash, so the signature alone is enough
    // without it
    @Test
    void acceptsASignedTokenWithoutAPayloadHash() {
        assertThat(reader.isSignedByVonage("Bearer " + TestWebhookTokens.signedWith(SECRET), BODY))
                .isTrue();
    }

    @Test
    void acceptsABodyThatMatchesItsHash() {
        assertThat(reader.isSignedByVonage("Bearer " + VerifyWebhookTokens.signedWithHashOf(SECRET, BODY), BODY))
                .isTrue();
    }

    @Test
    void acceptsTheSameBodyWithSpaces() {
        String withSpaces = BODY.replace(",", ", ").replace(":", ": ");

        assertThat(reader.isSignedByVonage("Bearer " + VerifyWebhookTokens.signedWithHashOf(SECRET, BODY), withSpaces))
                .isTrue();
    }

    @Test
    void rejectsABodyThatDoesNotMatchItsHash() {
        String otherBody = BODY.replace("expired", "completed");

        assertThat(reader.isSignedByVonage("Bearer " + VerifyWebhookTokens.signedWithHashOf(SECRET, BODY), otherBody))
                .isFalse();
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        assertThat(reader.isSignedByVonage(
                        "Bearer " + VerifyWebhookTokens.signedWithHashOf("another-secret", BODY), BODY))
                .isFalse();
    }

    @Test
    void rejectsAMissingToken() {
        assertThat(reader.isSignedByVonage(null, BODY)).isFalse();
    }

    @Test
    void readsTheCallback() {
        assertThat(reader.read(BODY)).map(VerifyStatusCallback::status).contains(VerifyCallbackStatus.EXPIRED);
    }
}
