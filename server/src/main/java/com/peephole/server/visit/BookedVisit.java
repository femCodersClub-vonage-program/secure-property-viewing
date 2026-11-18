package com.peephole.server.visit;

import java.time.Instant;

/** What other features may know about a visit: whether it still stands, its time and the agency that runs it. */
public record BookedVisit(long id, boolean confirmed, Instant startsAt, Instant endsAt, long agencyId) {}
