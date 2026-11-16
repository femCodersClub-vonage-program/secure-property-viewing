package com.peephole.server.phoneverification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "phone_verification")
class PhoneVerification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PhoneVerificationPurpose purpose;

    @Column(name = "phone_hash", nullable = false)
    private String phoneHash;

    @Column(name = "vonage_request_id", nullable = false)
    private String vonageRequestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PhoneVerificationStatus status;

    @Column(name = "check_attempts", nullable = false)
    private short checkAttempts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "verified_at")
    private OffsetDateTime verifiedAt;

    protected PhoneVerification() {}

    PhoneVerification(
            PhoneVerificationPurpose purpose, String phoneHash, String vonageRequestId, OffsetDateTime createdAt) {
        this.purpose = purpose;
        this.phoneHash = phoneHash;
        this.vonageRequestId = vonageRequestId;
        this.status = PhoneVerificationStatus.PENDING;
        this.checkAttempts = 0;
        this.createdAt = createdAt;
    }

    void recordCheckAttempt() {
        checkAttempts++;
    }

    void markVerified(OffsetDateTime now) {
        status = PhoneVerificationStatus.VERIFIED;
        verifiedAt = now;
    }

    void markFailed() {
        status = PhoneVerificationStatus.FAILED;
    }

    void markExpired() {
        status = PhoneVerificationStatus.EXPIRED;
    }

    Long getId() {
        return id;
    }

    PhoneVerificationPurpose getPurpose() {
        return purpose;
    }

    String getPhoneHash() {
        return phoneHash;
    }

    String getVonageRequestId() {
        return vonageRequestId;
    }

    PhoneVerificationStatus getStatus() {
        return status;
    }

    short getCheckAttempts() {
        return checkAttempts;
    }

    OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    OffsetDateTime getVerifiedAt() {
        return verifiedAt;
    }
}
