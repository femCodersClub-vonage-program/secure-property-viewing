package com.peephole.server.common;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.Map;

/**
 * Only for the API documentation: the JSON shape of every error that RestExceptionHandler and the security handlers
 * write. They build it with ProblemDetail, which keeps code in a map of extra properties, so documenting ProblemDetail
 * directly would not show code as a field.
 */
@Schema(name = "Problem", description = "An error, as a ProblemDetail with a stable code the client can rely on")
public record ProblemResponse(
        @Schema(example = "about:blank") String type,
        @Schema(example = "Unauthorized") String title,
        @Schema(example = "401") int status,
        @Schema(example = "Sign in to continue.") String detail,

        @Schema(description = "Stable code that says what went wrong", example = "AUTHENTICATION_REQUIRED")
        String code,

        @Schema(description = "Only with VALIDATION_FAILED: each invalid field and its message")
        Map<String, String> errors) {}
