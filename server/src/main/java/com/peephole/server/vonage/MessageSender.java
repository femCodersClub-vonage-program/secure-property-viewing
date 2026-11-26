package com.peephole.server.vonage;

public interface MessageSender {

    /**
     * Sends {@code text} by SMS to {@code phone}, in E.164, with {@code clientRef} so the status webhook can find the
     * message.
     *
     * @return the message's id in Vonage
     * @throws MessageSendException if Vonage can't be reached or refuses the message
     */
    String sendSms(String phone, String text, String clientRef);
}
