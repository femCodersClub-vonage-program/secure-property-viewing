package com.peephole.server.phoneverification.dto;

import jakarta.validation.constraints.NotBlank;

public record CheckPhoneVerificationRequest(@NotBlank String code) {

    @Override
    public String toString() {
        return "CheckPhoneVerificationRequest[code=<hidden>]";
    }
}
