package com.peephole.server.agency.dto;

import java.time.OffsetDateTime;

public record AlertResponse(
        long visitId, String visitorName, String propertyTitle, OffsetDateTime startsAt, OffsetDateTime reportedAt) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "AlertResponse[visitId=" + visitId + ", startsAt=" + startsAt + ", reportedAt=" + reportedAt + "]";
    }
}
