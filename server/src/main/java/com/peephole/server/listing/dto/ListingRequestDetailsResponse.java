package com.peephole.server.listing.dto;

import java.time.OffsetDateTime;

/** A listing request with every detail, for the agency (D3). floor, reviewedAt and rejectionReason can be null. */
public record ListingRequestDetailsResponse(
        long id,
        String status,
        String ownerName,
        String ownerPhone,
        String title,
        String description,
        String propertyType,
        String operation,
        String area,
        String address,
        int priceEuros,
        int bedrooms,
        int sizeM2,
        Integer floor,
        OffsetDateTime createdAt,
        OffsetDateTime reviewedAt,
        String rejectionReason) {

    // The owner's name and phone and the address are personal data, so they never reach a log
    @Override
    public String toString() {
        return "ListingRequestDetailsResponse[id=" + id + ", status=" + status + ", propertyType=" + propertyType
                + ", operation=" + operation + "]";
    }
}
