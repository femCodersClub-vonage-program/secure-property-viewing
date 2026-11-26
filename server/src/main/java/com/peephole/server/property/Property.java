package com.peephole.server.property;

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
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "property")
class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_id", nullable = false)
    private Agency agency;

    @Column(name = "listing_request_id", updatable = false)
    private Long listingRequestId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyOperation operation;

    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false)
    private PropertyType propertyType;

    @Column(name = "price_euros", nullable = false)
    private int priceEuros;

    @Column(nullable = false)
    private String area;

    @Column(nullable = false)
    private String address;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(nullable = false)
    private short bedrooms;

    @Column(name = "size_m2", nullable = false)
    private int sizeM2;

    @Column
    private Short floor;

    @Column(nullable = false)
    private String description;

    @Column(name = "video_visit_available", nullable = false)
    private boolean videoVisitAvailable;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PropertyStatus status;

    @OneToMany(mappedBy = "property", fetch = FetchType.LAZY)
    @OrderBy("position ASC")
    private List<PropertyImage> images = new ArrayList<>();

    protected Property() {}

    // Without photos or coordinates, so the catalog shows the generic image and no pin. Without visit slots either,
    // so it doesn't offer an empty calendar, as decided in #57
    Property(Agency agency, NewProperty newProperty) {
        this.agency = agency;
        this.listingRequestId = newProperty.listingRequestId();
        this.title = newProperty.title();
        this.operation = newProperty.operation();
        this.propertyType = newProperty.propertyType();
        this.priceEuros = newProperty.priceEuros();
        this.area = newProperty.area();
        this.address = newProperty.address();
        this.bedrooms = newProperty.bedrooms();
        this.sizeM2 = newProperty.sizeM2();
        this.floor = newProperty.floor();
        this.description = newProperty.description();
        this.videoVisitAvailable = false;
        this.status = PropertyStatus.ACTIVE;
    }

    Long getId() {
        return id;
    }

    Agency getAgency() {
        return agency;
    }

    String getTitle() {
        return title;
    }

    PropertyOperation getOperation() {
        return operation;
    }

    PropertyType getPropertyType() {
        return propertyType;
    }

    int getPriceEuros() {
        return priceEuros;
    }

    String getArea() {
        return area;
    }

    String getAddress() {
        return address;
    }

    BigDecimal getLatitude() {
        return latitude;
    }

    BigDecimal getLongitude() {
        return longitude;
    }

    short getBedrooms() {
        return bedrooms;
    }

    int getSizeM2() {
        return sizeM2;
    }

    Short getFloor() {
        return floor;
    }

    String getDescription() {
        return description;
    }

    boolean isVideoVisitAvailable() {
        return videoVisitAvailable;
    }

    PropertyStatus getStatus() {
        return status;
    }

    List<PropertyImage> getImages() {
        return images;
    }
}
