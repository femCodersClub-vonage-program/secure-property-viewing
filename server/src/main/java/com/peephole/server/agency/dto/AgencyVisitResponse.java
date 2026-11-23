package com.peephole.server.agency.dto;

import java.time.OffsetDateTime;

public record AgencyVisitResponse(
        long visitId,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        String visitorName,
        String propertyTitle,
        String status) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "AgencyVisitResponse[visitId=" + visitId + ", startsAt=" + startsAt + ", status=" + status + "]";
    }
}
