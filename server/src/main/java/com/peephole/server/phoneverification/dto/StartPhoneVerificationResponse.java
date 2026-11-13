package com.peephole.server.phoneverification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record StartPhoneVerificationResponse(
        long id, @Schema(allowableValues = "PENDING") String status, OffsetDateTime resendAvailableAt) {}
