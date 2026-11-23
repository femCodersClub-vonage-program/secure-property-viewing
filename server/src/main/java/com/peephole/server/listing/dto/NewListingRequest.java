package com.peephole.server.listing.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

// propertyType and operation are strings, so a wrong value gets a message on its own field
public record NewListingRequest(
        @NotBlank @Size(max = 100) String ownerName,

        @NotBlank
        @Pattern(
                regexp = "\\+[1-9]\\d{6,14}",
                message = "must be a phone number in international format, such as +34612987654")
        String ownerPhone,

        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 5000) String description,

        @NotBlank @Pattern(regexp = "APARTMENT|HOUSE|STUDIO", message = "must be APARTMENT, HOUSE or STUDIO")
        String propertyType,

        @NotBlank @Pattern(regexp = "RENT|SALE", message = "must be RENT or SALE")
        String operation,

        @NotBlank @Size(max = 100) String area,
        @NotBlank @Size(max = 255) String address,
        @NotNull @Positive Integer priceEuros,
        @NotNull @PositiveOrZero @Max(50) Integer bedrooms,
        @NotNull @Positive Integer sizeM2,
        @Min(-5) @Max(100) Integer floor,
        @NotNull @Positive Long phoneVerificationId) {

    public NewListingRequest {
        ownerName = strip(ownerName);
        title = strip(title);
        description = strip(description);
        area = strip(area);
        address = strip(address);
    }

    private static String strip(String value) {
        return value == null ? null : value.strip();
    }

    @Override
    public String toString() {
        return ("NewListingRequest[ownerName=<redacted>, ownerPhone=<redacted>, address=<redacted>,"
                        + " propertyType=%s, operation=%s, phoneVerificationId=%s]")
                .formatted(propertyType, operation, phoneVerificationId);
    }
}
