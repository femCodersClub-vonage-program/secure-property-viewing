package com.peephole.server.property;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "property_image")
class PropertyImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    @Column(nullable = false)
    private String url;

    @Column(name = "alt_text", nullable = false)
    private String altText;

    @Column(nullable = false)
    private short position;

    protected PropertyImage() {}

    String getUrl() {
        return url;
    }

    String getAltText() {
        return altText;
    }

    short getPosition() {
        return position;
    }
}
