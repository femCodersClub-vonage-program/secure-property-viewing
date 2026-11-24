package com.peephole.server.vonage;

import java.util.Locale;

// An event reports one channel of the workflow, and a summary the whole request once it ends
public enum VerifyCallbackType {
    EVENT,
    SUMMARY,
    OTHER;

    static VerifyCallbackType from(String type) {
        return switch (type.toLowerCase(Locale.ROOT)) {
            case "event" -> EVENT;
            case "summary" -> SUMMARY;
            default -> OTHER;
        };
    }
}
