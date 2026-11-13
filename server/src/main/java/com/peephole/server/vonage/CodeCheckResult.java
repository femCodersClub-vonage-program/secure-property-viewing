package com.peephole.server.vonage;

public enum CodeCheckResult {
    MATCHED,
    WRONG_CODE,
    // Vonage ended the request, after too many wrong codes or because it expired
    ENDED
}
