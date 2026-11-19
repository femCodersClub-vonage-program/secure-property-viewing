package com.peephole.server.visit;

import java.time.Instant;

interface AvailableVisitSlot {
    Long getId();

    Instant getStartsAt();

    Instant getEndsAt();
}
