package com.peephole.server.vonage;

// Vonage could not be reached or could not create the session. Like PhoneVerifierException, it never carries
// Vonage's exception as its cause, so nothing from the response reaches the logs
public class VideoProviderException extends RuntimeException {

    public VideoProviderException(String message) {
        super(message);
    }
}
