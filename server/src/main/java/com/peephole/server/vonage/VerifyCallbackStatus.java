package com.peephole.server.vonage;

import java.util.Locale;

// The statuses of a Verify callback that change a phone verification. blocked, cancelled and rejected are in Vonage's
// documentation but not in the SDK, which is why the body is read without it
public enum VerifyCallbackStatus {
    COMPLETED,
    USER_REJECTED,
    // Listed among the event statuses but never explained, so it is handled as user_rejected
    REJECTED,
    FAILED,
    EXPIRED,
    // Blocked by Vonage's velocity rules, or because the number is VoIP
    BLOCKED,
    // The request was cancelled, which Peephole only does when a new code replaces it
    CANCELLED,
    // Any other status, such as action_pending, which changes nothing
    OTHER;

    static VerifyCallbackStatus from(String status) {
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "completed" -> COMPLETED;
            case "user_rejected" -> USER_REJECTED;
            case "rejected" -> REJECTED;
            case "failed" -> FAILED;
            case "expired" -> EXPIRED;
            case "blocked" -> BLOCKED;
            case "cancelled" -> CANCELLED;
            default -> OTHER;
        };
    }
}
