package com.peephole.server.message;

import com.peephole.server.listing.ListingRequestForMessage;
import com.peephole.server.listing.ListingRequestService;
import com.peephole.server.visit.VisitForMessage;
import com.peephole.server.visit.VisitService;
import com.peephole.server.vonage.MessageSendException;
import com.peephole.server.vonage.MessageSender;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

// Calls Vonage outside any transaction, so a slow Vonage holds no database connection. The accepted trade-off in
// specs/messages.md: if the server stops or the database fails after Vonage accepts a message and before it is
// saved, it may be sent twice
@Component
class MessageDispatcher {

    private static final Logger LOGGER = LoggerFactory.getLogger(MessageDispatcher.class);

    private final MessageService service;
    private final VisitService visitService;
    private final ListingRequestService listingRequestService;
    private final MessageSender messageSender;

    MessageDispatcher(
            MessageService service,
            VisitService visitService,
            ListingRequestService listingRequestService,
            MessageSender messageSender) {
        this.service = service;
        this.visitService = visitService;
        this.listingRequestService = listingRequestService;
        this.messageSender = messageSender;
    }

    void sendDueMessages(OffsetDateTime now) {
        for (DueMessage message : service.dueMessages(now)) {
            if (Message.retryWindowHasPassed(message.scheduledAt(), now)) {
                service.recordFailed(message.id(), now);
                LOGGER.warn("Message {} failed: its retry window has passed", message.id());
            } else {
                sendLeavingTheOthersUnaffected(message, now);
            }
        }
    }

    // An unexpected error keeps the message SCHEDULED until its retry window passes. Only the exception's type is
    // logged, because its text may carry the phone number
    private void sendLeavingTheOthersUnaffected(DueMessage message, OffsetDateTime now) {
        try {
            send(message, now);
        } catch (RuntimeException exception) {
            LOGGER.error(
                    "Message {} will be tried again after an unexpected {}",
                    message.id(),
                    exception.getClass().getSimpleName());
        }
    }

    private void send(DueMessage message, OffsetDateTime now) {
        Sms sms = message.visitId() != null ? visitSms(message.visitId()) : listingRequestSms(message);
        try {
            String vonageMessageId = messageSender.sendSms(sms.to(), sms.text(), String.valueOf(message.id()));
            service.recordSubmitted(message.id(), vonageMessageId, now);
            LOGGER.info("Sent message {} for {}", message.id(), sms.about());
        } catch (MessageSendException exception) {
            if (exception.isTemporary()) {
                LOGGER.info("Message {} will be tried again: {}", message.id(), exception.getMessage());
            } else {
                service.recordFailed(message.id(), now);
                LOGGER.warn("Message {} failed: {}", message.id(), exception.getMessage());
            }
        }
    }

    private Sms visitSms(long visitId) {
        VisitForMessage visit = visitService.forMessage(visitId);
        return new Sms(
                visit.visitorPhone(),
                MessageTexts.visitConfirmation(visit.propertyTitle(), visit.startsAt()),
                "visit " + visit.id());
    }

    private Sms listingRequestSms(DueMessage message) {
        ListingRequestForMessage request = listingRequestService.forMessage(message.listingRequestId());
        String text = message.type() == MessageType.CONFIRMATION
                ? MessageTexts.listingRequestReceived(request.title())
                : decisionText(request);
        return new Sms(request.ownerPhone(), text, "listing request " + request.id());
    }

    // A decision is only sent once the request is reviewed, so the owner is never told about one that wasn't made
    private static String decisionText(ListingRequestForMessage request) {
        return switch (request.status()) {
            case APPROVED -> MessageTexts.listingRequestApproved(request.title());
            case REJECTED -> MessageTexts.listingRequestRejected(request.title());
            case PENDING ->
                throw new IllegalStateException("Listing request " + request.id() + " has not been reviewed");
        };
    }

    // `about` is what the log names, so it never carries the phone or the text
    private record Sms(String to, String text, String about) {

        @Override
        public String toString() {
            return "Sms[about=" + about + "]";
        }
    }
}
