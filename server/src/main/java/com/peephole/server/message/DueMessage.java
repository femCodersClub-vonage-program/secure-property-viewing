package com.peephole.server.message;

import java.time.OffsetDateTime;

record DueMessage(long id, long visitId, OffsetDateTime scheduledAt) {}
