package com.peephole.server.config;

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

@WebMvcTest
@Import(CorsConfigTest.SampleController.class)
class CorsConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void allowsTheLocalClient() throws Exception {
        mockMvc.perform(options("/api/sample")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
    }

    @Test
    void rejectsAnUnknownOrigin() throws Exception {
        mockMvc.perform(options("/api/sample")
                        .header("Origin", "https://unknown.example")
                        .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
    }

    @RestController
    static class SampleController {

        @GetMapping("/api/sample")
        String sample() {
            return "ok";
        }
    }
}
