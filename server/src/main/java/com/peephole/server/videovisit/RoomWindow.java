package com.peephole.server.videovisit;

import com.peephole.server.visit.BookedVisit;
import java.time.Duration;
import java.time.Instant;

/** The room opens 10 minutes before the visit and closes 15 minutes after it, as decided in the spec. */
record RoomWindow(Instant opensAt, Instant closesAt) {

    static final Duration OPENS_BEFORE = Duration.ofMinutes(10);
    private static final Duration CLOSES_AFTER = Duration.ofMinutes(15);

    static RoomWindow of(BookedVisit visit) {
        return new RoomWindow(
                visit.startsAt().minus(OPENS_BEFORE), visit.endsAt().plus(CLOSES_AFTER));
    }

    boolean hasOpened(Instant now) {
        return !now.isBefore(opensAt);
    }

    boolean hasClosed(Instant now) {
        return !now.isBefore(closesAt);
    }
}
