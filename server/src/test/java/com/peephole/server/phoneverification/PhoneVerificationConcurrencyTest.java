package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.PhoneVerifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

// No test transaction on purpose: each request needs its own transaction, as in production
@SpringBootTest
class PhoneVerificationConcurrencyTest {

    private static final String PHONE = "+34622333444";
    private static final int REQUESTS = 8;

    @Autowired
    private PhoneVerificationService service;

    @Autowired
    private PhoneHasher phoneHasher;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    // Far in the future, so verifications made by hand in the local database never count towards the hourly limits
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    @AfterEach
    void deleteTheVerifications() {
        jdbcTemplate.update("DELETE FROM phone_verification WHERE phone_hash = ?", phoneHasher.hash(PHONE));
    }

    @Test
    void neverStartsMoreThanFiveVerificationsForAPhoneEvenAtTheSameTime() throws Exception {
        // A slow Vonage: without the lock, every request would count the rows before any of them saves its own
        when(phoneVerifier.start(PHONE)).thenAnswer(invocation -> {
            Thread.sleep(200);
            return "request-id";
        });

        ExecutorService executor = Executors.newFixedThreadPool(REQUESTS);
        CountDownLatch startTogether = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (int i = 0; i < REQUESTS; i++) {
            results.add(executor.submit(() -> {
                startTogether.await();
                try {
                    service.start(PHONE, PhoneVerificationPurpose.VISIT, null);
                    return true;
                } catch (VerificationLimitReachedException exception) {
                    return false;
                }
            }));
        }
        startTogether.countDown();

        int started = 0;
        for (Future<Boolean> result : results) {
            if (result.get(30, TimeUnit.SECONDS)) {
                started++;
            }
        }
        executor.shutdown();

        assertThat(started).isEqualTo(5);
    }
}
