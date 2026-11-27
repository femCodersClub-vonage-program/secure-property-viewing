package com.peephole.server.listing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
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
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.ObjectMapper;

// Not @Transactional: the concurrency test needs real commits, so each test deletes its own rows
@SpringBootTest
@AutoConfigureMockMvc
@ExtendWith(OutputCaptureExtension.class)
class ListingRequestControllerTest {

    private static final String PHONE = "+34612987654";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private PhoneVerifier phoneVerifier;

    @MockitoSpyBean
    private ListingRequestRepository listingRequests;

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2099-01-01T12:00:00Z"), ZoneOffset.UTC);
    }

    private final List<Long> verificationIds = new ArrayList<>();
    private Long agencyId;

    @BeforeEach
    void answerLikeVonage() {
        when(phoneVerifier.start(any())).thenAnswer(invocation -> "listing-request-" + UUID.randomUUID());
        when(phoneVerifier.check(any(), any())).thenReturn(CodeCheckResult.MATCHED);
    }

    @AfterEach
    void cleanUpFixtures() {
        if (agencyId != null) {
            jdbcTemplate.update("DELETE FROM agency_user WHERE agency_id = ?", agencyId);
            jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
        }
        verificationIds.forEach(id -> {
            jdbcTemplate.update(
                    "DELETE FROM message WHERE listing_request_id IN"
                            + " (SELECT id FROM listing_request WHERE phone_verification_id = ?)",
                    id);
            jdbcTemplate.update("DELETE FROM listing_request WHERE phone_verification_id = ?", id);
            jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", id);
        });
    }

    @Test
    void savesThePendingRequestAndAnswersTheExactContractOfTheSpec() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);

        String body = submit(session, requestFromSpec(verificationId))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        Map<String, Object> response = JsonPath.read(body, "$");
        assertThat(response).containsOnlyKeys("id", "status").containsEntry("status", "PENDING");
        long id = ((Number) response.get("id")).longValue();
        Map<String, Object> saved = jdbcTemplate.queryForMap("SELECT * FROM listing_request WHERE id = ?", id);
        assertThat(saved)
                .containsEntry("phone_verification_id", verificationId)
                .containsEntry("owner_full_name", "Ana Torres")
                .containsEntry("owner_phone", PHONE)
                .containsEntry("title", "Apartment in Gràcia")
                .containsEntry("description", "Bright apartment near the square")
                .containsEntry("property_type", "APARTMENT")
                .containsEntry("operation", "RENT")
                .containsEntry("area", "Gràcia")
                .containsEntry("address", "Carrer de Verdi, 123")
                .containsEntry("price_euros", 1200)
                .containsEntry("bedrooms", 3)
                .containsEntry("size_m2", 85)
                .containsEntry("floor", 2)
                .containsEntry("status", "PENDING")
                .containsEntry("reviewed_by", null)
                .containsEntry("rejection_reason", null)
                .containsEntry("reviewed_at", null);
    }

    // The SMS is only saved here, so sending it later can never undo the request (specs/messages.md)
    @Test
    void schedulesTheRequestReceivedSmsWithTheRequest() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);

        String body = submit(session, requestFromSpec(verificationId))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long id = ((Number) JsonPath.read(body, "$.id")).longValue();
        assertThat(jdbcTemplate.queryForList(
                        "SELECT visit_id, type, channel, status, scheduled_at FROM message WHERE listing_request_id = ?",
                        id))
                .singleElement()
                .satisfies(message -> assertThat(message)
                        .containsEntry("visit_id", null)
                        .containsEntry("type", "CONFIRMATION")
                        .containsEntry("channel", "SMS")
                        .containsEntry("status", "SCHEDULED")
                        .extractingByKey("scheduled_at")
                        .satisfies(scheduledAt -> assertThat(((Timestamp) scheduledAt).toInstant())
                                .isEqualTo(clock.instant())));
    }

    @Test
    void acceptsARequestWithoutFloorAndAStudioWithNoBedrooms() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        Map<String, Object> request = requestFromSpec(verificationId);
        request.remove("floor");
        request.put("propertyType", "STUDIO");
        request.put("operation", "SALE");
        request.put("bedrooms", 0);

        String body = submit(session, request)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        long id = ((Number) JsonPath.read(body, "$.id")).longValue();
        assertThat(jdbcTemplate.queryForMap("SELECT floor, bedrooms FROM listing_request WHERE id = ?", id))
                .containsEntry("floor", null)
                .containsEntry("bedrooms", 0);
    }

    @Test
    void rejectsPhoneVerificationsThatBreakAnyRule() throws Exception {
        MockHttpSession otherBrowser = new MockHttpSession();
        long fromOtherBrowser = verifiedPhone(otherBrowser, "LISTING_REQUEST", "+34612987650");
        expectInvalidVerification(submit(new MockHttpSession(), requestFor(fromOtherBrowser, "+34612987650")));

        MockHttpSession pendingSession = new MockHttpSession();
        long pending = startedPhone(pendingSession, "LISTING_REQUEST", "+34612987651");
        expectInvalidVerification(submit(pendingSession, requestFor(pending, "+34612987651")));

        MockHttpSession visitSession = new MockHttpSession();
        long forAVisit = verifiedPhone(visitSession, "VISIT", "+34612987652");
        expectInvalidVerification(submit(visitSession, requestFor(forAVisit, "+34612987652")));

        MockHttpSession otherPhoneSession = new MockHttpSession();
        long otherPhone = verifiedPhone(otherPhoneSession, "LISTING_REQUEST", "+34612987653");
        expectInvalidVerification(submit(otherPhoneSession, requestFor(otherPhone, "+34612987699")));

        MockHttpSession usedSession = new MockHttpSession();
        long used = verifiedPhone(usedSession, "LISTING_REQUEST", PHONE);
        submit(usedSession, requestFor(used, PHONE)).andExpect(status().isCreated());
        expectInvalidVerification(submit(usedSession, requestFor(used, PHONE)));
    }

    @Test
    void acceptsAVerificationOlderThanThirtyMinutesBecauseThatRuleIsOnlyForBookings() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        jdbcTemplate.update(
                "UPDATE phone_verification SET verified_at = verified_at - interval '2 hours' WHERE id = ?",
                verificationId);

        submit(session, requestFor(verificationId, PHONE)).andExpect(status().isCreated());
    }

    @Test
    void onlyOneConcurrentSubmitCanUseTheSamePhoneVerification() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        CountDownLatch startTogether = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        List<Future<MvcResult>> results = new ArrayList<>();
        for (int attempt = 0; attempt < 2; attempt++) {
            results.add(executor.submit(() -> {
                startTogether.await();
                return submit(session, requestFor(verificationId, PHONE)).andReturn();
            }));
        }
        startTogether.countDown();
        List<MvcResult> responses = new ArrayList<>();
        try {
            for (Future<MvcResult> result : results) {
                responses.add(result.get(30, TimeUnit.SECONDS));
            }
        } finally {
            executor.shutdownNow();
        }

        assertThat(responses)
                .extracting(result -> result.getResponse().getStatus())
                .containsExactlyInAnyOrder(201, 422);
        assertThat(responses.stream()
                        .filter(result -> result.getResponse().getStatus() == 422)
                        .findFirst()
                        .orElseThrow()
                        .getResponse()
                        .getContentAsString())
                .contains("\"code\":\"PHONE_VERIFICATION_INVALID\"");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM listing_request WHERE phone_verification_id = ?",
                        Integer.class,
                        verificationId))
                .isEqualTo(1);
    }

    @Test
    void answersPhoneVerificationInvalidWhenOnlyTheUniqueConstraintCatchesTheSecondUse() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        submit(session, requestFor(verificationId, PHONE)).andExpect(status().isCreated());
        // As if the check in Java had missed the first request, so the database has to catch it
        doReturn(false).when(listingRequests).existsByPhoneVerificationId(verificationId);

        expectInvalidVerification(submit(session, requestFor(verificationId, PHONE)));
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM listing_request WHERE phone_verification_id = ?",
                        Integer.class,
                        verificationId))
                .isEqualTo(1);
    }

    @Test
    void neverLogsTheOwnersPhoneOrName(CapturedOutput output) throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        submit(session, requestFor(verificationId, PHONE)).andExpect(status().isCreated());
        doReturn(false).when(listingRequests).existsByPhoneVerificationId(verificationId);
        submit(session, requestFor(verificationId, PHONE)).andExpect(status().is(422));

        assertThat(output).doesNotContain("612987654").doesNotContain("Ana Torres");
    }

    @Test
    void countsTheNewRequestInTheAgencyDashboard() throws Exception {
        MockHttpSession agent = signedInAgent();
        long pendingBefore = newRequests(agent);
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);

        submit(session, requestFor(verificationId, PHONE)).andExpect(status().isCreated());

        assertThat(newRequests(agent)).isEqualTo(pendingBefore + 1);
    }

    @Test
    void namesEveryMissingField() throws Exception {
        mockMvc.perform(post("/api/listing-requests")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.ownerName").exists())
                .andExpect(jsonPath("$.errors.ownerPhone").exists())
                .andExpect(jsonPath("$.errors.title").exists())
                .andExpect(jsonPath("$.errors.description").exists())
                .andExpect(jsonPath("$.errors.propertyType").exists())
                .andExpect(jsonPath("$.errors.operation").exists())
                .andExpect(jsonPath("$.errors.area").exists())
                .andExpect(jsonPath("$.errors.address").exists())
                .andExpect(jsonPath("$.errors.priceEuros").exists())
                .andExpect(jsonPath("$.errors.bedrooms").exists())
                .andExpect(jsonPath("$.errors.sizeM2").exists())
                .andExpect(jsonPath("$.errors.phoneVerificationId").exists())
                .andExpect(jsonPath("$.errors.floor").doesNotExist());
    }

    @Test
    void namesEveryInvalidValueAndSavesNothing() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);
        Map<String, Object> request = requestFromSpec(verificationId);
        request.put("ownerPhone", "612987654");
        request.put("propertyType", "CASTLE");
        request.put("operation", "SWAP");
        request.put("priceEuros", 0);
        request.put("sizeM2", 0);
        request.put("bedrooms", -1);
        request.put("ownerName", "  ");

        submit(session, request)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.ownerPhone").exists())
                .andExpect(jsonPath("$.errors.propertyType").exists())
                .andExpect(jsonPath("$.errors.operation").exists())
                .andExpect(jsonPath("$.errors.priceEuros").exists())
                .andExpect(jsonPath("$.errors.sizeM2").exists())
                .andExpect(jsonPath("$.errors.bedrooms").exists())
                .andExpect(jsonPath("$.errors.ownerName").exists());

        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM listing_request WHERE phone_verification_id = ?",
                        Integer.class,
                        verificationId))
                .isZero();
    }

    @Test
    void rejectsARequestWithoutTheCsrfToken() throws Exception {
        MockHttpSession session = new MockHttpSession();
        long verificationId = verifiedPhone(session, "LISTING_REQUEST", PHONE);

        mockMvc.perform(post("/api/listing-requests")
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestFor(verificationId, PHONE))))
                .andExpect(status().isForbidden());
    }

    private MockHttpSession signedInAgent() throws Exception {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Listing Request Test Agency",
                "listing-request-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
        String email = "agent-" + UUID.randomUUID() + "@peephole.example";
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Listing Test Agent",
                email,
                passwordEncoder.encode("Listing-test-password-1"),
                "AGENT");
        return (MockHttpSession) mockMvc.perform(post("/api/agency/session")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"Listing-test-password-1\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }

    private long newRequests(MockHttpSession agent) throws Exception {
        String body = mockMvc.perform(get("/api/agency/summary").session(agent))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return ((Number) JsonPath.read(body, "$.newRequests")).longValue();
    }

    private Map<String, Object> requestFromSpec(long verificationId) {
        Map<String, Object> request = new HashMap<>();
        request.put("ownerName", "Ana Torres");
        request.put("ownerPhone", PHONE);
        request.put("title", "Apartment in Gràcia");
        request.put("description", "Bright apartment near the square");
        request.put("propertyType", "APARTMENT");
        request.put("operation", "RENT");
        request.put("area", "Gràcia");
        request.put("address", "Carrer de Verdi, 123");
        request.put("priceEuros", 1200);
        request.put("bedrooms", 3);
        request.put("sizeM2", 85);
        request.put("floor", 2);
        request.put("phoneVerificationId", verificationId);
        return request;
    }

    private Map<String, Object> requestFor(long verificationId, String phone) {
        Map<String, Object> request = requestFromSpec(verificationId);
        request.put("ownerPhone", phone);
        return request;
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

    private ResultActions submit(MockHttpSession session, Map<String, Object> request) throws Exception {
        return mockMvc.perform(post("/api/listing-requests")
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private static void expectInvalidVerification(ResultActions result) throws Exception {
        result.andExpect(status().is(422))
                .andExpect(jsonPath("$.code").value("PHONE_VERIFICATION_INVALID"))
                .andExpect(jsonPath("$.detail")
                        .value("Verify your phone number again before sending your listing request."));
    }
}
