package com.peephole.server.visit;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

@Entity
@Table(name = "visit_slot")
class VisitSlot {
    @Id
    private Long id;

    @Column(name = "property_id", nullable = false, updatable = false)
    private Long propertyId;

    @Column(name = "starts_at", nullable = false)
    private OffsetDateTime startsAt;

    @Column(name = "ends_at", nullable = false)
    private OffsetDateTime endsAt;

    protected VisitSlot() {}

    Long getId() {
        return id;
    }

    Long getPropertyId() {
        return propertyId;
    }

    OffsetDateTime getStartsAt() {
        return startsAt;
    }

    OffsetDateTime getEndsAt() {
        return endsAt;
    }
}
