package com.peephole.server.videovisit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

/** A room link: only the hash of its token is stored, so the link itself can't be read from the database. */
@Entity
@Table(name = "video_access")
class VideoAccess {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "visit_id", nullable = false, updatable = false)
    private Long visitId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private VideoRole role;

    @Column(name = "token_hash", nullable = false, updatable = false)
    private String tokenHash;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    protected VideoAccess() {}

    VideoAccess(long visitId, VideoRole role, String tokenHash, OffsetDateTime createdAt) {
        this.visitId = visitId;
        this.role = role;
        this.tokenHash = tokenHash;
        this.createdAt = createdAt;
    }

    Long getVisitId() {
        return visitId;
    }

    VideoRole getRole() {
        return role;
    }
}
