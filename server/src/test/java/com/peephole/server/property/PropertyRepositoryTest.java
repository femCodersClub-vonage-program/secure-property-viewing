package com.peephole.server.property;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PropertyRepositoryTest {

    @Autowired
    private PropertyRepository repository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long agencyId;

    @BeforeEach
    void insertAgency() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES ('Test Agency', 'test@example.com', '+34600000000', true) RETURNING id",
                Long.class);
    }

    @Test
    void returnsActiveProperties() {
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "SALE", "ACTIVE");

        long count = repository.findAllActive().stream()
                .filter(p -> p.getAgency().getId().equals(agencyId))
                .count();
        assertThat(count).isEqualTo(2);
    }

    @Test
    void excludesInactiveProperties() {
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "SALE", "INACTIVE");

        long count = repository.findAllActive().stream()
                .filter(p -> p.getAgency().getId().equals(agencyId))
                .count();
        assertThat(count).isEqualTo(1);
    }

    @Test
    void filtersActivePropertiesByOperation() {
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "SALE", "ACTIVE");

        long rentCount = repository.findAllActiveByOperation(PropertyOperation.RENT).stream()
                .filter(p -> p.getAgency().getId().equals(agencyId))
                .count();
        long saleCount = repository.findAllActiveByOperation(PropertyOperation.SALE).stream()
                .filter(p -> p.getAgency().getId().equals(agencyId))
                .count();
        assertThat(rentCount).isEqualTo(2);
        assertThat(saleCount).isEqualTo(1);
    }

    @Test
    void findsActivePropertyById() {
        long id = insertProperty(agencyId, "RENT", "ACTIVE");

        assertThat(repository.findActiveById(id)).isPresent();
    }

    @Test
    void returnsEmptyForInactiveProperty() {
        long id = insertProperty(agencyId, "RENT", "INACTIVE");

        assertThat(repository.findActiveById(id)).isEmpty();
    }

    @Test
    void returnsEmptyForNonExistentProperty() {
        assertThat(repository.findActiveById(999_999L)).isEmpty();
    }

    @Test
    void returnsNullLatitudeAndLongitudeForPropertyWithoutCoordinates() {
        long id = insertPropertyWithoutCoordinates(agencyId);

        Property property = repository.findActiveById(id).orElseThrow();
        assertThat(property.getLatitude()).isNull();
        assertThat(property.getLongitude()).isNull();
    }

    private long insertProperty(long agencyId, String operation, String status) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    latitude, longitude, bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Test Property', ?, 'APARTMENT', 1000, 'Gràcia', 'Carrer de Test 1',
                    41.4036, 2.1566, 2, 70, 'A test property.', true, ?)
                RETURNING id
                """, Long.class, agencyId, operation, status);
    }

    private long insertPropertyWithoutCoordinates(long agencyId) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'No Coordinates', 'RENT', 'APARTMENT', 1000, 'Gràcia', 'Carrer de Test 2',
                    2, 70, 'A property with no coordinates.', false, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
    }
}
