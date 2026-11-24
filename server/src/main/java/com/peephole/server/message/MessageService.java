package com.peephole.server.message;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MessageService {

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
}
