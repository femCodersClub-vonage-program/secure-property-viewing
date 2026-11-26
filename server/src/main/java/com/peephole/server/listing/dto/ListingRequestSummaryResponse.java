package com.peephole.server.listing.dto;

import java.time.OffsetDateTime;

/** A listing request in the agency's list (D2). */
public record ListingRequestSummaryResponse(
        long id,
        String ownerName,
        String title,
        String operation,
        int priceEuros,
        OffsetDateTime createdAt,
        String status) {

    // The owner's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "ListingRequestSummaryResponse[id=" + id + ", status=" + status + "]";
    }
}
