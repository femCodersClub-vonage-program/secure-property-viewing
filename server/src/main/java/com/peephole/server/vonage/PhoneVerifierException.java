package com.peephole.server.vonage;

public class PhoneVerifierException extends RuntimeException {
    public PhoneVerifierException(String message, Throwable cause) {
        super(message, cause);
    }
}
