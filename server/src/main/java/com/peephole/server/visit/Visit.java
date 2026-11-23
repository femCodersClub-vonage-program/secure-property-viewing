package com.peephole.server.visit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.Optional;

// The video visit and booking features share this entity; keep each feature's fields mapped here.
@Entity
@Table(name = "visit")
class Visit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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

    @Column(name = "phone_verification_id", nullable = false, updatable = false, unique = true)
    private Long phoneVerificationId;

    @Column(name = "visitor_name", nullable = false, updatable = false)
    private String visitorName;

    @Column(name = "visitor_phone", nullable = false, updatable = false)
    private String visitorPhone;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "visitor_joined_at")
    private OffsetDateTime visitorJoinedAt;

    protected Visit() {}

    Visit(
            Long propertyId,
            VisitSlot slot,
            long phoneVerificationId,
            String visitorName,
            String visitorPhone,
            OffsetDateTime createdAt) {
        this.propertyId = propertyId;
        this.slot = slot;
        this.phoneVerificationId = phoneVerificationId;
        this.visitorName = visitorName;
        this.visitorPhone = visitorPhone;
        this.createdAt = createdAt;
        this.status = VisitStatus.CONFIRMED;
    }

    void assignVideoSession(String sessionId) {
        videoSessionId = sessionId;
    }

    // Only the first time counts, so a visitor who enters again keeps her first entry
    void markVisitorJoined(OffsetDateTime joinedAt) {
        if (visitorJoinedAt == null) {
            visitorJoinedAt = joinedAt;
        }
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

    String getVisitorName() {
        return visitorName;
    }

    Optional<String> getVideoSessionId() {
        return Optional.ofNullable(videoSessionId);
    }
}
