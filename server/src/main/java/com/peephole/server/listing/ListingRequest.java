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

// Only the fields an owner sends are mapped for now: the agency's review adds its own in #57
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

    ListingRequestStatus getStatus() {
        return status;
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
