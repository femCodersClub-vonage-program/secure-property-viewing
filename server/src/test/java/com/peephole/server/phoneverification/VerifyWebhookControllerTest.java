package com.peephole.server.phoneverification;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.TestWebhookTokens;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.vonage.silent-auth.signature-secret=" + VerifyWebhookControllerTest.SECRET)
class VerifyWebhookControllerTest {

    static final String SECRET = "test-signature-secret";
    private static final String PATH = "/api/webhooks/verify/status";
    private static final String BODY =
            "{\"request_id\":\"c11236f4-00bf-4b89-84ba-88b25df97315\",\"status\":\"action_pending\"}";

    @Autowired
    private MockMvc mockMvc;

    // Vonage sends no CSRF token, so the request has none either
    @Test
    void acceptsACallbackSignedWithTheSecret() throws Exception {
        callback("Bearer " + TestWebhookTokens.signedWith(SECRET)).andExpect(status().isOk());
    }

    @Test
    void rejectsACallbackSignedWithAnotherSecret() throws Exception {
        expectSignatureInvalid(callback("Bearer " + TestWebhookTokens.signedWith("another-secret")));
    }

    @Test
    void rejectsACallbackWithoutASignature() throws Exception {
        expectSignatureInvalid(mockMvc.perform(
                post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY)));
    }

    private ResultActions callback(String authorization) throws Exception {
        return mockMvc.perform(post(PATH)
                .header(HttpHeaders.AUTHORIZATION, authorization)
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY));
    }

    private static void expectSignatureInvalid(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"))
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }
}
