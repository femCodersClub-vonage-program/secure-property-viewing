package com.peephole.server.common;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@WebMvcTest(
        controllers = {
            RestExceptionHandlerTest.ValidationController.class,
            RestExceptionHandlerTest.NotFoundController.class,
            RestExceptionHandlerTest.UnexpectedErrorController.class
        })
@Import({
    RestExceptionHandler.class,
    RestExceptionHandlerTest.ValidationController.class,
    RestExceptionHandlerTest.NotFoundController.class,
    RestExceptionHandlerTest.UnexpectedErrorController.class
})
class RestExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsProblemDetailWhenRequestValidationFails() throws Exception {
        mockMvc.perform(post("/api/test-validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.name").isNotEmpty());
    }

    @Test
    void returnsNotFoundWhenResourceDoesNotExist() throws Exception {
        mockMvc.perform(get("/api/test-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @RestController
    static class NotFoundController {

        @GetMapping("/api/test-not-found")
        void find() {
            throw new TestNotFoundException();
        }
    }

    static class TestNotFoundException extends BusinessException {

        TestNotFoundException() {
            super(HttpStatus.NOT_FOUND, "NOT_FOUND", "Resource not found.");
        }
    }

    @RestController
    static class ValidationController {

        @PostMapping("/api/test-validation")
        void create(@Valid @RequestBody SampleRequest request) {}
    }

    @Test
    void returnsGenericProblemDetailWhenUnexpectedErrorOccurs() throws Exception {
        mockMvc.perform(get("/api/test-unexpected-error"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.detail").value("An unexpected error occurred."))
                .andExpect(content()
                        .string(org.hamcrest.Matchers.not(
                                org.hamcrest.Matchers.containsString("Internal database details"))));
    }

    @RestController
    static class UnexpectedErrorController {

        @GetMapping("/api/test-unexpected-error")
        void fail() {
            throw new IllegalStateException("Internal database details");
        }
    }

    record SampleRequest(@NotBlank String name) {}
}
