package com.peephole.server.vonage;

// Vonage cannot send an SMS to this number. It does not charge for the request
public class PhoneNumberRejectedException extends RuntimeException {

    public PhoneNumberRejectedException() {
        super("Vonage rejected the phone number");
    }
}
