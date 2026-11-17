package com.peephole.server;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.test.context.DynamicPropertyRegistrar;

// Spring keeps every test context open until the run ends, each with its own pool. With Hikari's default of 10
// connections, a dozen contexts reach PostgreSQL's limit of 100, so tests use a smaller pool
@Configuration
class TestDatabaseConfig {

    @Bean
    DynamicPropertyRegistrar smallConnectionPool() {
        return registry -> registry.add("spring.datasource.hikari.maximum-pool-size", () -> "4");
    }
}
