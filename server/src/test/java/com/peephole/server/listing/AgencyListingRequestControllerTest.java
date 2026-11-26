package com.peephole.server.listing;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgencyListingRequestControllerTest {

    private static final String PATH = "/api/agency/listing-requests";
    private static final String EMAIL = "marta.listing-test@peephole.example";
    private static final String PASSWORD = "Listing-test-password-1";
    private static final OffsetDateTime TIME = OffsetDateTime.parse("2099-03-10T09:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private int phoneVerifications;

    // Rolled back with the test: the demo data has its own listing requests
    @BeforeEach
    void startWithoutListingRequests() {
        jdbcTemplate.update("DELETE FROM message WHERE listing_request_id IS NOT NULL");
        jdbcTemplate.update("UPDATE property SET listing_request_id = NULL WHERE listing_request_id IS NOT NULL");
        jdbcTemplate.update("DELETE FROM listing_request");
        long agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, '+34600000001', true) RETURNING id",
                Long.class,
                "Listing Test Agency",
                "agency.listing-test@peephole.example");
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Marta Ruiz",
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                "AGENT");
    }

    // The list (D2)

    @Test
    void listsARequestInTheShapeOfTheSpec() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        list("").andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                // Contract: exactly the seven fields of the spec's example, in Madrid time
                .andExpect(jsonPath("$[0].length()").value(7))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].ownerName").value("Ana Torres"))
                .andExpect(jsonPath("$[0].title").value("Apartment in Gràcia"))
                .andExpect(jsonPath("$[0].operation").value("RENT"))
                .andExpect(jsonPath("$[0].priceEuros").value(1200))
                .andExpect(jsonPath("$[0].createdAt").value("2099-03-10T10:00:00+01:00"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void filtersTheRequestsByStatus() throws Exception {
        long pending = insertListingRequest("Ana Torres", "PENDING", TIME);
        long approved = insertListingRequest("Joan Puig", "APPROVED", TIME);
        long rejected = insertListingRequest("Laia Vidal", "REJECTED", TIME);

        list("?status=PENDING")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(pending));
        list("?status=APPROVED")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(approved));
        list("?status=REJECTED")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(rejected));
    }

    @Test
    void listsEveryStatusWithoutAFilterTheNewestFirst() throws Exception {
        long oldest = insertListingRequest("Joan Puig", "APPROVED", TIME.minusDays(2));
        long newest = insertListingRequest("Ana Torres", "PENDING", TIME);
        long middle = insertListingRequest("Laia Vidal", "REJECTED", TIME.minusDays(1));

        list("").andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(newest))
                .andExpect(jsonPath("$[1].id").value(middle))
                .andExpect(jsonPath("$[2].id").value(oldest));
    }

    @Test
    void rejectsAnUnknownStatus() throws Exception {
        list("?status=ARCHIVED")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void returnsAnEmptyListWhenThereAreNoRequests() throws Exception {
        list("").andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void listRequiresASignedInUser() throws Exception {
        mockMvc.perform(get(PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    private ResultActions list(String query) throws Exception {
        return mockMvc.perform(get(PATH + query).session(signIn()));
    }

    private MockHttpSession signIn() throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/agency/session")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }

    private long insertListingRequest(String ownerName, String status, OffsetDateTime createdAt) {
        return jdbcTemplate.queryForObject("""
            INSERT INTO listing_request (phone_verification_id, owner_full_name, owner_phone, title, description,
                property_type, operation, area, address, price_euros, bedrooms, size_m2, floor, status, created_at)
            VALUES (?, ?, '+34600000003', 'Apartment in Gràcia', 'A bright flat near the square', 'APARTMENT',
                'RENT', 'Gràcia', 'Carrer de Verdi 2', 1200, 3, 85, 2, ?, ?)
            RETURNING id
            """, Long.class, insertPhoneVerification(), ownerName, status, createdAt);
    }

    private long insertPhoneVerification() {
        phoneVerifications++;
        return jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, check_attempts)"
                        + " VALUES ('LISTING_REQUEST', ?, ?, 'VERIFIED', 1) RETURNING id",
                Long.class,
                "listing-test-hash-" + phoneVerifications,
                "listing-test-request-" + phoneVerifications);
    }
}
