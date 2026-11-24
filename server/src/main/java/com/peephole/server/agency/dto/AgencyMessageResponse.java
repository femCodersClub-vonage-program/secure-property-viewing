package com.peephole.server.agency.dto;

import java.time.OffsetDateTime;

/** A message about a visit or a listing request: one of the two ids is always null. */
public record AgencyMessageResponse(
        long id,
        String type,
        String channel,
        String recipientName,
        Long visitId,
        Long listingRequestId,
        OffsetDateTime scheduledAt,
        OffsetDateTime updatedAt,
        String status) {

    // The recipient's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "AgencyMessageResponse[id=" + id + ", type=" + type + ", status=" + status + "]";
    }
}
