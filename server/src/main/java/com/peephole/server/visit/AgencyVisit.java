package com.peephole.server.visit;

import java.time.OffsetDateTime;

/** What the agency dashboard may know about a visit: its time, its visitor, its property and its status. */
public record AgencyVisit(
        long id,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        String visitorName,
        String propertyTitle,
        String status) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "AgencyVisit[id=" + id + ", startsAt=" + startsAt + ", status=" + status + "]";
    }
}
