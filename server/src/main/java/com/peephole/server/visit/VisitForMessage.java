package com.peephole.server.visit;

import java.time.OffsetDateTime;

/** What the visit confirmation SMS needs from a visit. */
public record VisitForMessage(long id, String visitorPhone, String propertyTitle, OffsetDateTime startsAt) {

    @Override
    public String toString() {
        return "VisitForMessage[id=" + id + ", startsAt=" + startsAt + "]";
    }
}
