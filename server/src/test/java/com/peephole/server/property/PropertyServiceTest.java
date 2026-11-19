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
class PropertyServiceTest {

    @Autowired
    private PropertyService service;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private long agencyId;

    @BeforeEach
    void insertAgency() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified)"
                        + " VALUES ('Overview Agency', 'overview@example.com', '+34600000000', true) RETURNING id",
                Long.class);
    }

    @Test
    void givesOtherFeaturesTheAgencyAndAddressOfAProperty() {
        long id = insertProperty("ACTIVE");

        assertThat(service.findOverview(id))
                .contains(new PropertyOverview(
                        id, agencyId, "Overview flat", "Gràcia", "Fictional overview address", true));
    }

    @Test
    void stillFindsAnInactivePropertyAndSaysSo() {
        long id = insertProperty("INACTIVE");

        assertThat(service.findOverview(id)).hasValueSatisfying(property -> {
            assertThat(property.active()).isFalse();
            assertThat(property.agencyId()).isEqualTo(agencyId);
        });
    }

    @Test
    void isEmptyForAPropertyThatDoesNotExist() {
        assertThat(service.findOverview(-1)).isEmpty();
    }

    private long insertProperty(String status) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Overview flat', 'RENT', 'APARTMENT', 950, 'Gràcia', 'Fictional overview address',
                    2, 70, 'A flat for the overview tests', true, ?)
                RETURNING id
                """, Long.class, agencyId, status);
    }
}
