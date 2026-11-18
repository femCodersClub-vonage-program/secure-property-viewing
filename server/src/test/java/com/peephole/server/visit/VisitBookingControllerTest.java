package com.peephole.server.visit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.peephole.server.phoneverification.PhoneVerificationService;
import com.peephole.server.vonage.CodeCheckResult;
import com.peephole.server.vonage.PhoneVerifier;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class VisitBookingControllerTest {

    private static final String PHONE = "+34611222333";
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2099-01-01T13:00:00+01:00");
    private static final OffsetDateTime SLOT_START = OffsetDateTime.parse("2099-01-01T15:00:00+01:00");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    private long agencyId;
    private long propertyId;
    private final List<Long> verificationIds = new ArrayList<>();

    @BeforeEach
    void createActiveProperty() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Visit Booking Test Agency",
                "visit-booking-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
        propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Bright test flat', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for visit booking tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
        when(phoneVerifier.start(any())).thenAnswer(invocation -> "visit-booking-" + UUID.randomUUID());
        when(phoneVerifier.check(any(), any())).thenReturn(CodeCheckResult.MATCHED);
    }

    @AfterEach
    void cleanUpFixtures() {
        jdbcTemplate.update("DELETE FROM visit WHERE property_id = ?", propertyId);
        jdbcTemplate.update("DELETE FROM visit_slot WHERE property_id = ?", propertyId);
        verificationIds.forEach(id -> jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", id));
        jdbcTemplate.update("DELETE FROM property WHERE id = ?", propertyId);
        jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
    }

    @Test
    void listsOnlyAvailableSlotsInTheInclusiveMadridDateRange() throws Exception {
        long later = slot(SLOT_START.plusHours(1), "AVAILABLE");
        long earlier = slot(SLOT_START, "AVAILABLE");
        slot(NOW.minusMinutes(1), "AVAILABLE");
        slot(SLOT_START.plusDays(1), "BOOKED");
        slot(SLOT_START.plusDays(15), "AVAILABLE");

        mockMvc.perform(get("/api/properties/{id}/slots", propertyId)
                        .param("from", "2099-01-01")
                        .param("to", "2099-01-02"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(earlier))
                .andExpect(jsonPath("$[0].startsAt").value("2099-01-01T15:00:00+01:00"))
                .andExpect(jsonPath("$[0].endsAt").value("2099-01-01T15:30:00+01:00"))
                .andExpect(jsonPath("$[1].id").value(later))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void clampsTheDefaultAndRequestedRangeAndRejectsAnInvalidRange() throws Exception {
        long today = slot(SLOT_START, "AVAILABLE");
        long lastAllowed = slot(SLOT_START.plusDays(14), "AVAILABLE");
        slot(SLOT_START.plusDays(15), "AVAILABLE");

        mockMvc.perform(get("/api/properties/{id}/slots", propertyId)
                        .param("from", "2098-12-01")
                        .param("to", "2099-02-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(today))
                .andExpect(jsonPath("$[1].id").value(lastAllowed))
                .andExpect(jsonPath("$.length()").value(2));

        mockMvc.perform(get("/api/properties/{id}/slots", propertyId)
                        .param("from", "2099-01-03")
                        .param("to", "2099-01-02"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));

        mockMvc.perform(get("/api/properties/{id}/slots", propertyId).param("from", "not-a-date"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    @Test
    void returnsNotFoundForMissingOrInactiveProperties() throws Exception {
        mockMvc.perform(get("/api/properties/{id}/slots", Long.MAX_VALUE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));

        jdbcTemplate.update("UPDATE property SET status = 'INACTIVE' WHERE id = ?", propertyId);
        mockMvc.perform(get("/api/properties/{id}/slots", propertyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void booksTheVisitAndReturnsTheExactConfirmationContract() throws Exception {
        long slotId = slot(SLOT_START, "AVAILABLE");
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "VISIT", PHONE);

        String body = book(session, bookingBody(slotId, "Laura Gómez", PHONE, verificationId))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Map<String, Object> response = JsonPath.read(body, "$");
        assertThat(response).containsOnlyKeys("visitId", "startsAt", "endsAt", "visitorName", "property");
        assertThat(response)
                .containsEntry("startsAt", "2099-01-01T15:00:00+01:00")
                .containsEntry("endsAt", "2099-01-01T15:30:00+01:00")
                .containsEntry("visitorName", "Laura Gómez");
        assertThat(response.get("property"))
                .isEqualTo(Map.of(
                        "title", "Bright test flat",
                        "area", "Gràcia",
                        "address", "Fictional test address"));

        Long visitId = ((Number) response.get("visitId")).longValue();
        assertThat(session.getAttribute(SessionVisits.ATTRIBUTE)).isEqualTo(Set.of(visitId));
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM visit_slot WHERE id = ?", String.class, slotId))
                .isEqualTo("BOOKED");
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM visit WHERE id = ?", String.class, visitId))
                .isEqualTo("CONFIRMED");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT phone_verification_id FROM visit WHERE id = ?", Long.class, visitId))
                .isEqualTo(verificationId);
    }

    @Test
    void returnsNotFoundForAnUnknownSlotAndConflictWhenASlotCannotBeBooked() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "VISIT", PHONE);
        String body = bookingBody(Long.MAX_VALUE, "Laura", PHONE, verificationId);
        expectProblem(book(session, body), 404, "NOT_FOUND");

        long startedSlot = slot(NOW, "AVAILABLE");
        expectProblem(book(session, bookingBody(startedSlot, "Laura", PHONE, verificationId)), 409, "SLOT_UNAVAILABLE");

        long inactivePropertySlot = slot(SLOT_START, "AVAILABLE");
        jdbcTemplate.update("UPDATE property SET status = 'INACTIVE' WHERE id = ?", propertyId);
        expectProblem(
                book(session, bookingBody(inactivePropertySlot, "Laura", PHONE, verificationId)),
                409,
                "SLOT_UNAVAILABLE");
    }

    @Test
    void aRejectedBookingDoesNotConsumeThePhoneVerification() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "VISIT", PHONE);
        long unavailableSlot = slot(SLOT_START, "BOOKED");
        expectProblem(
                book(session, bookingBody(unavailableSlot, "Laura", PHONE, verificationId)), 409, "SLOT_UNAVAILABLE");

        long availableSlot = slot(SLOT_START.plusHours(1), "AVAILABLE");
        book(session, bookingBody(availableSlot, "Laura", PHONE, verificationId))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsPhoneVerificationsThatFailAnyBookingRule() throws Exception {
        MockHttpSession goodSession = new MockHttpSession();
        long otherBrowser = verifiedPhone(goodSession, "VISIT", "+34611222331");
        expectProblem(
                book(
                        new MockHttpSession(),
                        bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34611222331", otherBrowser)),
                422,
                "PHONE_VERIFICATION_INVALID");

        MockHttpSession pendingSession = new MockHttpSession();
        long pending = startedPhone(pendingSession, "VISIT", "+34611222332");
        expectProblem(
                book(pendingSession, bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34611222332", pending)),
                422,
                "PHONE_VERIFICATION_INVALID");

        MockHttpSession wrongPurposeSession = new MockHttpSession();
        long wrongPurpose = verifiedPhone(wrongPurposeSession, "LISTING_REQUEST", "+34611222333");
        expectProblem(
                book(
                        wrongPurposeSession,
                        bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34611222333", wrongPurpose)),
                422,
                "PHONE_VERIFICATION_INVALID");

        MockHttpSession wrongPhoneSession = new MockHttpSession();
        long wrongPhone = verifiedPhone(wrongPhoneSession, "VISIT", "+34611222334");
        expectProblem(
                book(
                        wrongPhoneSession,
                        bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34619999999", wrongPhone)),
                422,
                "PHONE_VERIFICATION_INVALID");

        MockHttpSession expiredSession = new MockHttpSession();
        long expired = verifiedPhone(expiredSession, "VISIT", "+34611222335");
        jdbcTemplate.update(
                "UPDATE phone_verification SET verified_at = ? WHERE id = ?", NOW.minusMinutes(30), expired);
        expectProblem(
                book(expiredSession, bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34611222335", expired)),
                422,
                "PHONE_VERIFICATION_INVALID");

        MockHttpSession usedSession = new MockHttpSession();
        long used = verifiedPhone(usedSession, "VISIT", "+34611222336");
        book(usedSession, bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", "+34611222336", used))
                .andExpect(status().isCreated());
        expectProblem(
                book(
                        usedSession,
                        bookingBody(slot(SLOT_START.plusHours(1), "AVAILABLE"), "Laura", "+34611222336", used)),
                422,
                "PHONE_VERIFICATION_INVALID");
    }

    @Test
    void onlyOneConcurrentRequestCanBookTheSameSlot() throws Exception {
        long slotId = slot(SLOT_START, "AVAILABLE");
        MockHttpSession firstSession = new MockHttpSession();
        long firstVerificationId = verifiedPhone(firstSession, "VISIT", "+34611222337");
        MockHttpSession secondSession = new MockHttpSession();
        long secondVerificationId = verifiedPhone(secondSession, "VISIT", "+34611222338");
        CountDownLatch startTogether = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        List<Future<Integer>> results = new ArrayList<>();

        List<MockHttpSession> sessions = List.of(firstSession, secondSession);
        List<Long> bookingVerificationIds = List.of(firstVerificationId, secondVerificationId);
        List<String> phones = List.of("+34611222337", "+34611222338");
        for (int i = 0; i < sessions.size(); i++) {
            MockHttpSession session = sessions.get(i);
            long verificationId = bookingVerificationIds.get(i);
            String phone = phones.get(i);
            results.add(executor.submit(() -> {
                startTogether.await();
                return book(session, bookingBody(slotId, "Laura", phone, verificationId))
                        .andReturn()
                        .getResponse()
                        .getStatus();
            }));
        }
        startTogether.countDown();
        List<Integer> statuses = new ArrayList<>();
        try {
            for (Future<Integer> result : results) {
                statuses.add(result.get(30, TimeUnit.SECONDS));
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(statuses).containsExactlyInAnyOrder(201, 409);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM visit WHERE visit_slot_id = ?", Integer.class, slotId))
                .isEqualTo(1);
        assertThat(jdbcTemplate.queryForObject("SELECT status FROM visit_slot WHERE id = ?", String.class, slotId))
                .isEqualTo("BOOKED");
    }

    @Test
    void rejectsMissingFieldsInvalidValuesAndRequestsWithoutCsrf() throws Exception {
        mockMvc.perform(post("/api/visits")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.slotId").exists())
                .andExpect(jsonPath("$.errors.visitorName").exists())
                .andExpect(jsonPath("$.errors.phone").exists())
                .andExpect(jsonPath("$.errors.phoneVerificationId").exists());

        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "VISIT", PHONE);
        mockMvc.perform(post("/api/visits")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(slot(SLOT_START, "AVAILABLE"), "Laura", PHONE, verificationId)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/visits")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(bookingBody(slot(SLOT_START, "AVAILABLE"), "  ", "600000000", verificationId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    private long slot(OffsetDateTime startsAt, String status) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, ?) RETURNING id",
                Long.class,
                propertyId,
                startsAt,
                startsAt.plusMinutes(30),
                status);
    }

    private long verifiedPhone(MockHttpSession session, String purpose, String phone) throws Exception {
        long id = startedPhone(session, purpose, phone);
        mockMvc.perform(post("/api/phone-verifications/{id}/check", id)
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"482931\"}"))
                .andExpect(status().isOk());
        return id;
    }

    private long startedPhone(MockHttpSession session, String purpose, String phone) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/phone-verifications")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phone\":\"" + phone + "\",\"purpose\":\"" + purpose + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        long id = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
        assertThat(session.getAttribute(PhoneVerificationService.SESSION_ATTRIBUTE))
                .isEqualTo(id);
        verificationIds.add(id);
        return id;
    }

    private org.springframework.test.web.servlet.ResultActions book(MockHttpSession session, String body)
            throws Exception {
        return mockMvc.perform(post("/api/visits")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private static String bookingBody(long slotId, String name, String phone, long verificationId) {
        return "{\"slotId\":"
                + slotId
                + ",\"visitorName\":\""
                + name
                + "\",\"phone\":\""
                + phone
                + "\",\"phoneVerificationId\":"
                + verificationId
                + "}";
    }

    private static void expectProblem(
            org.springframework.test.web.servlet.ResultActions result, int statusCode, String code) throws Exception {
        result.andExpect(status().is(statusCode)).andExpect(jsonPath("$.code").value(code));
    }
}
