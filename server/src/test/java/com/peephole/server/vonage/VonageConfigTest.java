package com.peephole.server.vonage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class VonageConfigTest {

    private static final String APPLICATION_ID = "00000000-0000-4000-8000-000000000001";

    private final VonageConfig config = new VonageConfig();

    @Test
    void buildsTheVideoProviderWithValidCredentials() throws Exception {
        VideoProvider provider = config.videoProvider(APPLICATION_ID, privateKey());

        assertThat(provider.applicationId()).isEqualTo(APPLICATION_ID);
    }

    @Test
    void namesTheVerifyVariablesForTheVerifyGroup() throws Exception {
        assertThatThrownBy(() -> config.phoneVerifier("", privateKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VERIFY_APPLICATION_ID is not set");
        assertThatThrownBy(() -> config.phoneVerifier(APPLICATION_ID, ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VERIFY_PRIVATE_KEY is not set");
    }

    @Test
    void failsWhenTheVideoApplicationIdIsMissing() throws Exception {
        assertThatThrownBy(() -> config.videoProvider(" ", privateKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VIDEO_APPLICATION_ID is not set");
    }

    @Test
    void failsWhenTheVideoApplicationIdIsNotAnId() throws Exception {
        assertThatThrownBy(() -> config.videoProvider("not-an-id", privateKey()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VIDEO_APPLICATION_ID is not a valid application ID");
    }

    @Test
    void failsWhenTheVideoPrivateKeyIsMissing() {
        assertThatThrownBy(() -> config.videoProvider(APPLICATION_ID, ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VIDEO_PRIVATE_KEY is not set");
    }

    @Test
    void failsWithoutShowingTheKeyWhenTheVideoPrivateKeyCantBeRead() {
        String unreadableKey = Base64.getEncoder().encodeToString("not a key".getBytes(StandardCharsets.US_ASCII));

        assertThatThrownBy(() -> config.videoProvider(APPLICATION_ID, unreadableKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VIDEO_PRIVATE_KEY does not match VONAGE_VIDEO_APPLICATION_ID")
                .hasNoCause();
    }

    // Post-visit call

    @Test
    void refusesToCallWhileCallsAreOffAndNeedsNoVoiceVariables() {
        VoiceCaller caller = config.voiceCaller(false, "", "", "");

        assertThatThrownBy(() -> caller.callAndAskForOneKey(
                        "+34600000001",
                        "¿Pregunta?",
                        URI.create("https://peephole.example/key"),
                        URI.create("https://peephole.example/event")))
                .isInstanceOf(VoiceCallException.class)
                .hasMessageContaining("VOICE_CALLS_ENABLED");
    }

    @Test
    void buildsTheVoiceCallerWithValidCredentialsWhenCallsAreOn() throws Exception {
        assertThat(config.voiceCaller(true, APPLICATION_ID, privateKey(), "34911067298"))
                .isInstanceOf(VonageVoiceCaller.class);
    }

    @Test
    void namesEachMissingVoiceVariableWhenCallsAreOn() throws Exception {
        assertThatThrownBy(() -> config.voiceCaller(true, APPLICATION_ID, privateKey(), " "))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VOICE_FROM_NUMBER is not set");
        assertThatThrownBy(() -> config.voiceCaller(true, "", privateKey(), "34911067298"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VOICE_APPLICATION_ID is not set");
        assertThatThrownBy(() -> config.voiceCaller(true, APPLICATION_ID, "", "34911067298"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VOICE_PRIVATE_KEY is not set");
        assertThatThrownBy(() -> config.voiceWebhookReader(true, ""))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("VONAGE_VOICE_SIGNATURE_SECRET is not set");
    }

    @Test
    void rejectsEveryVoiceWebhookWhileTheSecretIsMissing() {
        VoiceWebhookReader reader = config.voiceWebhookReader(false, "");

        String body = "{\"status\":\"busy\"}";

        assertThat(reader.isSignedByVonage(TestVoiceWebhookTokens.authorizationFor("any-secret", body), body))
                .isFalse();
    }

    private static String privateKey() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        byte[] key = generator.generateKeyPair().getPrivate().getEncoded();
        String pem = "-----BEGIN PRIVATE KEY-----\n" + Base64.getMimeEncoder().encodeToString(key)
                + "\n-----END PRIVATE KEY-----\n";
        return Base64.getEncoder().encodeToString(pem.getBytes(StandardCharsets.US_ASCII));
    }
}
