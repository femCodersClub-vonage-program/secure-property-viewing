package com.peephole.server;

import java.nio.charset.StandardCharsets;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.DynamicPropertyRegistrar;

// Fake credentials for every Spring Boot test, so the tests never depend on server/.env and never use real ones.
// The Vonage SDK checks the key when it builds the client, so it has to be a real RSA key, generated here
@Configuration
class TestCredentialsConfig {

    private static final String PRIVATE_KEY = generatePrivateKey();

    @Bean
    DynamicPropertyRegistrar testCredentials() {
        return registry -> {
            registry.add("app.phone-hash-secret", () -> "test-phone-hash-secret");
            registry.add("app.vonage.verify.application-id", () -> "00000000-0000-4000-8000-000000000000");
            registry.add("app.vonage.verify.private-key", () -> PRIVATE_KEY);
        };
    }

    private static String generatePrivateKey() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            byte[] key = generator.generateKeyPair().getPrivate().getEncoded();
            String pem = "-----BEGIN PRIVATE KEY-----\n"
                    + Base64.getMimeEncoder(64, "\n".getBytes(StandardCharsets.US_ASCII))
                            .encodeToString(key)
                    + "\n-----END PRIVATE KEY-----\n";
            return Base64.getEncoder().encodeToString(pem.getBytes(StandardCharsets.US_ASCII));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("RSA is not available", exception);
        }
    }
}
