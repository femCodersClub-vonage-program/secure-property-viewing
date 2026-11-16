package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.CodeCheckResult;
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

    @Test
    void neverLosesAVerifiedCodeWhenTwoChecksArriveAtTheSameTime() throws Exception {
        when(phoneVerifier.start(PHONE)).thenReturn("request-id");
        long id = service.start(PHONE, PhoneVerificationPurpose.VISIT, null).id();
        // A slow Vonage, so without the row lock both checks would read the row before either one saves it
        when(phoneVerifier.check("request-id", "111111")).thenAnswer(invocation -> {
            Thread.sleep(200);
            return CodeCheckResult.MATCHED;
        });
        when(phoneVerifier.check("request-id", "000000")).thenAnswer(invocation -> {
            Thread.sleep(200);
            return CodeCheckResult.WRONG_CODE;
        });

        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch startTogether = new CountDownLatch(1);
        List<Future<?>> results = new ArrayList<>();
        for (String code : List.of("111111", "000000")) {
            results.add(executor.submit(() -> {
                startTogether.await();
                try {
                    service.check(id, code);
                } catch (VerificationCodeInvalidException exception) {
                    // Expected for the wrong code, when it runs first
                }
                return null;
            }));
        }
        startTogether.countDown();
        for (Future<?> result : results) {
            result.get(30, TimeUnit.SECONDS);
        }
        executor.shutdown();

        String status =
                jdbcTemplate.queryForObject("SELECT status FROM phone_verification WHERE id = ?", String.class, id);
        assertThat(status).isEqualTo("VERIFIED");
    }
}
