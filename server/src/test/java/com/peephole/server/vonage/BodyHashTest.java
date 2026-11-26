package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BodyHashTest {

    private static final String SECRET = "test-signature-secret";
    private static final String BODY = "{\"uuid\":\"63f61863-4a51-4f6b-86e1-46edebcf9356\",\"status\":\"busy\"}";

    @Test
    void matchesTheBodyItWasSignedWith() {
        assertThat(BodyHash.check(TestVoiceWebhookTokens.authorizationFor(SECRET, BODY), BODY))
                .isEqualTo(BodyHash.MATCHES);
    }

    @Test
    void matchesTheSameBodyWithSpaces() {
        String withSpaces = BODY.replace(",", ", ").replace(":", ": ");

        assertThat(BodyHash.check(TestVoiceWebhookTokens.authorizationFor(SECRET, BODY), withSpaces))
                .isEqualTo(BodyHash.MATCHES);
    }

    @Test
    void doesNotMatchAnotherBody() {
        assertThat(BodyHash.check(
                        TestVoiceWebhookTokens.authorizationFor(SECRET, BODY), BODY.replace("busy", "completed")))
                .isEqualTo(BodyHash.DOES_NOT_MATCH);
    }

    @Test
    void isMissingWhenTheTokenHasNoHash() {
        assertThat(BodyHash.check(TestVoiceWebhookTokens.authorizationWithoutBodyHash(SECRET), BODY))
                .isEqualTo(BodyHash.MISSING);
    }

    @Test
    void doesNotMatchATokenThatCannotBeRead() {
        assertThat(BodyHash.check("Bearer not-a-jwt", BODY)).isEqualTo(BodyHash.DOES_NOT_MATCH);
        assertThat(BodyHash.check(null, BODY)).isEqualTo(BodyHash.DOES_NOT_MATCH);
    }
}
