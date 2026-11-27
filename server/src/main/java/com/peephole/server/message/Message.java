package com.peephole.server.message;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.OffsetDateTime;

// The recipient and the text are read when the message is sent, never stored (specs/messages.md)
@Entity
@Table(name = "message")
class Message {

    // A message is tried again for up to 10 minutes after its scheduledAt
    private static final Duration RETRY_WINDOW = Duration.ofMinutes(10);

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

    private Message(
            Long visitId, Long listingRequestId, MessageType type, OffsetDateTime scheduledAt, OffsetDateTime now) {
        this.visitId = visitId;
        this.listingRequestId = listingRequestId;
        this.type = type;
        this.channel = MessageChannel.SMS;
        this.status = MessageStatus.SCHEDULED;
        this.scheduledAt = scheduledAt;
        this.updatedAt = now;
    }

    static Message visitConfirmation(long visitId, OffsetDateTime now) {
        return new Message(visitId, null, MessageType.CONFIRMATION, now, now);
    }

    static Message listingRequestReceived(long listingRequestId, OffsetDateTime now) {
        return new Message(null, listingRequestId, MessageType.CONFIRMATION, now, now);
    }

    // A request is reviewed only once, so its STATUS_UPDATE means whatever its final status is (specs/messages.md)
    static Message listingRequestDecision(long listingRequestId, OffsetDateTime now) {
        return new Message(null, listingRequestId, MessageType.STATUS_UPDATE, now, now);
    }

    static boolean retryWindowHasPassed(OffsetDateTime scheduledAt, OffsetDateTime now) {
        return now.isAfter(scheduledAt.plus(RETRY_WINDOW));
    }

    // The status webhook may have arrived first, so a later status is kept
    void submitted(String messageUuid, OffsetDateTime now) {
        vonageMessageId = messageUuid;
        if (status == MessageStatus.SCHEDULED) {
            moveTo(MessageStatus.SUBMITTED, now);
        }
    }

    void failed(OffsetDateTime now) {
        if (status == MessageStatus.SCHEDULED) {
            moveTo(MessageStatus.FAILED, now);
        }
    }

    // Until Vonage's answer to the send is saved, any message_uuid matches
    boolean belongsTo(String messageUuid) {
        return vonageMessageId == null || vonageMessageId.equals(messageUuid);
    }

    // The table of statuses in specs/messages.md. DELIVERED and FAILED are final
    void statusReported(String vonageStatus, String messageUuid, OffsetDateTime now) {
        if (status == MessageStatus.DELIVERED || status == MessageStatus.FAILED) {
            return;
        }
        switch (vonageStatus) {
            case "submitted" -> submitted(messageUuid, now);
            case "delivered" -> {
                vonageMessageId = messageUuid;
                moveTo(MessageStatus.DELIVERED, now);
            }
            case "rejected" -> moveTo(MessageStatus.FAILED, now);
            // It never left Vonage, so it is sent again within its retry window, with a new message_uuid
            case "undeliverable" -> {
                if (retryWindowHasPassed(scheduledAt, now)) {
                    moveTo(MessageStatus.FAILED, now);
                } else {
                    vonageMessageId = null;
                    moveTo(MessageStatus.SCHEDULED, now);
                }
            }
            default -> {}
        }
    }

    private void moveTo(MessageStatus newStatus, OffsetDateTime now) {
        status = newStatus;
        updatedAt = now;
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
