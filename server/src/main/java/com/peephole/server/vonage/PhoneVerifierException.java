package com.peephole.server.vonage;

// Vonage could not be reached or answered with an error the person cannot fix.
// It never carries Vonage's exception as its cause: that message comes from Vonage's response, which may include the
// phone number, and it would reach the logs
public class PhoneVerifierException extends RuntimeException {

    public PhoneVerifierException(String message) {
        super(message);
    }
}
