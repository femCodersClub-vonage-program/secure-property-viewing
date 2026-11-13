package com.peephole.server.phoneverification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class PhoneVerificationControllerTest {

    private static final String PATH = "/api/phone-verifications";
    private static final String PHONE = "+34611222333";
    private static final String CODE = "482931";

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

    @BeforeEach
    void stubVonage() {
        when(phoneVerifier.start(any())).thenReturn("request-id");
    }

    @Test
    void startsAVerificationAndSavesItsIdInTheSession() throws Exception {
        MockHttpSession session = new MockHttpSession();

        start(session, PHONE)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.resendAvailableAt").isNotEmpty());

        long id = (Long) session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE);
        String storedHash =
                jdbcTemplate.queryForObject("SELECT phone_hash FROM phone_verification WHERE id = ?", String.class, id);
        assertThat(storedHash).isNotEqualTo(PHONE).doesNotContain("611222333");
        verify(phoneVerifier).start(PHONE);
    }

    @Test
    void verifiesTheRightCode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);
        when(phoneVerifier.check("request-id", CODE)).thenReturn(CodeCheckResult.MATCHED);

        check(session, id, CODE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("VERIFIED"));
    }

    @Test
    void rejectsACheckFromAnotherBrowser() throws Exception {
        long id = startedId(new MockHttpSession());

        expectProblem(check(new MockHttpSession(), id, CODE), 404, "VERIFICATION_NOT_FOUND");
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void rejectsAWrongCode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);
        when(phoneVerifier.check("request-id", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        expectProblem(check(session, id, "000000"), 422, "VERIFICATION_CODE_INVALID");
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void countsEveryWrongCodeEvenThoughTheRequestFails() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);
        when(phoneVerifier.check("request-id", "000000")).thenReturn(CodeCheckResult.WRONG_CODE);

        try {
            expectProblem(check(session, id, "000000"), 422, "VERIFICATION_CODE_INVALID");
            expectProblem(check(session, id, "000000"), 422, "VERIFICATION_CODE_INVALID");
            expectProblem(check(session, id, "000000"), 429, "VERIFICATION_TOO_MANY_ATTEMPTS");

            Integer attempts = jdbcTemplate.queryForObject(
                    "SELECT check_attempts FROM phone_verification WHERE id = ?", Integer.class, id);
            assertThat(attempts).isEqualTo(3);
        } finally {
            // Without the test transaction, nothing is rolled back on its own
            jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", id);
        }
    }

    @Test
    void rejectsANewCodeBeforeThirtySeconds() throws Exception {
        MockHttpSession session = new MockHttpSession();
        startedId(session);

        expectProblem(start(session, PHONE), 429, "VERIFICATION_RESEND_TOO_SOON");
    }

    @Test
    void rejectsASixthVerificationForTheSamePhoneInAnHour() throws Exception {
        for (int i = 0; i < 5; i++) {
            startedId(new MockHttpSession());
        }

        expectProblem(start(new MockHttpSession(), PHONE), 429, "VERIFICATION_LIMIT_REACHED");
    }

    @Test
    void rejectsAnInvalidPhoneAndPurpose() throws Exception {
        mockMvc.perform(post(PATH)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"600000000\",\"purpose\":\"PIZZA\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.phone").isNotEmpty())
                .andExpect(jsonPath("$.errors.purpose").isNotEmpty());
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void rejectsAnEmptyCode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);

        check(session, id, "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.code").isNotEmpty());
    }

    @Test
    void rejectsACodeThatIsNotSixDigits() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);

        check(session, id, "12345")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.code").isNotEmpty());
        verify(phoneVerifier, never()).check(any(), any());
    }

    @Test
    void rejectsAStartWithoutACsrfToken() throws Exception {
        expectProblem(
                mockMvc.perform(
                        post(PATH).contentType(MediaType.APPLICATION_JSON).content(startBody(PHONE))),
                403,
                "CSRF_TOKEN_INVALID");
        verify(phoneVerifier, never()).start(any());
    }

    @Test
    void neverLogsThePhoneOrTheCode(CapturedOutput output) throws Exception {
        MockHttpSession session = new MockHttpSession();
        long id = startedId(session);
        when(phoneVerifier.check(eq("request-id"), any())).thenReturn(CodeCheckResult.WRONG_CODE);

        check(session, id, CODE);

        assertThat(output).doesNotContain("611222333").doesNotContain(CODE);
    }

    private long startedId(MockHttpSession session) throws Exception {
        String body = start(session, PHONE)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return ((Number) JsonPath.read(body, "$.id")).longValue();
    }

    private ResultActions start(MockHttpSession session, String phone) throws Exception {
        return mockMvc.perform(post(PATH)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(startBody(phone)));
    }

    private ResultActions check(MockHttpSession session, long id, String code) throws Exception {
        return mockMvc.perform(post(PATH + "/" + id + "/check")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"" + code + "\"}"));
    }

    private void expectProblem(ResultActions result, int status, String code) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").isNotEmpty())
                .andExpect(jsonPath("$.code").value(code));
    }

    private static String startBody(String phone) {
        return "{\"phone\":\"" + phone + "\",\"purpose\":\"VISIT\"}";
    }
}
