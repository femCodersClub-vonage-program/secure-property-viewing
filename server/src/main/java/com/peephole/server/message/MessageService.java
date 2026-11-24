package com.peephole.server.message;

import java.time.OffsetDateTime;
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
}
