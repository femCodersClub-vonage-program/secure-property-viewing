package com.peephole.server.vonage;

public interface PhoneVerifier {
    // An SMS-only verification. Returns Vonage's request id
    String start(String phone);

    // A verification that tries the silent check with the mobile operator first. With smsFallback, an SMS step
    // follows it. The Virtual Operator refuses that second step, so +990 numbers start without it
    SilentAuthStart startWithSilentAuth(String phone, String redirectUrl, boolean smsFallback);

    // Checks an SMS code or the code the silent check brings back: Verify checks both the same way
    CodeCheckResult check(String requestId, String code);

    // Moves a verification on to its SMS step, after the silent check failed or never came back
    SmsStepResult moveToSms(String requestId);

    // Does nothing if the request has already ended
    void cancel(String requestId);
}
