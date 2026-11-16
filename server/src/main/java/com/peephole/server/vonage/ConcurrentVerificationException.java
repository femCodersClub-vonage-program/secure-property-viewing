package com.peephole.server.vonage;

// Vonage already has a verification in progress for this number, started from another session
public class ConcurrentVerificationException extends RuntimeException {

    public ConcurrentVerificationException() {
        super("Vonage has a verification in progress for this number");
    }
}
