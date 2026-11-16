package com.peephole.server.vonage;

public interface PhoneVerifier {
    String start(String phone);

    CodeCheckResult check(String requestId, String code);
    // Does nothing if the request has already ended
    void cancel(String requestId);
}
