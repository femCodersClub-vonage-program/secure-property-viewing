package com.peephole.server.property;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PropertyControllerTest {

    private static final String BASE_PATH = "/api/properties";

    @Autowired
    private MockMvc mockMvc;

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
    void returnsActivePropertiesWithoutFilter() throws Exception {
        int beforeCount = countActiveProperties();
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "SALE", "ACTIVE");

        mockMvc.perform(get(BASE_PATH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(beforeCount + 2));
    }

    @Test
    void filtersActivePropertiesByOperation() throws Exception {
        int beforeRentCount = countActivePropertiesByOperation("RENT");
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "SALE", "ACTIVE");

        mockMvc.perform(get(BASE_PATH).param("operation", "RENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(beforeRentCount + 1))
                .andExpect(jsonPath("$[0].operation").value("RENT"));
    }

    @Test
    void excludesInactivePropertiesFromCatalog() throws Exception {
        int beforeCount = countActiveProperties();
        insertProperty(agencyId, "RENT", "ACTIVE");
        insertProperty(agencyId, "RENT", "INACTIVE");

        mockMvc.perform(get(BASE_PATH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(beforeCount + 1));
    }

    @Test
    void returnsValidationFailedForUnknownOperation() throws Exception {
        mockMvc.perform(get(BASE_PATH).param("operation", "SWAP"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void returnsPropertyDetails() throws Exception {
        long id = insertPropertyWithFloor(agencyId, "SALE", "ACTIVE", 3);

        mockMvc.perform(get(BASE_PATH + "/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.operation").value("SALE"))
                .andExpect(jsonPath("$.propertyType").isString())
                .andExpect(jsonPath("$.floor").value(3))
                .andExpect(jsonPath("$.agency.verified").value(true));
    }

    @Test
    void returnsNotFoundForNonExistentProperty() throws Exception {
        mockMvc.perform(get(BASE_PATH + "/{id}", 999_999))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void returnsNotFoundForInactiveProperty() throws Exception {
        long id = insertProperty(agencyId, "RENT", "INACTIVE");

        mockMvc.perform(get(BASE_PATH + "/{id}", id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void returnsNullCoordinatesAndCoverImageForPropertyWithoutPhotosOrCoordinates() throws Exception {
        long id = insertPropertyWithoutCoordinates(agencyId);

        mockMvc.perform(get(BASE_PATH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].latitude")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].longitude")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].coverImage")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())));
    }

    @Test
    void contractMatchesSpecForCatalogEndpoint() throws Exception {
        long id = insertPropertyWithImage(agencyId, "RENT", "ACTIVE");

        ResultActions result =
                mockMvc.perform(get(BASE_PATH).param("operation", "RENT")).andExpect(status().isOk());

        String json = result.andReturn().getResponse().getContentAsString();
        assertThat(json).contains("\"id\"");
        assertThat(json).contains("\"title\"");
        assertThat(json).contains("\"operation\"");
        assertThat(json).contains("\"priceEuros\"");
        assertThat(json).contains("\"area\"");
        assertThat(json).contains("\"bedrooms\"");
        assertThat(json).contains("\"sizeM2\"");
        assertThat(json).contains("\"latitude\"");
        assertThat(json).contains("\"longitude\"");
        assertThat(json).contains("\"coverImage\"");
        assertThat(json).contains("\"agency\"");
        assertThat(json).contains("\"verified\"");
    }

    @Test
    void contractMatchesSpecForDetailsEndpoint() throws Exception {
        long id = insertPropertyWithImage(agencyId, "RENT", "ACTIVE");

        ResultActions result = mockMvc.perform(get(BASE_PATH + "/{id}", id)).andExpect(status().isOk());

        String json = result.andReturn().getResponse().getContentAsString();
        assertThat(json).contains("\"propertyType\"");
        assertThat(json).contains("\"description\"");
        assertThat(json).contains("\"videoVisitAvailable\"");
        assertThat(json).contains("\"images\"");
        assertThat(json).contains("\"altText\"");
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

    private long insertPropertyWithFloor(long agencyId, String operation, String status, int floor) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    latitude, longitude, bedrooms, size_m2, floor, description, video_visit_available, status)
                VALUES (?, 'Test Property', ?, 'APARTMENT', 1000, 'Gràcia', 'Carrer de Test 1',
                    41.4036, 2.1566, 2, 70, ?, 'A test property.', true, ?)
                RETURNING id
                """, Long.class, agencyId, operation, floor, status);
    }

    private long insertPropertyWithoutCoordinates(long agencyId) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'No Coordinates', 'RENT', 'APARTMENT', 1000, 'Gràcia', 'Carrer de Test 2',
                    2, 70, 'No coords.', false, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
    }

    private long insertPropertyWithImage(long agencyId, String operation, String status) {
        long id = insertProperty(agencyId, operation, status);
        jdbcTemplate.update(
                "INSERT INTO property_image (property_id, url, alt_text, position) VALUES (?, 'https://example.com/img.jpg', 'A bright living room', 1)",
                id);
        return id;
    }

    private int countActiveProperties() {
        Integer count =
                jdbcTemplate.queryForObject("SELECT COUNT(*) FROM property WHERE status = 'ACTIVE'", Integer.class);
        return count != null ? count : 0;
    }

    private int countActivePropertiesByOperation(String operation) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM property WHERE status = 'ACTIVE' AND operation = ?", Integer.class, operation);
        return count != null ? count : 0;
    }
}
