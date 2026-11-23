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

import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SilentAuthStart;
import com.peephole.server.vonage.SilentAuthUnavailableException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
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
    private static final String CHECK_URL =
            "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect";

    @Autowired
    private MockMvc mockMvc;

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

    @Test
    void goesStraightToSmsWhenVonageGivesNoCheckUrl() throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, REDIRECT_URL, true))
                .thenReturn(new SilentAuthStart("request-id", Optional.empty()));
        MockHttpSession session = new MockHttpSession();

        start(session, PHONE, true)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.checkUrl").doesNotExist());

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

    private ResultActions start(MockHttpSession session, String phone, Boolean silentAuth) throws Exception {
        String silentAuthField = silentAuth == null ? "" : ",\"silentAuth\":" + silentAuth;
        return mockMvc.perform(post(PATH)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"phone\":\"" + phone + "\",\"purpose\":\"VISIT\"" + silentAuthField + "}"));
    }

    private Map<String, Object> stored(MockHttpSession session) {
        return jdbcTemplate.queryForMap(
                "SELECT channel, sms_fallback FROM phone_verification WHERE id = ?",
                session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE));
    }
}
