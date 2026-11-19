package com.peephole.server.visit.dto;

import java.time.OffsetDateTime;

public record VisitBookingResponse(
        long visitId, OffsetDateTime startsAt, OffsetDateTime endsAt, String visitorName, PropertySummary property) {

    public record PropertySummary(String title, String area, String address) {}
}
