package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import com.peephole.server.vonage.MessagesWebhookReader.MessageStatusUpdate;
import org.junit.jupiter.api.Test;

class MessagesWebhookReaderTest {

    private static final String SECRET = "test-messages-signature-secret";
    private static final String UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";
    private static final String BODY =
            "{\"message_uuid\":\"" + UUID + "\",\"to\":\"34600000001\",\"from\":\"Peephole\","
                    + "\"timestamp\":\"2099-01-01T12:00:00Z\",\"status\":\"delivered\",\"channel\":\"sms\",\"client_ref\":\"42\"}";

    private final MessagesWebhookReader reader = new MessagesWebhookReader(new WebhookSignatureVerifier(SECRET));

    @Test
    void acceptsABodySignedWithTheSecret() {
        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor(SECRET, BODY), BODY))
                .isTrue();
    }

    @Test
    void acceptsATokenWithoutTheHashOnItsSignature() {
        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationWithoutBodyHash(SECRET), BODY))
                .isTrue();
    }

    @Test
    void refusesAnotherBodyAnotherSecretOrNoToken() {
        String forged = BODY.replace("delivered", "rejected");

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor(SECRET, BODY), forged))
                .isFalse();
        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor("another-secret", BODY), BODY))
                .isFalse();
        assertThat(reader.isSignedByVonage(null, BODY)).isFalse();
    }

    @Test
    void readsTheStatusInLowercase() {
        assertThat(reader.readStatus(BODY.replace("delivered", "DELIVERED")))
                .contains(new MessageStatusUpdate("42", UUID, "delivered"));
    }

    @Test
    void readsNothingFromABodyItCannotUse() {
        assertThat(reader.readStatus("not json")).isEmpty();
        assertThat(reader.readStatus(null)).isEmpty();
        assertThat(reader.readStatus("{\"status\":\"delivered\"}")).isEmpty();
    }
}
