package com.peephole.server.phoneverification.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record PhoneVerificationResponse(
        long id,

        @Schema(allowableValues = {"PENDING", "VERIFIED", "FAILED", "EXPIRED"})
        String status) {}
