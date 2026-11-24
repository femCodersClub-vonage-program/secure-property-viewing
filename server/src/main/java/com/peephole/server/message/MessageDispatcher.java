package com.peephole.server.message;

import com.peephole.server.visit.VisitForMessage;
import com.peephole.server.visit.VisitService;
import com.peephole.server.vonage.MessageSendException;
import com.peephole.server.vonage.MessageSender;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// Calls Vonage outside any transaction, so a slow Vonage holds no database connection. The accepted trade-off in
// specs/messages.md: if the server stops after Vonage accepts a message and before it is saved, it may be sent twice
@Component
class MessageDispatcher {

    private static final Logger LOGGER = LoggerFactory.getLogger(MessageDispatcher.class);

    private final MessageService service;
    private final VisitService visitService;
    private final MessageSender messageSender;

    MessageDispatcher(MessageService service, VisitService visitService, MessageSender messageSender) {
        this.service = service;
        this.visitService = visitService;
        this.messageSender = messageSender;
    }

    void sendDueMessages(OffsetDateTime now) {
        for (DueMessage message : service.dueVisitConfirmations(now)) {
            if (now.isAfter(message.scheduledAt().plus(Message.RETRY_WINDOW))) {
                service.recordFailed(message.id(), now);
                LOGGER.warn("Message {} failed: its retry window has passed", message.id());
            } else {
                send(message, now);
            }
        }
    }

    private void send(DueMessage message, OffsetDateTime now) {
        VisitForMessage visit = visitService.forMessage(message.visitId());
        try {
            String vonageMessageId = messageSender.sendSms(
                    visit.visitorPhone(),
                    MessageTexts.visitConfirmation(visit.propertyTitle(), visit.startsAt()),
                    String.valueOf(message.id()));
            service.recordSubmitted(message.id(), vonageMessageId, now);
            LOGGER.info("Sent message {} for visit {}", message.id(), visit.id());
        } catch (MessageSendException exception) {
            if (exception.isTemporary()) {
                LOGGER.info("Message {} will be tried again: {}", message.id(), exception.getMessage());
            } else {
                service.recordFailed(message.id(), now);
                LOGGER.warn("Message {} failed: {}", message.id(), exception.getMessage());
            }
        }
    }
}
