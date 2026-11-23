package com.peephole.server.postvisitcall;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;

// Rows are inserted with SQL by PostVisitCallService.claim, so a second check at the same moment skips the visit
// instead of failing. This entity only reads and updates them
@Entity
@Table(name = "post_visit_call")
class PostVisitCall {

    @Id
    private Long id;

    @Column(name = "visit_id", nullable = false, updatable = false)
    private Long visitId;

    @Column(name = "vonage_call_uuid")
    private String vonageCallUuid;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PostVisitCallStatus status;

    @Enumerated(EnumType.STRING)
    private PostVisitCallAnswer answer;

    @Column(name = "answered_at")
    private OffsetDateTime answeredAt;

    protected PostVisitCall() {}

    Long getId() {
        return id;
    }

    Long getVisitId() {
        return visitId;
    }

    PostVisitCallStatus getStatus() {
        return status;
    }

    Optional<PostVisitCallAnswer> getAnswer() {
        return Optional.ofNullable(answer);
    }

    OffsetDateTime getAnsweredAt() {
        return answeredAt;
    }

    // Until Vonage accepts the call its id is unknown, so any call id matches
    boolean belongsTo(String callUuid) {
        return vonageCallUuid == null || vonageCallUuid.equals(callUuid);
    }

    void started(String callUuid) {
        vonageCallUuid = callUuid;
    }

    void failed() {
        status = PostVisitCallStatus.FAILED;
    }

    void notReached() {
        status = PostVisitCallStatus.NOT_REACHED;
    }

    void answered(Optional<PostVisitCallAnswer> key, OffsetDateTime receivedAt) {
        status = PostVisitCallStatus.ANSWERED;
        answer = key.orElse(null);
        answeredAt = key.isPresent() ? receivedAt : null;
    }
}
