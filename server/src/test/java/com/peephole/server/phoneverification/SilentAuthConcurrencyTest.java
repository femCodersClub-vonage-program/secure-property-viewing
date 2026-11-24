package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SmsStepResult;
import com.peephole.server.vonage.TestWebhookTokens;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// The browser and the status webhook reaching the same verification at once. Each request commits on its own, as in
// production, so this class has no test transaction and deletes its row at the end
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(
        properties = {
            "app.silent-auth.enabled=true",
            "app.silent-auth.virtual-operator=true",
            "app.silent-auth.redirect-url=http://localhost:5173/verification/return",
            "app.vonage.silent-auth.signature-secret=" + SilentAuthConcurrencyTest.SECRET
        })
class SilentAuthConcurrencyTest {

    static final String SECRET = "test-signature-secret";
    // Not used by any other test, so the row is easy to tell apart
    private static final String REQUEST_ID = "5e1d0c4a-7b3f-4c2e-9a61-0d8f2b7c4e19";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    // The same fixed clock as the other phone verification tests, so the verification below has not expired
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    // The row lock makes the webhook wait for the browser. Once it gets the row, the verification is already on SMS,
    // so the webhook changes nothing and Verify is asked to move on only once
    @Test
    void movesOnToSmsOnceWhenTheBrowserAndTheWebhookArriveTogether() throws Exception {
        long id = insertSilentVerification();
        CountDownLatch browserHoldsTheLock = new CountDownLatch(1);
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenAnswer(invocation -> {
            browserHoldsTheLock.countDown();
            // Keeps the lock long enough for the webhook to arrive and wait for it
            Thread.sleep(500);
            return SmsStepResult.STARTED;
        });
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(PhoneVerificationController.SESSION_ATTRIBUTE, id);
        ExecutorService threads = Executors.newFixedThreadPool(2);

        try {
            Future<Integer> browser =
                    threads.submit(() -> mockMvc.perform(post("/api/phone-verifications/" + id + "/sms-fallback")
                                    .session(session)
                                    .with(csrf()))
                            .andReturn()
                            .getResponse()
                            .getStatus());
            assertThat(browserHoldsTheLock.await(10, TimeUnit.SECONDS)).isTrue();
            Future<Integer> webhook = threads.submit(() -> mockMvc.perform(post("/api/webhooks/verify/status")
                            .header(HttpHeaders.AUTHORIZATION, "Bearer " + TestWebhookTokens.signedWith(SECRET))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(userRejectedEvent()))
                    .andReturn()
                    .getResponse()
                    .getStatus());

            assertThat(browser.get(10, TimeUnit.SECONDS)).isEqualTo(200);
            assertThat(webhook.get(10, TimeUnit.SECONDS)).isEqualTo(200);
            verify(phoneVerifier, times(1)).moveToSms(REQUEST_ID);
            Map<String, Object> stored =
                    jdbcTemplate.queryForMap("SELECT channel, status FROM phone_verification WHERE id = ?", id);
            assertThat(stored).containsEntry("channel", "SMS").containsEntry("status", "PENDING");
        } finally {
            threads.shutdownNow();
            // Without the test transaction, nothing is rolled back on its own
            jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", id);
        }
    }

    // A real number on the silent step, one minute old for the fixed clock
    private long insertSilentVerification() {
        return jdbcTemplate.queryForObject(
                """
            INSERT INTO phone_verification
                (purpose, phone_hash, vonage_request_id, status, channel, sms_fallback, created_at)
            VALUES ('VISIT', 'concurrency-test-hash', ?, 'PENDING', 'SILENT_AUTH', true, ?)
            RETURNING id
            """, Long.class, REQUEST_ID, Timestamp.from(Instant.parse("2099-01-01T11:59:00Z")));
    }

    // The shape of an event callback about the silent step, as in Vonage's Verify documentation
    private static String userRejectedEvent() {
        return "{\"request_id\":\"" + REQUEST_ID + "\",\"triggered_at\":\"2099-01-01T11:59:30.000Z\","
                + "\"type\":\"event\",\"channel\":\"silent_auth\",\"status\":\"user_rejected\"}";
    }
}
