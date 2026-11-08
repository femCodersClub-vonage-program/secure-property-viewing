package com.peephole.server.health;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class HealthController {

    private static final Logger LOGGER = LoggerFactory.getLogger(HealthController.class);

    private final JdbcTemplate jdbcTemplate;

    HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/api/health")
    HealthResponse health() {
        try {
            Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return new HealthResponse(Integer.valueOf(1).equals(result) ? "UP" : "DOWN");
        } catch (DataAccessException exception) {
            LOGGER.warn("Database health check failed", exception);
            return new HealthResponse("DOWN");
        }
    }

    record HealthResponse(String database) {}
}
