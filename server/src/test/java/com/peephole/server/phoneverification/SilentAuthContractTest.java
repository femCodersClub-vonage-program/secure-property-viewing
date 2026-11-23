package com.peephole.server.phoneverification;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
import com.peephole.server.vonage.SilentAuthStart;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

// The JSON of the Silent Authentication endpoints against the examples in specs/silent-authentication.md, field by
// field, as the Testing section of CONTRIBUTING.md asks: the client of #107 is built on those same examples
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(
        properties = {
            "app.silent-auth.enabled=true",
            "app.silent-auth.virtual-operator=true",
            "app.silent-auth.redirect-url=http://localhost:5173/verification/return",
            "app.vonage.silent-auth.signature-secret=test-signature-secret"
        })
class SilentAuthContractTest {

    private static final String PATH = "/api/phone-verifications";
    private static final String PHONE = "+990123400";
    private static final String REAL_PHONE = "+34611222333";
    private static final String REQUEST_ID = "c11236f4-00bf-4b89-84ba-88b25df97315";
    private static final String CHECK_URL =
            "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    // { "id": 42, "status": "PENDING", "resendAvailableAt": "...", "checkUrl": "..." }
    @Test
    void theStartAnswersWithTheFourFieldsOfTheSpec() throws Exception {
        startSilentCheck(new MockHttpSession())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.resendAvailableAt").isString())
                .andExpect(jsonPath("$.checkUrl").value(CHECK_URL));
    }

    // { "id": 42, "status": "VERIFIED" }
    @Test
    void theSilentCheckAnswersWithTheTwoFieldsOfTheSpec() throws Exception {
        MockHttpSession session = new MockHttpSession();
        startSilentCheck(session);
        when(phoneVerifier.check(REQUEST_ID, "si9sfG")).thenReturn(CodeCheckResult.MATCHED);

        mockMvc.perform(post(PATH + "/" + idOf(session) + "/silent-check")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"requestId\":\"" + REQUEST_ID + "\",\"code\":\"si9sfG\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$.id").value(idOf(session)))
                .andExpect(jsonPath("$.status").value("VERIFIED"));
    }

    // { "id": 42, "status": "FAILED" } for a +990 number, which has no SMS step
    @Test
    void theFallbackAnswersWithTheTwoFieldsOfTheSpec() throws Exception {
        MockHttpSession session = new MockHttpSession();
        startSilentCheck(session);

        mockMvc.perform(post(PATH + "/" + idOf(session) + "/sms-fallback")
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$.id").value(idOf(session)))
                .andExpect(jsonPath("$.status").value("FAILED"));
    }

    // The 409 of the spec's table, as a ProblemDetail with its code. A real number that started without the silent
    // check is on SMS from the start, so there is nothing to move on from
    @Test
    void theUnavailableSilentCheckIsAProblemWithItsCode() throws Exception {
        when(phoneVerifier.start(REAL_PHONE)).thenReturn(REQUEST_ID);
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post(PATH)
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + REAL_PHONE + "\",\"purpose\":\"VISIT\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(post(PATH + "/" + idOf(session) + "/sms-fallback")
                        .session(session)
                        .with(csrf()))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("VERIFICATION_SILENT_CHECK_UNAVAILABLE"))
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    private ResultActions startSilentCheck(MockHttpSession session) throws Exception {
        when(phoneVerifier.startWithSilentAuth(PHONE, "http://localhost:5173/verification/return", false))
                .thenReturn(new SilentAuthStart(REQUEST_ID, Optional.of(CHECK_URL)));
        return mockMvc.perform(post(PATH)
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + PHONE + "\",\"purpose\":\"VISIT\",\"silentAuth\":true}"))
                .andExpect(status().isCreated());
    }

    private static long idOf(MockHttpSession session) {
        return (Long) session.getAttribute(PhoneVerificationController.SESSION_ATTRIBUTE);
    }
}
