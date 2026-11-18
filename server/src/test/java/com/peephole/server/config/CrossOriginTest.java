package com.peephole.server.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

// The browser always calls /api from the client's own origin (ADR 0004), so no other origin gets CORS permission.
// SampleController is imported because Spring Boot does not scan classes nested in a test
@WebMvcTest(controllers = CrossOriginTest.SampleController.class)
@Import({SecurityConfig.class, CrossOriginTest.SampleController.class})
class CrossOriginTest {

    private static final String OTHER_ORIGIN = "https://unknown.example";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void givesNoPermissionInAPreflightFromAnotherOrigin() throws Exception {
        mockMvc.perform(options("/api/sample")
                        .header("Origin", OTHER_ORIGIN)
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void givesNoPermissionToReadAResponseFromAnotherOrigin() throws Exception {
        mockMvc.perform(get("/api/sample").header("Origin", OTHER_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @RestController
    static class SampleController {

        @GetMapping("/api/sample")
        String sample() {
            return "ok";
        }
    }
}
