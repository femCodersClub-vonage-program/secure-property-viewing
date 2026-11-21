package com.peephole.server.vonage;

// Vonage refused the silent check for this number (412): its operator has not accepted Peephole's Network
// Application Profile. No code is on its way, so an SMS-only verification can start instead
public class SilentAuthUnavailableException extends RuntimeException {

    public SilentAuthUnavailableException() {
        super("Vonage cannot run the silent check for this number's operator");
    }
}
