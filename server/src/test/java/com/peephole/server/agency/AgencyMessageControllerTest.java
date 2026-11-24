package com.peephole.server.agency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.agency.dto.AgencyMessageResponse;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
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
@ExtendWith(OutputCaptureExtension.class)
class AgencyMessageControllerTest {

    private static final String PATH = "/api/agency/messages";
    private static final String EMAIL = "marta.messages-test@peephole.example";
    private static final String PASSWORD = "Messages-test-password-1";
    private static final OffsetDateTime TIME = OffsetDateTime.parse("2099-03-10T09:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private long agencyId;
    private int phoneVerifications;

    // Rolled back with the test: the demo data has messages about listing requests, which every agency sees
    @BeforeEach
    void startWithoutMessages() {
        jdbcTemplate.update("DELETE FROM message");
        agencyId = insertAgency("Messages Test Agency");
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Marta Ruiz",
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                "AGENT");
    }

    @Test
    void returnsAMessageAboutAVisitInTheShapeOfTheSpec() throws Exception {
        long visit = insertVisit(agencyId, "Laura Gómez");
        long message = insertMessage(visit, null, "CONFIRMATION", "DELIVERED", TIME, TIME.plusSeconds(5));

        list().andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                // Contract: exactly the nine fields of the spec's example, in Madrid time
                .andExpect(jsonPath("$[0].length()").value(9))
                .andExpect(jsonPath("$[0].id").value(message))
                .andExpect(jsonPath("$[0].type").value("CONFIRMATION"))
                .andExpect(jsonPath("$[0].channel").value("SMS"))
                .andExpect(jsonPath("$[0].recipientName").value("Laura Gómez"))
                .andExpect(jsonPath("$[0].visitId").value(visit))
                .andExpect(jsonPath("$[0].listingRequestId").isEmpty())
                .andExpect(jsonPath("$[0].scheduledAt").value("2099-03-10T10:00:00+01:00"))
                .andExpect(jsonPath("$[0].updatedAt").value("2099-03-10T10:00:05+01:00"))
                .andExpect(jsonPath("$[0].status").value("DELIVERED"));
    }

    @Test
    void returnsAMessageAboutAListingRequest() throws Exception {
        long request = insertListingRequest("Ana Torres");
        insertMessage(null, request, "CONFIRMATION", "FAILED", TIME, TIME);

        list().andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].length()").value(9))
                .andExpect(jsonPath("$[0].type").value("CONFIRMATION"))
                .andExpect(jsonPath("$[0].recipientName").value("Ana Torres"))
                .andExpect(jsonPath("$[0].visitId").isEmpty())
                .andExpect(jsonPath("$[0].listingRequestId").value(request))
                .andExpect(jsonPath("$[0].status").value("FAILED"));
    }

    @Test
    void showsTheTimesOfSummerInMadridTime() throws Exception {
        OffsetDateTime summer = OffsetDateTime.parse("2099-07-10T09:00:00Z");
        insertMessage(insertVisit(agencyId, "Laura Gómez"), null, "CONFIRMATION", "DELIVERED", summer, summer);

        list().andExpect(status().isOk())
                .andExpect(jsonPath("$[0].scheduledAt").value("2099-07-10T11:00:00+02:00"))
                .andExpect(jsonPath("$[0].updatedAt").value("2099-07-10T11:00:00+02:00"));
    }

    @Test
    void neverReturnsOrLogsPhoneNumbers(CapturedOutput output) throws Exception {
        insertMessage(insertVisit(agencyId, "Laura Gómez"), null, "CONFIRMATION", "DELIVERED", TIME, TIME);
        insertMessage(null, insertListingRequest("Ana Torres"), "CONFIRMATION", "DELIVERED", TIME, TIME);

        String body = list().andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertThat(body).doesNotContain("600000002", "600000003");
        assertThat(output).doesNotContain("600000002", "600000003");
    }

    @Test
    void listsTheLastUpdatedFirstAndTheLastCreatedFirstAtTheSameTime() throws Exception {
        long visit = insertVisit(agencyId, "Laura Gómez");
        long middle = insertMessage(visit, null, "CONFIRMATION", "SUBMITTED", TIME, TIME);
        // Scheduled for much later, but not touched since yesterday
        long oldest = insertMessage(visit, null, "REMINDER", "SCHEDULED", TIME.plusDays(30), TIME.minusDays(1));
        long newest = insertMessage(visit, null, "CONFIRMATION", "DELIVERED", TIME.minusDays(2), TIME.plusDays(1));
        long sameTime =
                insertMessage(null, insertListingRequest("Ana Torres"), "CONFIRMATION", "DELIVERED", TIME, TIME);

        list().andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andExpect(jsonPath("$[0].id").value(newest))
                .andExpect(jsonPath("$[1].id").value(sameTime))
                .andExpect(jsonPath("$[2].id").value(middle))
                .andExpect(jsonPath("$[3].id").value(oldest));
    }

    @Test
    void leavesOutTheVisitsOfAnotherAgency() throws Exception {
        insertMessage(
                insertVisit(insertAgency("Other Agency"), "Elsewhere"), null, "CONFIRMATION", "DELIVERED", TIME, TIME);
        insertMessage(insertVisit(agencyId, "Laura Gómez"), null, "CONFIRMATION", "DELIVERED", TIME, TIME);

        list().andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].recipientName").value("Laura Gómez"));
    }

    @Test
    void returnsAnEmptyListWhenThereAreNoMessages() throws Exception {
        list().andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void requiresASignedInUser() throws Exception {
        mockMvc.perform(get(PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void neverPrintsTheNameOfTheRecipient() {
        AgencyMessageResponse message =
                new AgencyMessageResponse(7, "CONFIRMATION", "SMS", "Laura Gómez", 31L, null, TIME, TIME, "DELIVERED");

        assertThat(message.toString()).doesNotContain("Laura");
    }

    private ResultActions list() throws Exception {
        return mockMvc.perform(get(PATH).session(signIn()));
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

    private long insertMessage(
            Long visitId,
            Long listingRequestId,
            String type,
            String status,
            OffsetDateTime scheduledAt,
            OffsetDateTime updatedAt) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO message (visit_id, listing_request_id, type, channel, status, scheduled_at, updated_at)"
                        + " VALUES (?, ?, ?, 'SMS', ?, ?, ?) RETURNING id",
                Long.class,
                visitId,
                listingRequestId,
                type,
                status,
                scheduledAt,
                updatedAt);
    }

    private long insertAgency(String name) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, '+34600000001', true) RETURNING id",
                Long.class,
                name,
                "agency.messages-test@peephole.example");
    }

    private long insertVisit(long ownerAgencyId, String visitorName) {
        long propertyId = jdbcTemplate.queryForObject("""
            INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address, bedrooms,
                size_m2, description, video_visit_available, status)
            VALUES (?, 'Apartment in Gràcia', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Carrer de Verdi 1', 2, 70,
                'Test property', true, 'ACTIVE')
            RETURNING id
            """, Long.class, ownerAgencyId);
        long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                TIME,
                TIME.plusMinutes(30));
        return jdbcTemplate.queryForObject(
                """
            INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone, status)
            VALUES (?, ?, ?, ?, '+34600000002', 'CONFIRMED')
            RETURNING id
            """, Long.class, propertyId, slotId, insertPhoneVerification("VISIT"), visitorName);
    }

    private long insertListingRequest(String ownerName) {
        return jdbcTemplate.queryForObject("""
            INSERT INTO listing_request (phone_verification_id, owner_full_name, owner_phone, title, description,
                property_type, operation, area, address, price_euros, bedrooms, size_m2, status)
            VALUES (?, ?, '+34600000003', 'Flat for the test', 'Test request', 'APARTMENT', 'RENT',
                'Gràcia', 'Carrer de Verdi 2', 1100, 2, 65, 'PENDING')
            RETURNING id
            """, Long.class, insertPhoneVerification("LISTING_REQUEST"), ownerName);
    }

    private long insertPhoneVerification(String purpose) {
        phoneVerifications++;
        return jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, check_attempts)"
                        + " VALUES (?, ?, ?, 'VERIFIED', 1) RETURNING id",
                Long.class,
                purpose,
                "messages-test-hash-" + phoneVerifications,
                "messages-test-request-" + phoneVerifications);
    }
}
