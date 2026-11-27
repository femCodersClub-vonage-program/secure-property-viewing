package com.peephole.server.message;

import java.time.OffsetDateTime;

// Exactly one of visitId and listingRequestId is set, as the message table checks
record DueMessage(long id, Long visitId, Long listingRequestId, MessageType type, OffsetDateTime scheduledAt) {}
