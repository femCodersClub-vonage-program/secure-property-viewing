package com.peephole.server.agency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import java.util.Set;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class AgencySessionControllerTest {

    private static final String SESSION_PATH = "/api/agency/session";
    private static final String EMAIL = "marta.session-test@peephole.example";
    private static final String PASSWORD = "Session-test-password-1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void createAgencyUser() {
        Long agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Session Test Agency",
                "agency.session-test@peephole.example",
                "+34600000000");
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Marta Test",
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                "AGENT");
    }

    @Test
    void signsInWithValidCredentialsAndChangesTheSessionId(CapturedOutput output) throws Exception {
        MockHttpSession session = new MockHttpSession();
        String sessionIdBeforeSignIn = session.getId();

        signIn(session, EMAIL, PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Marta Test"))
                .andExpect(jsonPath("$.role").value("AGENT"));

        assertThat(session.getId()).isNotEqualTo(sessionIdBeforeSignIn);
        assertThat(output).doesNotContain(EMAIL).doesNotContain(PASSWORD);
    }

    @Test
    void returnsTheSignedInUser() throws Exception {
        MockHttpSession session = signedInSession();

        mockMvc.perform(get(SESSION_PATH).session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Marta Test"))
                .andExpect(jsonPath("$.role").value("AGENT"));
    }

    @Test
    void rejectsAWrongPassword(CapturedOutput output) throws Exception {
        expectInvalidCredentials(signIn(new MockHttpSession(), EMAIL, "Wrong-password-1"));

        assertThat(output).doesNotContain(EMAIL).doesNotContain("Wrong-password-1");
    }

    @Test
    void rejectsAnUnknownEmail(CapturedOutput output) throws Exception {
        expectInvalidCredentials(signIn(new MockHttpSession(), "nobody@peephole.example", PASSWORD));

        assertThat(output).doesNotContain("nobody@peephole.example").doesNotContain(PASSWORD);
    }

    @Test
    void returnsTheSameResponseForAWrongPasswordAndAnUnknownEmail() throws Exception {
        String wrongPassword = signIn(new MockHttpSession(), EMAIL, "Wrong-password-1")
                .andReturn()
                .getResponse()
                .getContentAsString();
        String unknownEmail = signIn(new MockHttpSession(), "nobody@peephole.example", PASSWORD)
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(unknownEmail).isEqualTo(wrongPassword);
    }

    @Test
    void writesSecurityErrorsWithTheSameShapeAsControllerErrors() throws Exception {
        String fromController = signIn(new MockHttpSession(), EMAIL, "Wrong-password-1")
                .andReturn()
                .getResponse()
                .getContentAsString();
        String fromEntryPoint =
                mockMvc.perform(get(SESSION_PATH)).andReturn().getResponse().getContentAsString();
        String fromAccessDeniedHandler =
                mockMvc.perform(post(SESSION_PATH)).andReturn().getResponse().getContentAsString();

        assertThat(keys(fromEntryPoint)).isEqualTo(keys(fromController));
        assertThat(keys(fromAccessDeniedHandler)).isEqualTo(keys(fromController));
    }

    @Test
    void rejectsAnInvalidSignInRequest() throws Exception {
        mockMvc.perform(post(SESSION_PATH)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.email").isNotEmpty())
                .andExpect(jsonPath("$.errors.password").isNotEmpty());
    }

    @Test
    void signsOutAndInvalidatesTheSession() throws Exception {
        MockHttpSession session = signedInSession();

        mockMvc.perform(delete(SESSION_PATH).session(session).with(csrf())).andExpect(status().isNoContent());

        assertThat(session.isInvalid()).isTrue();
        mockMvc.perform(get(SESSION_PATH).session(session)).andExpect(status().isUnauthorized());
    }

    @Test
    void requiresASessionForAgencyEndpoints() throws Exception {
        expectProblem(mockMvc.perform(get(SESSION_PATH)), 401, "Unauthorized", "AUTHENTICATION_REQUIRED");
        expectProblem(mockMvc.perform(get("/api/agency/summary")), 401, "Unauthorized", "AUTHENTICATION_REQUIRED");
        expectProblem(
                mockMvc.perform(delete(SESSION_PATH).with(csrf())), 401, "Unauthorized", "AUTHENTICATION_REQUIRED");
    }

    @Test
    void rejectsASignInWithoutACsrfToken() throws Exception {
        expectProblem(
                mockMvc.perform(post(SESSION_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(EMAIL, PASSWORD))),
                403,
                "Forbidden",
                "CSRF_TOKEN_INVALID");
    }

    @Test
    void rejectsASignInWithAnInvalidCsrfToken() throws Exception {
        expectProblem(
                mockMvc.perform(post(SESSION_PATH)
                        .with(csrf().useInvalidToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(EMAIL, PASSWORD))),
                403,
                "Forbidden",
                "CSRF_TOKEN_INVALID");
    }

    @Test
    void rejectsASignOutWithoutACsrfToken() throws Exception {
        MockHttpSession session = signedInSession();

        expectProblem(mockMvc.perform(delete(SESSION_PATH).session(session)), 403, "Forbidden", "CSRF_TOKEN_INVALID");
        assertThat(session.isInvalid()).isFalse();
    }

    private MockHttpSession signedInSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        signIn(session, EMAIL, PASSWORD).andExpect(status().isOk());
        return session;
    }

    private ResultActions signIn(MockHttpSession session, String email, String password) throws Exception {
        return mockMvc.perform(post(SESSION_PATH)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(credentials(email, password)));
    }

    private void expectInvalidCredentials(ResultActions result) throws Exception {
        expectProblem(result, 401, "Unauthorized", "INVALID_CREDENTIALS");
    }

    private void expectProblem(ResultActions result, int status, String title, String code) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.detail").isNotEmpty())
                .andExpect(jsonPath("$.code").value(code));
    }

    private static Set<String> keys(String json) {
        Map<String, Object> body = JsonPath.read(json, "$");
        return body.keySet();
    }

    private static String credentials(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }
}
