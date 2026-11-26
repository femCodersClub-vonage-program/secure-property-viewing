package com.peephole.server.listing;

import com.peephole.server.property.PropertyOperation;
import com.peephole.server.property.PropertyType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;

// What the owner sends never changes. The agency's review fills in the status, reviewed_by, rejection_reason and
// reviewed_at
@Entity
@Table(name = "listing_request")
class ListingRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "phone_verification_id", nullable = false, updatable = false, unique = true)
    private Long phoneVerificationId;

    @Column(name = "owner_full_name", nullable = false, updatable = false)
    private String ownerFullName;

    @Column(name = "owner_phone", nullable = false, updatable = false)
    private String ownerPhone;

    @Column(nullable = false, updatable = false)
    private String title;

    @Column(nullable = false, updatable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false, updatable = false)
    private PropertyType propertyType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private PropertyOperation operation;

    @Column(nullable = false, updatable = false)
    private String area;

    @Column(nullable = false, updatable = false)
    private String address;

    @Column(name = "price_euros", nullable = false, updatable = false)
    private Integer priceEuros;

    @Column(nullable = false, updatable = false)
    private Short bedrooms;

    @Column(name = "size_m2", nullable = false, updatable = false)
    private Integer sizeM2;

    @Column(updatable = false)
    private Short floor;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ListingRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    protected ListingRequest() {}

    ListingRequest(OwnerDetails owner, PropertyDetails property, long phoneVerificationId, OffsetDateTime createdAt) {
        this.phoneVerificationId = phoneVerificationId;
        this.ownerFullName = owner.fullName();
        this.ownerPhone = owner.phone();
        this.title = property.title();
        this.description = property.description();
        this.propertyType = property.propertyType();
        this.operation = property.operation();
        this.area = property.area();
        this.address = property.address();
        this.priceEuros = property.priceEuros();
        this.bedrooms = property.bedrooms();
        this.sizeM2 = property.sizeM2();
        this.floor = property.floor();
        this.status = ListingRequestStatus.PENDING;
        this.createdAt = createdAt;
    }

    Long getId() {
        return id;
    }

    String getOwnerFullName() {
        return ownerFullName;
    }

    String getOwnerPhone() {
        return ownerPhone;
    }

    String getTitle() {
        return title;
    }

    String getDescription() {
        return description;
    }

    PropertyType getPropertyType() {
        return propertyType;
    }

    PropertyOperation getOperation() {
        return operation;
    }

    String getArea() {
        return area;
    }

    String getAddress() {
        return address;
    }

    Integer getPriceEuros() {
        return priceEuros;
    }

    Short getBedrooms() {
        return bedrooms;
    }

    Integer getSizeM2() {
        return sizeM2;
    }

    Short getFloor() {
        return floor;
    }

    ListingRequestStatus getStatus() {
        return status;
    }

    OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    String getRejectionReason() {
        return rejectionReason;
    }

    OffsetDateTime getReviewedAt() {
        return reviewedAt;
    }

    record OwnerDetails(String fullName, String phone) {
        @Override
        public String toString() {
            return "OwnerDetails[fullName=<redacted>, phone=<redacted>]";
        }
    }

    record PropertyDetails(
        String title,
        String description,
        PropertyType propertyType,
        PropertyOperation operation,
        String area,
        String address,
        int priceEuros,
        short bedrooms,
        int sizeM2,
        Short floor) {}
}
