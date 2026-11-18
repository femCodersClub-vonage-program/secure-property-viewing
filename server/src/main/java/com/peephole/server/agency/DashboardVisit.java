package com.peephole.server.agency;

import java.time.OffsetDateTime;

record DashboardVisit(
        long id,
        OffsetDateTime startsAt,
        OffsetDateTime endsAt,
        String visitorName,
        String propertyTitle,
        String status) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "DashboardVisit[id=" + id + ", startsAt=" + startsAt + ", status=" + status + "]";
    }
}
