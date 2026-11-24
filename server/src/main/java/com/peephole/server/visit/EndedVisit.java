package com.peephole.server.visit;

import java.time.OffsetDateTime;

/** A confirmed visit whose visitor joined the room and that has ended, with the phone that booked it. */
public record EndedVisit(long id, String visitorPhone, OffsetDateTime endsAt) {

    // The phone is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "EndedVisit[id=" + id + ", endsAt=" + endsAt + "]";
    }
}
