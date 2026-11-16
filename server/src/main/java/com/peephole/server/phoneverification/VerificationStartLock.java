package com.peephole.server.phoneverification;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Starts verifications one at a time, so requests sent at the same moment cannot all pass the hourly limits.
// The lock belongs to the current transaction and PostgreSQL releases it when the transaction ends
@Component
class VerificationStartLock {

    // Any number works, as long as every request uses the same one
    private static final long KEY = 54_001L;

    private final JdbcTemplate jdbcTemplate;

    VerificationStartLock(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    void acquire() {
        jdbcTemplate.execute("SELECT pg_advisory_xact_lock(" + KEY + ")");
    }
}
