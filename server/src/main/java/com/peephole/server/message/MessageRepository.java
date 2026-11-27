package com.peephole.server.message;

import jakarta.persistence.LockModeType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

interface MessageRepository extends JpaRepository<Message, Long> {

    // Visit confirmations and every listing request message. Reminders are not built for the demo, so they wait
    @Query("""
            SELECT m FROM Message m
            WHERE m.status = com.peephole.server.message.MessageStatus.SCHEDULED
              AND m.scheduledAt <= :now
              AND (m.listingRequestId IS NOT NULL
                   OR (m.visitId IS NOT NULL AND m.type = com.peephole.server.message.MessageType.CONFIRMATION))
            ORDER BY m.scheduledAt, m.id
            """)
    List<Message> findDueMessages(OffsetDateTime now);

    // The scheduled task and the status webhook lock the row, so their changes are applied one after the other
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Message m WHERE m.id = :id")
    Optional<Message> findWithLockById(long id);
}
