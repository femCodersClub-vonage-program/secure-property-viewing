package com.peephole.server.agency;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgencyDashboardControllerTest {

    private static final OffsetDateTime NOW = OffsetDateTime.parse("2099-03-10T10:00:00+01:00");
    private static final String EMAIL = "marta.dashboard-test@peephole.example";
    private static final String PASSWORD = "Dashboard-test-password-1";

    @TestBean
    private Clock clock;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private long agencyId;
    private int phoneVerifications;

    static Clock clock() {
        return Clock.fixed(NOW.toInstant(), ZoneId.of("Europe/Madrid"));
    }

    @BeforeEach
    void createAgencyAndAgent() {
        agencyId = insertAgency("Dashboard Test Agency");
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Marta Ruiz",
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                "AGENT");
    }

    @Test
    void returnsTheSummaryInTheShapeOfTheSpec() throws Exception {
        long pendingBefore = countPendingListingRequests();
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        long visit = insertVisit(property, NOW.plusHours(1), "CONFIRMED", "Laura Gómez");
        insertListingRequest("PENDING");

        mockMvc.perform(get("/api/agency/summary").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.agentName").value("Marta Ruiz"))
                .andExpect(jsonPath("$.newRequests").value(pendingBefore + 1))
                .andExpect(jsonPath("$.upcomingVisits").value(1))
                .andExpect(jsonPath("$.activeProperties").value(1))
                .andExpect(jsonPath("$.nextVisits.length()").value(1))
                .andExpect(jsonPath("$.nextVisits[0].visitId").value(visit))
                .andExpect(jsonPath("$.nextVisits[0].startsAt").value("2099-03-10T11:00:00+01:00"))
                .andExpect(jsonPath("$.nextVisits[0].visitorName").value("Laura Gómez"))
                .andExpect(jsonPath("$.nextVisits[0].propertyTitle").value("Apartment in Gràcia"));
    }

    @Test
    void countsOnlyPendingListingRequests() throws Exception {
        long pendingBefore = countPendingListingRequests();
        insertListingRequest("PENDING");
        insertListingRequest("PENDING");
        insertListingRequest("APPROVED");
        insertListingRequest("REJECTED");

        mockMvc.perform(get("/api/agency/summary").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.newRequests").value(pendingBefore + 2));
    }

    @Test
    void countsOnlyTheActivePropertiesOfTheAgency() throws Exception {
        insertProperty(agencyId, "Active 1", "ACTIVE");
        insertProperty(agencyId, "Active 2", "ACTIVE");
        insertProperty(agencyId, "Inactive", "INACTIVE");
        insertProperty(insertAgency("Other Agency"), "Active elsewhere", "ACTIVE");

        mockMvc.perform(get("/api/agency/summary").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeProperties").value(2));
    }

    @Test
    void countsOnlyConfirmedVisitsOfTheAgencyInTheNextSevenDays() throws Exception {
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        insertVisit(property, NOW.plusHours(1), "CONFIRMED", "Visitor 1");
        insertVisit(property, NOW.plus(Duration.ofDays(7)).minusMinutes(1), "CONFIRMED", "Visitor 2");
        insertVisit(property, NOW.plusDays(7), "CONFIRMED", "Visitor 3");
        insertVisit(property, NOW.minusHours(1), "CONFIRMED", "Visitor 4");
        insertVisit(property, NOW.plusDays(1), "CANCELED", "Visitor 5");
        long otherProperty = insertProperty(insertAgency("Other Agency"), "Elsewhere", "ACTIVE");
        insertVisit(otherProperty, NOW.plusDays(1), "CONFIRMED", "Visitor 6");

        mockMvc.perform(get("/api/agency/summary").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.upcomingVisits").value(2));
    }

    @Test
    void listsTheNextFiveConfirmedVisitsInOrder() throws Exception {
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        insertVisit(property, NOW.plusDays(9), "CONFIRMED", "Sixth");
        insertVisit(property, NOW.plusDays(3), "CONFIRMED", "Third");
        insertVisit(property, NOW.plusHours(2), "CONFIRMED", "First");
        insertVisit(property, NOW.plusDays(8), "CONFIRMED", "Fifth");
        insertVisit(property, NOW.plusDays(1), "CONFIRMED", "Second");
        insertVisit(property, NOW.plusDays(4), "CONFIRMED", "Fourth");
        insertVisit(property, NOW.plusDays(2), "CANCELED", "Canceled");
        insertVisit(property, NOW.minusHours(1), "CONFIRMED", "Past");

        mockMvc.perform(get("/api/agency/summary").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextVisits.length()").value(5))
                .andExpect(jsonPath("$.nextVisits[0].visitorName").value("First"))
                .andExpect(jsonPath("$.nextVisits[1].visitorName").value("Second"))
                .andExpect(jsonPath("$.nextVisits[2].visitorName").value("Third"))
                .andExpect(jsonPath("$.nextVisits[3].visitorName").value("Fourth"))
                .andExpect(jsonPath("$.nextVisits[4].visitorName").value("Fifth"));
    }

    @Test
    void requiresASignedInUserForTheSummary() throws Exception {
        mockMvc.perform(get("/api/agency/summary"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void returnsTheVisitsInTheShapeOfTheSpec() throws Exception {
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        long visit = insertVisit(property, NOW.plusDays(1), "CONFIRMED", "Laura Gómez");

        mockMvc.perform(get("/api/agency/visits?from=2099-03-09&to=2099-03-15").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].visitId").value(visit))
                .andExpect(jsonPath("$[0].startsAt").value("2099-03-11T10:00:00+01:00"))
                .andExpect(jsonPath("$[0].endsAt").value("2099-03-11T10:30:00+01:00"))
                .andExpect(jsonPath("$[0].visitorName").value("Laura Gómez"))
                .andExpect(jsonPath("$[0].propertyTitle").value("Apartment in Gràcia"))
                .andExpect(jsonPath("$[0].status").value("CONFIRMED"));
    }

    @Test
    void includesBothDaysOfTheRangeInMadridTimeInAWeekWithAClockChange() throws Exception {
        // On 2099-03-29 the clocks in Madrid go forward, so the last day starts at +01:00 and ends at +02:00
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        insertVisit(property, OffsetDateTime.parse("2099-03-22T23:30:00+01:00"), "CONFIRMED", "Day before");
        insertVisit(property, OffsetDateTime.parse("2099-03-23T00:00:00+01:00"), "CONFIRMED", "First day");
        insertVisit(property, OffsetDateTime.parse("2099-03-29T23:30:00+02:00"), "CONFIRMED", "Last day");
        insertVisit(property, OffsetDateTime.parse("2099-03-30T00:00:00+02:00"), "CONFIRMED", "Day after");

        mockMvc.perform(get("/api/agency/visits?from=2099-03-23&to=2099-03-29").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].visitorName").value("First day"))
                .andExpect(jsonPath("$[1].visitorName").value("Last day"))
                .andExpect(jsonPath("$[1].startsAt").value("2099-03-29T23:30:00+02:00"));
    }

    @Test
    void listsEveryStatusOfTheAgencyOrderedByStartTime() throws Exception {
        long property = insertProperty(agencyId, "Apartment in Gràcia", "ACTIVE");
        insertVisit(property, NOW.plusDays(2), "COMPLETED", "Third");
        insertVisit(property, NOW.plusHours(1), "CONFIRMED", "First");
        insertVisit(property, NOW.plusDays(1), "CANCELED", "Second");
        long otherProperty = insertProperty(insertAgency("Other Agency"), "Elsewhere", "ACTIVE");
        insertVisit(otherProperty, NOW.plusDays(1), "CONFIRMED", "Other agency");

        mockMvc.perform(get("/api/agency/visits?from=2099-03-09&to=2099-03-15").session(signIn()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].visitorName").value("First"))
                .andExpect(jsonPath("$[1].visitorName").value("Second"))
                .andExpect(jsonPath("$[1].status").value("CANCELED"))
                .andExpect(jsonPath("$[2].visitorName").value("Third"))
                .andExpect(jsonPath("$[2].status").value("COMPLETED"));
    }

    @Test
    void acceptsARangeOfThirtyOneDays() throws Exception {
        mockMvc.perform(get("/api/agency/visits?from=2099-03-01&to=2099-03-31").session(signIn()))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @CsvSource({
        "to=2099-03-15, from",
        "from=2099-03-09, to",
        "from=2099-3-9&to=2099-03-15, from",
        "from=2099-03-15&to=2099-03-09, to",
        "from=2099-03-01&to=2099-04-01, to"
    })
    void rejectsAWrongRange(String query, String field) throws Exception {
        mockMvc.perform(get("/api/agency/visits?" + query).session(signIn()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors." + field).exists());
    }

    @Test
    void requiresASignedInUserForTheVisits() throws Exception {
        mockMvc.perform(get("/api/agency/visits?from=2099-03-09&to=2099-03-15"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
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

    private long insertAgency(String name) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                name,
                "agency.dashboard-test@peephole.example",
                "+34600000001");
    }

    private long insertProperty(long ownerAgencyId, String title, String status) {
        return jdbcTemplate.queryForObject("""
            INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address, bedrooms,
                size_m2, description, video_visit_available, status)
            VALUES (?, ?, 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Carrer de Verdi 1', 2, 70, 'Test property', true, ?)
            RETURNING id
            """, Long.class, ownerAgencyId, title, status);
    }

    private long insertVisit(long propertyId, OffsetDateTime startsAt, String status, String visitorName) {
        long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                startsAt,
                startsAt.plusMinutes(30));
        return jdbcTemplate.queryForObject(
                """
            INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone, status)
            VALUES (?, ?, ?, ?, '+34600000002', ?)
            RETURNING id
            """, Long.class, propertyId, slotId, insertPhoneVerification("VISIT"), visitorName, status);
    }

    private void insertListingRequest(String status) {
        jdbcTemplate.update("""
            INSERT INTO listing_request (phone_verification_id, owner_full_name, owner_phone, title, description,
                property_type, operation, area, address, price_euros, bedrooms, size_m2, status)
            VALUES (?, 'Ana Torres', '+34600000003', 'Flat for the test', 'Test request', 'APARTMENT', 'RENT',
                'Gràcia', 'Carrer de Verdi 2', 1100, 2, 65, ?)
            """, insertPhoneVerification("LISTING_REQUEST"), status);
    }

    private long insertPhoneVerification(String purpose) {
        phoneVerifications++;
        return jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, check_attempts)"
                        + " VALUES (?, ?, ?, 'VERIFIED', 1) RETURNING id",
                Long.class,
                purpose,
                "dashboard-test-hash-" + phoneVerifications,
                "dashboard-test-request-" + phoneVerifications);
    }

    private long countPendingListingRequests() {
        return jdbcTemplate.queryForObject("SELECT count(*) FROM listing_request WHERE status = 'PENDING'", Long.class);
    }
}
