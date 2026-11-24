package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;

import com.peephole.server.vonage.VoiceWebhookReader.CallEvent;
import com.peephole.server.vonage.VoiceWebhookReader.KeyInput;
import org.junit.jupiter.api.Test;

class VoiceWebhookReaderTest {

    private static final String SECRET = "test-voice-signature-secret";
    private static final String CALL_UUID = "63f61863-4a51-4f6b-86e1-46edebcf9356";

    private final VoiceWebhookReader reader = new VoiceWebhookReader(new WebhookSignatureVerifier(SECRET));

    @Test
    void acceptsABodySignedWithTheSecretOfTheAccount() {
        String body = keyBody("\"1\"", false);

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor(SECRET, body), body))
                .isTrue();
    }

    @Test
    void refusesAnotherSecretOrNoToken() {
        String body = keyBody("\"1\"", false);

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor("another-secret", body), body))
                .isFalse();
        assertThat(reader.isSignedByVonage(null, body)).isFalse();
    }

    @Test
    void refusesAValidTokenThatCameWithAnotherBody() {
        // A JWT that leaked can't carry a forged key
        String signedBody = keyBody("\"1\"", false);
        String forgedBody = keyBody("\"2\"", false);

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor(SECRET, signedBody), forgedBody))
                .isFalse();
    }

    @Test
    void refusesATokenWithoutTheHashOfTheBody() {
        assertThat(reader.isSignedByVonage(
                        TestVoiceWebhookTokens.authorizationWithoutBodyHash(SECRET), keyBody("\"1\"", false)))
                .isFalse();
    }

    @Test
    void acceptsABodyThatArrivedWithSpacesWhenItsCompactFormMatches() {
        String compact = "{\"uuid\":\"" + CALL_UUID + "\",\"status\":\"busy\"}";
        String withSpaces = "{ \"uuid\": \"" + CALL_UUID + "\", \"status\": \"busy\" }";

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor(SECRET, compact), withSpaces))
                .isTrue();
    }

    @Test
    void readsTheKeyPressed() {
        assertThat(reader.readKeyInput(keyBody("\"1\"", false))).contains(new KeyInput(CALL_UUID, "1"));
    }

    @Test
    void readsNoKeyWhenTheTimeRunsOut() {
        assertThat(reader.readKeyInput(keyBody("\"\"", true))).contains(new KeyInput(CALL_UUID, ""));
    }

    @Test
    void readsTheStatusOfACallEventInLowercase() {
        String body = """
                {"from":"34911067298","to":"34600000001","uuid":"%s","conversation_uuid":"CON-1",
                 "status":"busy","direction":"outbound","timestamp":"2026-11-23T10:45:00.000Z"}
                """.formatted(CALL_UUID);

        assertThat(reader.readEvent(body)).contains(new CallEvent(CALL_UUID, "busy"));
    }

    @Test
    void readsAVoicemailAsTheMachineStatus() {
        String body = """
                {"uuid":"%s","status":"machine","sub_state":"beep_start","timestamp":"2026-11-23T10:45:00.000Z"}
                """.formatted(CALL_UUID);

        assertThat(reader.readEvent(body)).contains(new CallEvent(CALL_UUID, "machine"));
    }

    @Test
    void readsNothingFromABodyThatIsNotJson() {
        assertThat(reader.readKeyInput("not json")).isEmpty();
        assertThat(reader.readEvent("not json")).isEmpty();
    }

    // Shaped as the input webhook of the Voice API reference
    private static String keyBody(String digits, boolean timedOut) {
        return """
                {"speech":{"results":[]},"dtmf":{"digits":%s,"timed_out":%s},"from":"34911067298",
                 "to":"34600000001","uuid":"%s","conversation_uuid":"CON-1",
                 "timestamp":"2026-11-23T10:45:12.000Z"}
                """.formatted(digits, timedOut, CALL_UUID);
    }
}
