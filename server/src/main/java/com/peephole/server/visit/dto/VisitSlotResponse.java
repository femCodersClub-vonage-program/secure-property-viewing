package com.peephole.server.visit.dto;

import java.time.OffsetDateTime;

public record VisitSlotResponse(long id, OffsetDateTime startsAt, OffsetDateTime endsAt) {}
