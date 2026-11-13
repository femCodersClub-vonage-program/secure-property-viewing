package com.peephole.server.phoneverification;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class PhoneVerificationConfig {
    @Bean
    PhoneHasher phoneHasher(@Value("${app.phone-hash-secret}") String secret) {
        if (secret.isBlank()) {
            throw new IllegalStateException(
                    "PHONE_HASH_SECRET is not set. Add it to server/.env as explained in docs/setup.md");
        }
        return new PhoneHasher(secret);
    }
}
