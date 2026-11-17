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
