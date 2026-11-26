package com.peephole.server.message;

import com.peephole.server.vonage.MessagesWebhookReader.MessageStatusUpdate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MessageService.class);

    private final MessageRepository repository;

    MessageService(MessageRepository repository) {
        this.repository = repository;
    }

    // In the booking's transaction, so they are saved together. Sending happens later, so Vonage never undoes a
    // booking
    @Transactional(propagation = Propagation.MANDATORY)
    public void scheduleVisitConfirmation(long visitId, OffsetDateTime now) {
        repository.save(Message.visitConfirmation(visitId, now));
    }

    @Transactional(readOnly = true)
    List<DueMessage> dueVisitConfirmations(OffsetDateTime now) {
        return repository.findDueVisitConfirmations(now).stream()
                .map(message -> new DueMessage(message.getId(), message.getVisitId(), message.getScheduledAt()))
                .toList();
    }

    @Transactional
    void recordSubmitted(long messageId, String vonageMessageId, OffsetDateTime now) {
        repository.findWithLockById(messageId).ifPresent(message -> message.submitted(vonageMessageId, now));
    }

    @Transactional
    void recordFailed(long messageId, OffsetDateTime now) {
        repository.findWithLockById(messageId).ifPresent(message -> message.failed(now));
    }

    // client_ref is our message id. A status about an unknown message, or about another message_uuid, such as one
    // from a local test, is ignored
    @Transactional
    void recordStatus(MessageStatusUpdate update, OffsetDateTime now) {
        Optional<Message> found = parseId(update.clientRef())
                .flatMap(repository::findWithLockById)
                .filter(message -> message.belongsTo(update.messageUuid()));
        if (found.isEmpty()) {
            LOGGER.warn("Ignored a status for message {}, which doesn't match any message", update.clientRef());
            return;
        }
        found.get().statusReported(update.status(), update.messageUuid(), now);
    }

    private static Optional<Long> parseId(String clientRef) {
        try {
            return Optional.of(Long.parseLong(clientRef));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }
}
