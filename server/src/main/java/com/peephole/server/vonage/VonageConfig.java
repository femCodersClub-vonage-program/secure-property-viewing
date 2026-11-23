package com.peephole.server.vonage;

import com.vonage.client.HttpConfig;
import com.vonage.client.VonageClient;
import java.util.Base64;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Fails at startup with the variable to check, and never puts the private key in a message or a log
@Configuration
class VonageConfig {
    @Bean
    PhoneVerifier phoneVerifier(
            @Value("${app.vonage.verify.application-id}") String applicationId,
            @Value("${app.vonage.verify.private-key}") String privateKey) {
        VonageClient client = buildClient("VONAGE_VERIFY", applicationId, privateKey);
        return new VonagePhoneVerifier(client.getVerify2Client());
    }

    @Bean
    VideoProvider videoProvider(
            @Value("${app.vonage.video.application-id}") String applicationId,
            @Value("${app.vonage.video.private-key}") String privateKey) {
        VonageClient client = buildClient("VONAGE_VIDEO", applicationId, privateKey);
        return new VonageVideoProvider(client.getVideoClient(), applicationId.strip());
    }

    // Off by default, so local development and the tests need no Vonage number. The scheduled check that calls is
    // off too, so this caller is never used while calls are off
    @Bean
    VoiceCaller voiceCaller(
            @Value("${app.voice.calls-enabled}") boolean callsEnabled,
            @Value("${app.vonage.voice.application-id}") String applicationId,
            @Value("${app.vonage.voice.private-key}") String privateKey,
            @Value("${app.vonage.voice.from-number}") String fromNumber) {
        if (!callsEnabled) {
            return (phone, question, keyUrl, eventUrl) -> {
                throw new VoiceCallException("Voice calls are off. Set VOICE_CALLS_ENABLED=true to place them");
            };
        }
        if (fromNumber.isBlank()) {
            throw new IllegalStateException(
                    "VONAGE_VOICE_FROM_NUMBER is not set. Add it to server/.env as explained in docs/setup.md");
        }
        VonageClient client = buildClient("VONAGE_VOICE", applicationId, privateKey);
        return new VonageVoiceCaller(client.getVoiceClient(), fromNumber.strip());
    }

    // With calls off, an empty secret still rejects every voice webhook
    @Bean
    VoiceWebhookReader voiceWebhookReader(
            @Value("${app.voice.calls-enabled}") boolean callsEnabled,
            @Value("${app.vonage.voice.signature-secret}") String signatureSecret) {
        if (callsEnabled && signatureSecret.isBlank()) {
            throw new IllegalStateException("VONAGE_VOICE_SIGNATURE_SECRET is not set. Add it to server/.env"
                    + " as explained in docs/setup.md");
        }
        return new VoiceWebhookReader(new WebhookSignatureVerifier(signatureSecret));
    }

    private static VonageClient buildClient(String variablePrefix, String applicationId, String privateKey) {
        UUID id = parseApplicationId(variablePrefix + "_APPLICATION_ID", applicationId);
        byte[] key = decodePrivateKey(variablePrefix + "_PRIVATE_KEY", privateKey);
        try {
            return VonageClient.builder()
                    .applicationId(id)
                    .privateKeyContents(key)
                    // Starting a verification and creating a video session both hold a database lock, so a slow
                    // Vonage must not keep it for long
                    .httpConfig(HttpConfig.builder().timeoutMillis(10_000).build())
                    .build();
        } catch (RuntimeException exception) {
            // The cause is left out on purpose, so nothing about the key can reach the logs
            throw new IllegalStateException(variablePrefix + "_PRIVATE_KEY does not match " + variablePrefix
                    + "_APPLICATION_ID. Check both as explained in docs/setup.md");
        }
    }

    private static UUID parseApplicationId(String variable, String applicationId) {
        if (applicationId.isBlank()) {
            throw new IllegalStateException(
                    variable + " is not set. Add it to server/.env as explained in docs/setup.md");
        }
        try {
            return UUID.fromString(applicationId.strip());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    variable + " is not a valid application ID. Check it as explained in docs/setup.md");
        }
    }

    private static byte[] decodePrivateKey(String variable, String privateKey) {
        if (privateKey.isBlank()) {
            throw new IllegalStateException(
                    variable + " is not set. Add it to server/.env as explained in docs/setup.md");
        }
        try {
            return Base64.getDecoder().decode(privateKey.strip());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    variable + " is not valid base64. Convert the key as explained in docs/setup.md");
        }
    }
}
