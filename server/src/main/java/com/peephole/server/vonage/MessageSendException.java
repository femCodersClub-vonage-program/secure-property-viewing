package com.peephole.server.vonage;

// Never carries Vonage's exception as its cause, so nothing from the response, such as the phone number, reaches the
// logs
public class MessageSendException extends RuntimeException {

    private final boolean temporary;

    public MessageSendException(String message, boolean temporary) {
        super(message);
        this.temporary = temporary;
    }

    // A temporary error keeps the message SCHEDULED for the next run, and a permanent one makes it FAILED
    public boolean isTemporary() {
        return temporary;
    }
}
