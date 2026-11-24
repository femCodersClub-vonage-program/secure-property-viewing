package com.peephole.server.postvisitcall;

import java.time.OffsetDateTime;

/** A visit whose visitor said, in the post-visit call, that someone asked for money before signing. */
public record PostVisitCallAlert(
        long visitId, String visitorName, String propertyTitle, OffsetDateTime startsAt, OffsetDateTime reportedAt) {

    // The visitor's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "PostVisitCallAlert[visitId=" + visitId + ", startsAt=" + startsAt + ", reportedAt=" + reportedAt + "]";
    }
}
