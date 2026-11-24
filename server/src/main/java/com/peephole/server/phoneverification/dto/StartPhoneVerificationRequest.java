package com.peephole.server.phoneverification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record StartPhoneVerificationRequest(
        @NotBlank
        @Pattern(
                regexp = "\\+[1-9]\\d{6,14}",
                message = "must be a phone number in international format, such as +34600000000")
        String phone,

        @NotBlank @Pattern(regexp = "VISIT|LISTING_REQUEST") @Schema(allowableValues = {"VISIT", "LISTING_REQUEST"})
        String purpose,

        @Schema(
                description = "Optional. Tries the silent check with the mobile operator first, when the server has"
                        + " Silent Authentication on. Ignored otherwise")
        Boolean silentAuth) {

    @Override
    public String toString() {
        return "StartPhoneVerificationRequest[phone=<hidden>, purpose=" + purpose + ", silentAuth=" + silentAuth + "]";
    }
}
