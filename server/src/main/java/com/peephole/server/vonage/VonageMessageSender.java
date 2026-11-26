package com.peephole.server.vonage;

import com.vonage.client.VonageClientException;
import com.vonage.client.messages.MessageResponseException;
import com.vonage.client.messages.MessagesClient;
import com.vonage.client.messages.sms.SmsTextRequest;

public class VonageMessageSender implements MessageSender {

    private final MessagesClient messagesClient;
    private final String from;

    public VonageMessageSender(MessagesClient messagesClient, String from) {
        this.messagesClient = messagesClient;
        this.from = from;
    }

    @Override
    public String sendSms(String phone, String text, String clientRef) {
        try {
            SmsTextRequest request = SmsTextRequest.builder()
                    .from(from)
                    .to(withoutPlus(phone))
                    .text(text)
                    .clientRef(clientRef)
                    .build();
            return messagesClient.sendMessage(request).getMessageUuid().toString();
        } catch (MessageResponseException exception) {
            int status = exception.getStatusCode();
            // A rate limit or an error on Vonage's side can pass, so the message is tried again (specs/messages.md)
            boolean temporary = status == 429 || status >= 500;
            throw new MessageSendException(
                    "Vonage answered " + status + " when sending message " + clientRef, temporary);
        } catch (VonageClientException exception) {
            throw new MessageSendException("Could not reach Vonage to send message " + clientRef, true);
        }
    }

    private static String withoutPlus(String phone) {
        return phone.startsWith("+") ? phone.substring(1) : phone;
    }
}
