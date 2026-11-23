package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.PhoneVerifierException;
import com.peephole.server.vonage.SmsStepResult;
import com.peephole.server.vonage.TestWebhookTokens;
import com.peephole.server.vonage.VerifyWebhookTokens;
import jakarta.persistence.EntityManager;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.vonage.silent-auth.signature-secret=" + VerifyWebhookControllerTest.SECRET)
class VerifyWebhookControllerTest {

    static final String SECRET = "test-signature-secret";
    private static final String PATH = "/api/webhooks/verify/status";
    private static final String REQUEST_ID = "c11236f4-00bf-4b89-84ba-88b25df97315";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    // Vonage sends no CSRF token, so the requests here have none either

    @Test
    void acceptsACallbackSignedWithTheSecret() throws Exception {
        callback("Bearer " + TestWebhookTokens.signedWith(SECRET), silentEvent("action_pending"))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsACallbackSignedWithAnotherSecret() throws Exception {
        expectSignatureInvalid(
                callback("Bearer " + TestWebhookTokens.signedWith("another-secret"), silentEvent("action_pending")));
    }

    @Test
    void rejectsACallbackWithoutASignature() throws Exception {
        expectSignatureInvalid(mockMvc.perform(
                post(PATH).contentType(MediaType.APPLICATION_JSON).content(silentEvent("action_pending"))));
    }

    @Test
    void movesASilentCheckOnToSmsWhenTheOperatorRejectsIt() throws Exception {
        long id = insertSilentVerification();
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        callback("Bearer " + TestWebhookTokens.signedWith(SECRET), silentEvent("user_rejected"))
                .andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("channel", "SMS").containsEntry("status", "PENDING");
    }

    @Test
    void doesNotChangeAVerificationWhenTheSignatureIsWrong() throws Exception {
        long id = insertSilentVerification();

        expectSignatureInvalid(
                callback("Bearer " + TestWebhookTokens.signedWith("another-secret"), silentEvent("user_rejected")));

        assertThat(stored(id)).containsEntry("channel", "SILENT_AUTH").containsEntry("status", "PENDING");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void appliesABodyThatMatchesItsHash() throws Exception {
        long id = insertSilentVerification();
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);
        String body = silentEvent("user_rejected");

        callback("Bearer " + VerifyWebhookTokens.signedWithHashOf(SECRET, body), body)
                .andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("channel", "SMS");
    }

    // A token that leaked cannot carry another body
    @Test
    void rejectsABodyThatDoesNotMatchItsHash() throws Exception {
        long id = insertSilentVerification();

        expectSignatureInvalid(callback(
                "Bearer " + VerifyWebhookTokens.signedWithHashOf(SECRET, silentEvent("action_pending")),
                silentEvent("user_rejected")));

        assertThat(stored(id)).containsEntry("channel", "SILENT_AUTH").containsEntry("status", "PENDING");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void acceptsABodyItCannotReadWithoutChangingAnything() throws Exception {
        long id = insertSilentVerification();

        callback("Bearer " + TestWebhookTokens.signedWith(SECRET), "not json").andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("channel", "SILENT_AUTH").containsEntry("status", "PENDING");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    // An error answers 500 and changes nothing, so Vonage sends the callback again
    @Test
    void answersAnErrorWithoutChangingAnythingWhenVonageFailsToMoveOnToSms() throws Exception {
        long id = insertSilentVerification();
        when(phoneVerifier.moveToSms(REQUEST_ID))
                .thenThrow(new PhoneVerifierException("Vonage answered 500 when moving on to SMS"));

        callback("Bearer " + TestWebhookTokens.signedWith(SECRET), silentEvent("user_rejected"))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));

        assertThat(stored(id)).containsEntry("channel", "SILENT_AUTH").containsEntry("status", "PENDING");
    }

    private ResultActions callback(String authorization, String body) throws Exception {
        return mockMvc.perform(post(PATH)
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    // The shape of an event callback about the silent step, as in Vonage's Verify documentation
    private static String silentEvent(String status) {
        return "{\"request_id\":\"" + REQUEST_ID + "\",\"triggered_at\":\"2026-11-23T10:00:00.000Z\","
                + "\"type\":\"event\",\"channel\":\"silent_auth\",\"status\":\"" + status + "\"}";
    }

    private static void expectSignatureInvalid(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"))
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    private long insertSilentVerification() {
        return jdbcTemplate.queryForObject("""
            INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, channel, sms_fallback)
            VALUES ('VISIT', 'webhook-test-hash', ?, 'PENDING', 'SILENT_AUTH', true)
            RETURNING id
            """, Long.class, REQUEST_ID);
    }

    // The test runs in one transaction, so Hibernate has not written the changes yet: flushing them lets the query
    // read what the endpoint left in the database
    private Map<String, Object> stored(long id) {
        entityManager.flush();
        return jdbcTemplate.queryForMap("SELECT channel, status FROM phone_verification WHERE id = ?", id);
    }
}
