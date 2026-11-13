package com.peephole.server.vonage;

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
        UUID id = parseApplicationId(applicationId);
        byte[] key = decodePrivateKey(privateKey);
        try {
            VonageClient client = VonageClient.builder()
                    .applicationId(id)
                    .privateKeyContents(key)
                    .build();
            return new VonagePhoneVerifier(client.getVerify2Client());
        } catch (RuntimeException exception) {
            // The cause is left out on purpose, so nothing about the key can reach the logs
            throw new IllegalStateException("VONAGE_VERIFY_PRIVATE_KEY does not match VONAGE_VERIFY_APPLICATION_ID."
                    + " Check both as explained in docs/setup.md");
        }
    }

    private static UUID parseApplicationId(String applicationId) {
        if (applicationId.isBlank()) {
            throw new IllegalStateException(
                    "VONAGE_VERIFY_APPLICATION_ID is not set. Add it to server/.env as explained in docs/setup.md");
        }
        try {
            return UUID.fromString(applicationId.strip());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "VONAGE_VERIFY_APPLICATION_ID is not a valid application ID. Check it as explained in docs/setup.md");
        }
    }

    private static byte[] decodePrivateKey(String privateKey) {
        if (privateKey.isBlank()) {
            throw new IllegalStateException(
                    "VONAGE_VERIFY_PRIVATE_KEY is not set. Add it to server/.env as explained in docs/setup.md");
        }
        try {
            return Base64.getDecoder().decode(privateKey.strip());
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "VONAGE_VERIFY_PRIVATE_KEY is not valid base64. Convert the key as explained in docs/setup.md");
        }
    }
}
