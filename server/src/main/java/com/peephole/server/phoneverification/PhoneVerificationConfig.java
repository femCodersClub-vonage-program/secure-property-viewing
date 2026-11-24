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

    // With Silent Authentication on, the server does not start without the page the silent check comes back to
    @Bean
    SilentAuthSettings silentAuthSettings(
            @Value("${app.silent-auth.enabled}") boolean enabled,
            @Value("${app.silent-auth.virtual-operator}") boolean virtualOperator,
            @Value("${app.silent-auth.redirect-url}") String redirectUrl) {
        if (enabled && redirectUrl.isBlank()) {
            throw new IllegalStateException(
                    "SILENT_AUTH_REDIRECT_URL is not set. Add it to server/.env as explained in docs/setup.md");
        }
        return new SilentAuthSettings(enabled, enabled && virtualOperator, redirectUrl.strip());
    }
}
