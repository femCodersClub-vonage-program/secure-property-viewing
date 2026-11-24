package com.peephole.server.phoneverification.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record StartPhoneVerificationResponse(
        Long id,
        @Schema(allowableValues = "PENDING") String status,
        OffsetDateTime resendAvailableAt,

        // Left out of the JSON when there is no silent check, as specs/silent-authentication.md shows
        @JsonInclude(JsonInclude.Include.NON_NULL)
        @Schema(description = "Only when the silent check started: the URL the browser opens for it")
        String checkUrl) {}
