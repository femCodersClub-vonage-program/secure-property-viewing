package com.peephole.server.vonage;

// Vonage could not be reached or refused the call. Like VideoProviderException, it never carries Vonage's exception
// as its cause, so nothing from the response, such as the phone number, reaches the logs
public class VoiceCallException extends RuntimeException {

    public VoiceCallException(String message) {
        super(message);
    }
}
