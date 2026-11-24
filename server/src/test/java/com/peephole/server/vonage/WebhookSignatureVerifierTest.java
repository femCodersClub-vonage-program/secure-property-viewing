package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class WebhookSignatureVerifierTest {

    private static final String SECRET = "test-signature-secret";

    private final WebhookSignatureVerifier verifier = new WebhookSignatureVerifier(SECRET);

    @Test
    void acceptsATokenSignedWithTheSecret() {
        assertThat(verifier.isValid("Bearer " + TestWebhookTokens.signedWith(SECRET)))
                .isTrue();
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() {
        assertThat(verifier.isValid("Bearer " + TestWebhookTokens.signedWith("another-secret")))
                .isFalse();
    }

    @Test
    void rejectsATokenWithoutTheBearerPrefix() {
        assertThat(verifier.isValid(TestWebhookTokens.signedWith(SECRET))).isFalse();
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"Bearer ", "Bearer not-a-jwt", "Basic dXNlcjpwYXNz"})
    void rejectsAMissingOrUnreadableHeader(String authorization) {
        assertThat(verifier.isValid(authorization)).isFalse();
    }

    @Test
    void rejectsEveryTokenWithoutASecret() {
        WebhookSignatureVerifier withoutSecret = new WebhookSignatureVerifier(" ");

        assertThat(withoutSecret.isValid("Bearer " + TestWebhookTokens.signedWith(" ")))
                .isFalse();
    }
}
