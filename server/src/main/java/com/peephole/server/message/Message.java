package com.peephole.server.message;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

// The recipient and the text are read when the message is sent, never stored (specs/messages.md)
@Entity
@Table(name = "message")
class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id", updatable = false)
    private Long visitId;

    @Column(name = "listing_request_id", updatable = false)
    private Long listingRequestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private MessageType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private MessageChannel channel;

    @Column(name = "vonage_message_id")
    private String vonageMessageId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MessageStatus status;

    @Column(name = "scheduled_at", nullable = false)
    private OffsetDateTime scheduledAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    protected Message() {}

    private Message(Long visitId, MessageType type, OffsetDateTime scheduledAt, OffsetDateTime now) {
        this.visitId = visitId;
        this.type = type;
        this.channel = MessageChannel.SMS;
        this.status = MessageStatus.SCHEDULED;
        this.scheduledAt = scheduledAt;
        this.updatedAt = now;
    }

    static Message visitConfirmation(long visitId, OffsetDateTime now) {
        return new Message(visitId, MessageType.CONFIRMATION, now, now);
    }

    // The status webhook may have arrived first, so a later status is kept
    void submitted(String messageUuid, OffsetDateTime now) {
        vonageMessageId = messageUuid;
        if (status == MessageStatus.SCHEDULED) {
            status = MessageStatus.SUBMITTED;
            updatedAt = now;
        }
    }

    void failed(OffsetDateTime now) {
        if (status == MessageStatus.SCHEDULED) {
            status = MessageStatus.FAILED;
            updatedAt = now;
        }
    }

    Long getId() {
        return id;
    }

    Long getVisitId() {
        return visitId;
    }

    Long getListingRequestId() {
        return listingRequestId;
    }

    MessageType getType() {
        return type;
    }

    MessageChannel getChannel() {
        return channel;
    }

    String getVonageMessageId() {
        return vonageMessageId;
    }

    MessageStatus getStatus() {
        return status;
    }

    OffsetDateTime getScheduledAt() {
        return scheduledAt;
    }

    OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
