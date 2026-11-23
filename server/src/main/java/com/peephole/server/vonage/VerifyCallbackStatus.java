package com.peephole.server.vonage;

import java.util.Locale;

// The statuses of a Verify callback that change a phone verification
public enum VerifyCallbackStatus {
    COMPLETED,
    USER_REJECTED,
    FAILED,
    EXPIRED,
    // Any other status, such as action_pending, which changes nothing
    OTHER;

    static VerifyCallbackStatus from(String status) {
        return switch (status.toLowerCase(Locale.ROOT)) {
            case "completed" -> COMPLETED;
            case "user_rejected" -> USER_REJECTED;
            case "failed" -> FAILED;
            case "expired" -> EXPIRED;
            default -> OTHER;
        };
    }
}
