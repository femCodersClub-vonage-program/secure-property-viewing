package com.peephole.server.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * The API documentation stays off unless API_DOCS_ENABLED=true, as on Railway. The variable is set to false here,
 * not left out, because a developer's server/.env may set it to true; left out, it also defaults to false.
 */
@SpringBootTest(properties = "API_DOCS_ENABLED=false")
@AutoConfigureMockMvc
class OpenApiDocsDisabledTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void doesNotPublishTheDocumentation() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isNotFound());
    }
}
