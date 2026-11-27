package com.peephole.server.listing;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

// No test transaction on purpose: each review needs its own transaction, as in production
@SpringBootTest
class ListingRequestReviewConcurrencyTest {

    private static final String REASON = "The address is outside Barcelona";

    @Autowired
    private ListingRequestService service;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private long agencyId;
    private long agentId;
    private long verificationId;
    private long requestId;

    @BeforeEach
    void insertAPendingRequest() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, '+34600000001', true) RETURNING id",
                Long.class,
                "Concurrency Test Agency",
                "agency.concurrency-test@peephole.example");
        agentId = jdbcTemplate.queryForObject(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
                        + " RETURNING id",
                Long.class,
                agencyId,
                "Marta Ruiz",
                "marta.concurrency-test@peephole.example",
                "not-a-real-hash",
                "AGENT");
        verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, check_attempts)"
                        + " VALUES ('LISTING_REQUEST', ?, ?, 'VERIFIED', 1) RETURNING id",
                Long.class,
                "concurrency-test-hash",
                "concurrency-test-request");
        requestId = jdbcTemplate.queryForObject("""
            INSERT INTO listing_request (phone_verification_id, owner_full_name, owner_phone, title, description,
                property_type, operation, area, address, price_euros, bedrooms, size_m2, floor, status)
            VALUES (?, 'Ana Torres', '+34600000003', 'Apartment in Gràcia', 'A bright flat near the square',
                'APARTMENT', 'RENT', 'Gràcia', 'Carrer de Verdi 2', 1200, 3, 85, 2, 'PENDING')
            RETURNING id
            """, Long.class, verificationId);
    }

    @AfterEach
    void deleteTheTestData() {
        jdbcTemplate.update("DELETE FROM property WHERE listing_request_id = ?", requestId);
        jdbcTemplate.update("DELETE FROM listing_request WHERE id = ?", requestId);
        jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", verificationId);
        jdbcTemplate.update("DELETE FROM agency_user WHERE id = ?", agentId);
        jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
    }

    @Test
    void neverApprovesARequestThatAnotherAgentIsRejecting() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch rejecting = new CountDownLatch(1);
        TransactionTemplate transaction = new TransactionTemplate(transactionManager);

        // The rejection keeps its transaction open for a while, so without the lock the approval would still read
        // the request as pending
        Future<?> rejection = executor.submit(() -> transaction.executeWithoutResult(status -> {
            service.reject(requestId, REASON, agentId);
            rejecting.countDown();
            holdTheLock();
        }));
        Future<Boolean> approval = executor.submit(() -> {
            rejecting.await();
            try {
                service.approve(requestId, agencyId, agentId);
                return true;
            } catch (ListingRequestAlreadyReviewedException exception) {
                return false;
            }
        });

        rejection.get(30, TimeUnit.SECONDS);
        boolean approved = approval.get(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(approved).isFalse();
        Map<String, Object> request = jdbcTemplate.queryForMap(
                "SELECT status, rejection_reason FROM listing_request WHERE id = ?", requestId);
        assertThat(request).containsEntry("status", "REJECTED").containsEntry("rejection_reason", REASON);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM property WHERE listing_request_id = ?", Integer.class, requestId))
                .isZero();
    }

    private static void holdTheLock() {
        try {
            Thread.sleep(500);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
        }
    }
}
