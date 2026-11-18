package com.peephole.server.visit.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record VisitBookingRequest(
        @NotNull @Positive Long slotId,
        @NotBlank @Size(max = 100) String visitorName,

        @NotBlank
        @Pattern(
                regexp = "\\+[1-9]\\d{6,14}",
                message = "must be a phone number in international format, such as +34600000000")
        String phone,

        @NotNull @Positive Long phoneVerificationId) {

    public VisitBookingRequest {
        if (visitorName != null) {
            visitorName = visitorName.strip();
        }
    }

    @Override
    public String toString() {
        return "VisitBookingRequest[slotId=%s, visitorName=<redacted>, phone=<redacted>, phoneVerificationId=%s]"
                .formatted(slotId, phoneVerificationId);
    }
}
