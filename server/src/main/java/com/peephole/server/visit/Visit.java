package com.peephole.server.visit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.Optional;

// Only the columns the video visit needs. Booking (#73) adds the rest when it creates visits
@Entity
@Table(name = "visit")
class Visit {
    @Id
    private Long id;

    @Column(name = "property_id", nullable = false, updatable = false)
    private Long propertyId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visit_slot_id", nullable = false, updatable = false)
    private VisitSlot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisitStatus status;

    @Column(name = "video_session_id")
    private String videoSessionId;

    protected Visit() {}

    void assignVideoSession(String sessionId) {
        videoSessionId = sessionId;
    }

    Long getId() {
        return id;
    }

    Long getPropertyId() {
        return propertyId;
    }

    VisitSlot getSlot() {
        return slot;
    }

    VisitStatus getStatus() {
        return status;
    }

    Optional<String> getVideoSessionId() {
        return Optional.ofNullable(videoSessionId);
    }
}
