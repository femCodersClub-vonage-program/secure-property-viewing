package com.peephole.server.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** The API documentation as developers see it locally, with API_DOCS_ENABLED=true. */
@SpringBootTest(properties = "API_DOCS_ENABLED=true")
@AutoConfigureMockMvc
class OpenApiDocsTest {

    private static final String SESSION = "$.paths['/api/agency/session']";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void documentsTheAgencySessionCookie() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("Peephole API"))
                .andExpect(jsonPath("$.components.securitySchemes.agencySession.type")
                        .value("apiKey"))
                .andExpect(jsonPath("$.components.securitySchemes.agencySession.in")
                        .value("cookie"))
                .andExpect(jsonPath("$.components.securitySchemes.agencySession.name")
                        .value("JSESSIONID"));
    }

    @Test
    void marksOnlyTheEndpointsThatNeedASession() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SESSION + ".post.security").doesNotExist())
                .andExpect(jsonPath(SESSION + ".get.security[0].agencySession").exists())
                .andExpect(
                        jsonPath(SESSION + ".delete.security[0].agencySession").exists())
                .andExpect(jsonPath("$.paths['/api/health'].get.security").doesNotExist());
    }

    @Test
    void documentsTheProblemDetailErrors() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(jsonPath(SESSION + ".post.responses['400']").exists())
                .andExpect(jsonPath(SESSION + ".post.responses['401']").exists())
                .andExpect(jsonPath(SESSION + ".post.responses['403']").exists())
                .andExpect(jsonPath(SESSION + ".get.responses['401']").exists())
                .andExpect(jsonPath(SESSION + ".delete.responses['204']").exists())
                .andExpect(jsonPath(SESSION + ".delete.responses['403']").exists())
                .andExpect(
                        jsonPath("$.components.schemas.Problem.properties.code").exists());
    }

    @Test
    void listsOnlyTheErrorsEachEndpointCanReturn() throws Exception {
        // With springdoc.override-with-generic-response=false, the handlers in RestExceptionHandler are not added to
        // every endpoint: /api/health takes no input, so it must not list a 400
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(
                        jsonPath("$.paths['/api/health'].get.responses['400']").doesNotExist());
    }

    @Test
    void servesSwaggerUi() throws Exception {
        mockMvc.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
    }
}
