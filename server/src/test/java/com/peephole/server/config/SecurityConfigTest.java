package com.peephole.server.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void leavesPublicEndpointsOpen() throws Exception {
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void doesNotRequireASessionOutsideTheAgencyPaths() throws Exception {
        mockMvc.perform(get("/api/properties")).andExpect(status().isOk());
    }

    @Test
    void doesNotRequireASessionForPropertyDetails() throws Exception {
        mockMvc.perform(get("/api/properties/999999")).andExpect(status().isNotFound());
    }

    // Without a CSRF token, the request still reaches the webhook, which rejects it for its signature instead
    @Test
    void doesNotRequireACsrfTokenForWebhooks() throws Exception {
        mockMvc.perform(post("/api/webhooks/messages/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"));
    }

    @Test
    void requiresACsrfTokenForPublicPostRequests() throws Exception {
        mockMvc.perform(post("/api/phone-verifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }
}
