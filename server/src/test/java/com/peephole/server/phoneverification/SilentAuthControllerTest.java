package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SilentAuthStart;
import com.peephole.server.vonage.SilentAuthUnavailableException;
import com.peephole.server.vonage.SmsStepResult;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

// The phone verification endpoints with Silent Authentication on and +990 numbers accepted, as while testing
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(
        properties = {
            "app.silent-auth.enabled=true",
            "app.silent-auth.virtual-operator=true",
            "app.silent-auth.redirect-url=" + SilentAuthControllerTest.REDIRECT_URL,
            "app.vonage.silent-auth.signature-secret=test-signature-secret"
        })
class SilentAuthControllerTest {

    static final String REDIRECT_URL = "http://localhost:5173/verification/return";
    private static final String PATH = "/api/phone-verifications";
    private static final String PHONE = "+34611222333";
    private static final String VIRTUAL_OPERATOR_PHONE = "+990123400";
    private static final String REQUEST_ID = "c11236f4-00bf-4b89-84ba-88b25df97315";
    private static final String SILENT_CODE = "si9sfG";
    private static final String CHECK_URL =
            "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    // Far in the future, so verifications made by hand in the local database never count towards the hourly limits
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    @Test
    void returnsTheCheckUrlWhenTheSilentCheckStarts() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-id", Optional.of(CHECK_URL)));
        MockHttpSession session = new MockHttpSession();

        start(session, PHONE, true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.checkUrl").value(CHECK_URL));

        assertThat(stored(session)).containsEntry("channel", "SILENT_AUTH").containsEntry("sms_fallback", true);
    }

    // Without a check URL the field is left out, so the answer has only id, status and resendAvailableAt
    @Test
    void goesStraightToSmsWhenVonageGivesNoCheckUrl() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-id", Optional.empty()));
        MockHttpSession session = new MockHttpSession();

        start(session, PHONE, true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.checkUrl").doesNotExist())
                .andExpect(jsonPath("$.length()").value(3));

        assertThat(stored(session)).containsEntry("channel", "SMS");
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void startsAnSmsOnlyVerificationWhenTheOperatorDoesNotSupportTheSilentCheck() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenThrow(new SilentAuthUnavailableException());
        when(phoneVerifier.start(PHONE)).thenReturn("request-id");
        MockHttpSession session = new MockHttpSession();

        start(session, PHONE, true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.checkUrl").doesNotExist());

        assertThat(stored(session)).containsEntry("channel", "SMS");
    }

    @Test
    void startsAnSmsOnlyVerificationWithoutTheSilentAuthField() throws Exception {
        when(phoneVerifier.start(PHONE)).thenReturn("request-id");

        start(new MockHttpSession(), PHONE, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.checkUrl").doesNotExist());

        verify(phoneVerifier, never()).startWithSilentAuth(any(), any(), anyBoolean());
    }

    @Test
    void startsAVirtualOperatorNumberWithoutAnSmsStep() throws Exception {
        when(phoneVerifier.startWithSilentAuth(VIRTUAL_OPERATOR_PHONE, REDIRECT_URL, false))
                .thenReturn(new SilentAuthStart("request-id", Optional.of(CHECK_URL)));
        MockHttpSession session = new MockHttpSession();

        start(session, VIRTUAL_OPERATOR_PHONE, true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.checkUrl").value(CHECK_URL));

        assertThat(stored(session)).containsEntry("channel", "SILENT_AUTH").containsEntry("sms_fallback", false);
    }

    @Test
    void rejectsANewCodeWhileTheSilentCheckIsPending() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-id", Optional.of(CHECK_URL)));
        MockHttpSession session = new MockHttpSession();
        start(session, PHONE, true).andExpect(status().isCreated());
        // One minute later, so only the pending silent check stops the new code
        jdbcTemplate.update(
                "UPDATE phone_verification SET created_at = created_at - INTERVAL '1 minute' WHERE id = ?",
                session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE));

        start(session, PHONE, null)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("VERIFICATION_RESEND_TOO_SOON"));
        verify(phoneVerifier, never()).cancel(any());
    }

    // A start that tries the silent check counts toward the 5 per hour like any other
    @Test
    void rejectsASixthSilentStartForTheSamePhoneInAnHour() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-id", Optional.of(CHECK_URL)));
        for (int i = 0; i < 5; i++) {
            start(new MockHttpSession(), PHONE, true).andExpect(status().isCreated());
        }

        start(new MockHttpSession(), PHONE, true)
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("VERIFICATION_LIMIT_REACHED"));
    }

    // Checking the code of the silent check

    @Test
    void verifiesWithTheCodeOfTheSilentCheck() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.MATCHED);

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idOf(session)))
                .andExpect(jsonPath("$.status").value("VERIFIED"));

        assertThat(stored(session)).containsEntry("channel", "SILENT_AUTH");
    }

    @Test
    void rejectsARequestIdThatIsNotTheStoredOne() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);

        expectNotFound(silentCheck(session, "a5c3f6a1-0000-4000-8000-000000000000", SILENT_CODE));
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void rejectsTheSilentCheckFromAnotherBrowser() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        MockHttpSession otherBrowser = new MockHttpSession();

        expectNotFound(mockMvc.perform(post(PATH + "/" + idOf(session) + "/silent-check")
                .session(otherBrowser)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(silentCheckBody(REQUEST_ID, SILENT_CODE))));
    }

    @Test
    void rejectsACodeThatIsNotFourToTenLettersAndDigits() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);

        silentCheck(session, REQUEST_ID, "si9-")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.code").isNotEmpty());
    }

    @Test
    void answersUnavailableWhenTheVerificationIsOnSms() throws Exception {
        when(phoneVerifier.start(PHONE)).thenReturn(REQUEST_ID);
        MockHttpSession session = new MockHttpSession();
        start(session, PHONE, null).andExpect(status().isCreated());

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERIFICATION_SILENT_CHECK_UNAVAILABLE"));
    }

    @Test
    void movesOnToSmsWhenTheSilentCodeIsRejected() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.WRONG_CODE);
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VERIFICATION_CODE_INVALID"));

        assertThat(stored(session)).containsEntry("channel", "SMS").containsEntry("status", "PENDING");
    }

    // Verify has ended the request of a real number, so there is no SMS step left to move on to
    @Test
    void expiresARealNumberWhenVonageEndsTheSilentCheck() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.ENDED);

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.code").value("VERIFICATION_EXPIRED"));

        assertThat(stored(session)).containsEntry("status", "EXPIRED");
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void failsAVirtualOperatorVerificationWhenTheSilentCodeIsRejected() throws Exception {
        MockHttpSession session = startSilentCheck(VIRTUAL_OPERATOR_PHONE, false);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.WRONG_CODE);

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));
        verify(phoneVerifier, never()).moveToSms(any());
    }

    // The silent code has a single attempt, so whatever Vonage answers, a +990 number has nothing left to try
    @Test
    void failsAVirtualOperatorVerificationWhenVonageEndsTheSilentCheck() throws Exception {
        MockHttpSession session = startSilentCheck(VIRTUAL_OPERATOR_PHONE, false);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.ENDED);

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));
    }

    // The webhook can arrive before the browser comes back. Then the browser gets the status the webhook left, and
    // Verify is never called again

    @Test
    void answersTheStatusTheWebhookAlreadyLeftWithoutCallingVonage() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        storeStatus(session, "FAILED");

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idOf(session)))
                .andExpect(jsonPath("$.status").value("FAILED"));

        verify(phoneVerifier, never()).check(any(), any());
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void answersVerifiedWithoutCallingVonage() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        storeStatus(session, "VERIFIED");

        silentCheck(session, REQUEST_ID, SILENT_CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("VERIFIED"));

        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void fallsBackToTheStatusTheWebhookAlreadyLeftWithoutCallingVonage() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        storeStatus(session, "FAILED");

        smsFallback(session)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));

        verify(phoneVerifier, never()).moveToSms(any());
    }

    // Moving on to the SMS code

    @Test
    void movesOnToSmsAndStaysPending() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        smsFallback(session)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idOf(session)))
                .andExpect(jsonPath("$.status").value("PENDING"));

        assertThat(stored(session)).containsEntry("channel", "SMS");
    }

    @Test
    void failsAVirtualOperatorVerificationInsteadOfMovingOn() throws Exception {
        MockHttpSession session = startSilentCheck(VIRTUAL_OPERATOR_PHONE, false);

        smsFallback(session)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("FAILED"));
        verify(phoneVerifier, never()).moveToSms(any());
    }

    @Test
    void answersUnavailableToASecondFallback() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);
        smsFallback(session).andExpect(status().isOk());

        smsFallback(session)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("VERIFICATION_SILENT_CHECK_UNAVAILABLE"));
    }

    @Test
    void rejectsAFallbackFromAnotherBrowser() throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);

        expectNotFound(mockMvc.perform(post(PATH + "/" + idOf(session) + "/sms-fallback")
                .session(new MockHttpSession())
                .with(csrf())));
        verify(phoneVerifier, never()).moveToSms(any());
    }

    // Logs: neither phone numbers nor codes, as the acceptance criteria ask

    @Test
    void neverLogsTheVirtualOperatorNumberOrTheSilentCode(CapturedOutput output) throws Exception {
        MockHttpSession session = startSilentCheck(VIRTUAL_OPERATOR_PHONE, false);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.MATCHED);

        silentCheck(session, REQUEST_ID, SILENT_CODE).andExpect(status().isOk());

        assertThat(output).doesNotContain("990123400").doesNotContain(SILENT_CODE);
    }

    @Test
    void neverLogsThePhoneOrTheSilentCodeWhenMovingOnToSms(CapturedOutput output) throws Exception {
        MockHttpSession session = startSilentCheck(PHONE, true);
        when(phoneVerifier.check(REQUEST_ID, SILENT_CODE)).thenReturn(CodeCheckResult.WRONG_CODE);
        when(phoneVerifier.moveToSms(REQUEST_ID)).thenReturn(SmsStepResult.STARTED);

        silentCheck(session, REQUEST_ID, SILENT_CODE).andExpect(status().isUnprocessableContent());

        assertThat(output).doesNotContain("611222333").doesNotContain(SILENT_CODE);
    }

    // The only log line Silent Authentication writes, when the operator does not support the silent check
    @Test
    void neverLogsThePhoneWhenTheOperatorDoesNotSupportTheSilentCheck(CapturedOutput output) throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenThrow(new SilentAuthUnavailableException());
        when(phoneVerifier.start(PHONE)).thenReturn("request-id");

        start(new MockHttpSession(), PHONE, true).andExpect(status().isCreated());

        assertThat(output).contains("does not support the silent check").doesNotContain("611222333");
    }

    private MockHttpSession startSilentCheck(String phone, boolean smsFallback) throws Exception {
        when(phoneVerifier.startWithSilentAuth(phone, REDIRECT_URL, smsFallback))
                .thenReturn(new SilentAuthStart(REQUEST_ID, Optional.of(CHECK_URL)));
        MockHttpSession session = new MockHttpSession();
        start(session, phone, true).andExpect(status().isCreated());
        return session;
    }

    private ResultActions silentCheck(MockHttpSession session, String requestId, String code) throws Exception {
        return mockMvc.perform(post(PATH + "/" + idOf(session) + "/silent-check")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(silentCheckBody(requestId, code)));
    }

    private ResultActions smsFallback(MockHttpSession session) throws Exception {
        return mockMvc.perform(post(PATH + "/" + idOf(session) + "/sms-fallback")
                .session(session)
                .with(csrf()));
    }

    private static String silentCheckBody(String requestId, String code) {
        return "{\"requestId\":\"" + requestId + "\",\"code\":\"" + code + "\"}";
    }

    private static void expectNotFound(ResultActions result) throws Exception {
        result.andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("VERIFICATION_NOT_FOUND"));
    }

    private static long idOf(MockHttpSession session) {
        return (Long) session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE);
    }

    private ResultActions start(MockHttpSession session, String phone, Boolean silentAuth) throws Exception {
        String silentAuthField = silentAuth == null ? "" : ",\"silentAuth\":" + silentAuth;
        return mockMvc.perform(post(PATH)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"" + phone + "\",\"purpose\":\"VISIT\"" + silentAuthField + "}"));
    }

    // The test runs in one transaction, so Hibernate has not written the changes yet: flushing them lets the query
    // read what the endpoint left in the database
    private Map<String, Object> stored(MockHttpSession session) {
        entityManager.flush();
        return jdbcTemplate.queryForMap(
                "SELECT channel, sms_fallback, status FROM phone_verification WHERE id = ?",
                session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE));
    }

    // Leaves the status as the webhook would. Hibernate still keeps the verification from the start, so it is
    // flushed before the update and cleared after it, and the next request reads the row as it is now
    private void storeStatus(MockHttpSession session, String status) {
        entityManager.flush();
        jdbcTemplate.update(
                "UPDATE phone_verification SET status = ?,"
                        + " verified_at = CASE WHEN ? = 'VERIFIED' THEN created_at END WHERE id = ?",
                status,
                status,
                idOf(session));
        entityManager.clear();
    }
}
