package com.peephole.server.phoneverification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CheckPhoneVerificationRequest(
        @NotBlank @Pattern(regexp = "\\d{6}", message = "must be the 6-digit code from the SMS")
        String code) {

    @Override
    public String toString() {
        return "CheckPhoneVerificationRequest[code=<hidden>]";
    }
}
