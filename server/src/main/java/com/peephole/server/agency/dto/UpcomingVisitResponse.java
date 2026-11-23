package com.peephole.server.agency.dto;

import java.time.OffsetDateTime;

public record UpcomingVisitResponse(long visitId, OffsetDateTime startsAt, String visitorName, String propertyTitle) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "UpcomingVisitResponse[visitId=" + visitId + ", startsAt=" + startsAt + "]";
    }
}
