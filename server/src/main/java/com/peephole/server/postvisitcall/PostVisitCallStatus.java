package com.peephole.server.postvisitcall;

enum PostVisitCallStatus {
    // The row is inserted and the call requested
    CALLING,
    // The key webhook arrived, with any key or none. Final
    ANSWERED,
    // Busy, unanswered, rejected, voicemail, or completed with no key. Only a late key can still change it
    NOT_REACHED,
    // Vonage refused to start the call, or its answer never arrived. Only a key can still change it
    FAILED,
    // The call would fall outside 09:00 to 21:00 in Madrid. Final
    SKIPPED
}
