package com.peephole.server.listing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.peephole.server.listing.dto.ListingRequestDetailsResponse;
import com.peephole.server.listing.dto.RejectListingRequest;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class AgencyListingRequestControllerTest {

    private static final String PATH = "/api/agency/listing-requests";
    private static final String EMAIL = "marta.listing-test@peephole.example";
    private static final String ADMIN_EMAIL = "jordi.listing-test@peephole.example";
    private static final String PASSWORD = "Listing-test-password-1";
    private static final OffsetDateTime TIME = OffsetDateTime.parse("2099-03-10T09:00:00Z");
    private static final OffsetDateTime REVIEW_TIME = OffsetDateTime.parse("2099-03-12T10:00:00Z");
    private static final String REASON = "{\"reason\":\"The address is outside Barcelona\"}";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(REVIEW_TIME.toInstant(), ZoneOffset.UTC);
    }

    private long agencyId;
    private long agentId;
    private long adminId;
    private int phoneVerifications;

    // Rolled back with the test: the demo data has its own listing requests
    @BeforeEach
    void startWithoutListingRequests() {
        jdbcTemplate.update("DELETE FROM message WHERE listing_request_id IS NOT NULL");
        jdbcTemplate.update("UPDATE property SET listing_request_id = NULL WHERE listing_request_id IS NOT NULL");
        jdbcTemplate.update("DELETE FROM listing_request");
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, '+34600000001', true) RETURNING id",
                Long.class,
                "Listing Test Agency",
                "agency.listing-test@peephole.example");
        agentId = insertUser("Marta Ruiz", EMAIL, "AGENT");
        adminId = insertUser("Jordi Mas", ADMIN_EMAIL, "ADMIN");
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

    // The details (D3)

    @Test
    void showsARequestInTheShapeOfTheSpec() throws Exception {
        long id = insertListingRequest("Ana Torres", "REJECTED", TIME);
        jdbcTemplate.update(
                "UPDATE listing_request SET reviewed_at = ?, rejection_reason = ? WHERE id = ?",
                TIME.plusDays(1),
                "The address is outside Barcelona",
                id);

        details(id)
                .andExpect(status().isOk())
                // Contract: exactly the seventeen fields of the spec's example, in Madrid time
                .andExpect(jsonPath("$.length()").value(17))
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.ownerName").value("Ana Torres"))
                .andExpect(jsonPath("$.ownerPhone").value("+34600000003"))
                .andExpect(jsonPath("$.title").value("Apartment in Gràcia"))
                .andExpect(jsonPath("$.description").value("A bright flat near the square"))
                .andExpect(jsonPath("$.propertyType").value("APARTMENT"))
                .andExpect(jsonPath("$.operation").value("RENT"))
                .andExpect(jsonPath("$.area").value("Gràcia"))
                .andExpect(jsonPath("$.address").value("Carrer de Verdi 2"))
                .andExpect(jsonPath("$.priceEuros").value(1200))
                .andExpect(jsonPath("$.bedrooms").value(3))
                .andExpect(jsonPath("$.sizeM2").value(85))
                .andExpect(jsonPath("$.floor").value(2))
                .andExpect(jsonPath("$.createdAt").value("2099-03-10T10:00:00+01:00"))
                .andExpect(jsonPath("$.reviewedAt").value("2099-03-11T10:00:00+01:00"))
                .andExpect(jsonPath("$.rejectionReason").value("The address is outside Barcelona"));
    }

    @Test
    void showsTheMissingValuesOfAPendingRequestAsNull() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);
        jdbcTemplate.update("UPDATE listing_request SET floor = NULL WHERE id = ?", id);

        details(id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(17))
                .andExpect(jsonPath("$.floor").value(nullValue()))
                .andExpect(jsonPath("$.reviewedAt").value(nullValue()))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()));
    }

    @Test
    void returnsNotFoundForAnUnknownRequest() throws Exception {
        details(999_999_999L)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void detailsRequireASignedInUser() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        mockMvc.perform(get(PATH + "/" + id))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void neverPrintsTheOwnerOfARequest() {
        ListingRequestDetailsResponse details = new ListingRequestDetailsResponse(
                18,
                "PENDING",
                "Ana Torres",
                "+34600000003",
                "Apartment in Gràcia",
                "A bright flat near the square",
                "APARTMENT",
                "RENT",
                "Gràcia",
                "Carrer de Verdi 2",
                1200,
                3,
                85,
                2,
                TIME,
                null,
                null);

        assertThat(details.toString())
                .doesNotContain("Ana Torres")
                .doesNotContain("600000003")
                .doesNotContain("Carrer de Verdi");
    }

    // Approving (D3)

    @Test
    void approvesAPendingRequestIntoAnActivePropertyOfTheAgency() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        String body = approve(id)
                .andExpect(status().isOk())
                // Contract: only the id of the new property
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$.propertyId").isNumber())
                .andReturn()
                .getResponse()
                .getContentAsString();
        long propertyId = JsonPath.<Number>read(body, "$.propertyId").longValue();

        Map<String, Object> property = jdbcTemplate.queryForMap("SELECT * FROM property WHERE id = ?", propertyId);
        assertThat(property)
                .containsEntry("agency_id", agencyId)
                .containsEntry("listing_request_id", id)
                .containsEntry("title", "Apartment in Gràcia")
                .containsEntry("description", "A bright flat near the square")
                .containsEntry("operation", "RENT")
                .containsEntry("property_type", "APARTMENT")
                .containsEntry("price_euros", 1200)
                .containsEntry("area", "Gràcia")
                .containsEntry("address", "Carrer de Verdi 2")
                .containsEntry("bedrooms", 3)
                .containsEntry("size_m2", 85)
                .containsEntry("floor", 2)
                .containsEntry("latitude", null)
                .containsEntry("longitude", null)
                .containsEntry("video_visit_available", false)
                .containsEntry("status", "ACTIVE");
        // No photos: the catalog shows the generic image
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM property_image WHERE property_id = ?", Integer.class, propertyId))
                .isZero();
    }

    @Test
    void showsTheApprovedPropertyInTheCatalog() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);
        long propertyId = approvedPropertyId(id);

        mockMvc.perform(get("/api/properties/" + propertyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Apartment in Gràcia"))
                .andExpect(jsonPath("$.images.length()").value(0));
    }

    @Test
    void marksTheApprovedRequestWithItsReviewerAndTime() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        approve(id).andExpect(status().isOk());

        details(id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewedAt").value("2099-03-12T11:00:00+01:00"))
                .andExpect(jsonPath("$.rejectionReason").value(nullValue()));
        assertThat(reviewerOf(id)).isEqualTo(agentId);
    }

    @Test
    void refusesToApproveARequestThatWasAlreadyReviewed() throws Exception {
        long approved = insertListingRequest("Joan Puig", "APPROVED", TIME);
        long rejected = insertListingRequest("Laia Vidal", "REJECTED", TIME);

        approve(approved)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LISTING_REQUEST_ALREADY_REVIEWED"));
        approve(rejected)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LISTING_REQUEST_ALREADY_REVIEWED"));

        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM property WHERE listing_request_id IN (?, ?)",
                        Integer.class,
                        approved,
                        rejected))
                .isZero();
    }

    @Test
    void returnsNotFoundWhenApprovingAnUnknownRequest() throws Exception {
        approve(999_999_999L)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void approvingRequiresASignedInUser() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        mockMvc.perform(post(PATH + "/" + id + "/approve").with(csrf()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void approvingRequiresACsrfToken() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        mockMvc.perform(post(PATH + "/" + id + "/approve").session(signIn()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }

    // Rejecting (D3)

    @Test
    void rejectsAPendingRequestWithItsReason() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        reject(id, "{\"reason\":\"  The address is outside Barcelona  \"}")
                .andExpect(status().isOk())
                // Contract: the id and the new status
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.status").value("REJECTED"));

        details(id)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.reviewedAt").value("2099-03-12T11:00:00+01:00"))
                .andExpect(jsonPath("$.rejectionReason").value("The address is outside Barcelona"));
        assertThat(reviewerOf(id)).isEqualTo(agentId);
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT count(*) FROM property WHERE listing_request_id = ?", Integer.class, id))
                .isZero();
    }

    @Test
    void asksForAReasonBeforeRejecting() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        reject(id, "{}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.reason").exists());
        reject(id, "{\"reason\":\"   \"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.reason").exists());
        reject(id, "{\"reason\":\"" + "x".repeat(1001) + "\"}")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.reason").exists());

        details(id).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void acceptsAReasonOfOneThousandCharacters() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        reject(id, "{\"reason\":\"" + "x".repeat(1000) + "\"}").andExpect(status().isOk());
    }

    @Test
    void refusesToRejectARequestThatWasAlreadyReviewed() throws Exception {
        long approved = insertListingRequest("Joan Puig", "APPROVED", TIME);
        long rejected = insertListingRequest("Laia Vidal", "REJECTED", TIME);

        reject(approved, REASON)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LISTING_REQUEST_ALREADY_REVIEWED"));
        reject(rejected, REASON)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LISTING_REQUEST_ALREADY_REVIEWED"));

        details(approved)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    void returnsNotFoundWhenRejectingAnUnknownRequest() throws Exception {
        reject(999_999_999L, REASON)
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void rejectingRequiresASignedInUser() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        mockMvc.perform(post(PATH + "/" + id + "/reject")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REASON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
    }

    @Test
    void rejectingRequiresACsrfToken() throws Exception {
        long id = insertListingRequest("Ana Torres", "PENDING", TIME);

        mockMvc.perform(post(PATH + "/" + id + "/reject")
                        .session(signIn())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REASON))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("CSRF_TOKEN_INVALID"));
    }

    // The agency writes the reason, and it may name the owner
    @Test
    void neverPrintsTheRejectionReason() {
        assertThat(new RejectListingRequest("Ana Torres sent the wrong address").toString())
                .doesNotContain("Ana Torres");
    }

    // Every endpoint

    // In the MVP both roles can review
    @Test
    void letsAnAdminReviewRequestsToo() throws Exception {
        long toApprove = insertListingRequest("Ana Torres", "PENDING", TIME);
        long toReject = insertListingRequest("Joan Puig", "PENDING", TIME);
        MockHttpSession admin = signIn(ADMIN_EMAIL);

        mockMvc.perform(post(PATH + "/" + toApprove + "/approve").with(csrf()).session(admin))
                .andExpect(status().isOk());
        mockMvc.perform(post(PATH + "/" + toReject + "/reject")
                        .with(csrf())
                        .session(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REASON))
                .andExpect(status().isOk());

        assertThat(reviewerOf(toApprove)).isEqualTo(adminId);
        assertThat(reviewerOf(toReject)).isEqualTo(adminId);
    }

    @Test
    void answersBadRequestForAnIdThatIsNotANumber() throws Exception {
        MockHttpSession session = signIn();

        mockMvc.perform(get(PATH + "/abc").session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mockMvc.perform(post(PATH + "/abc/approve").with(csrf()).session(session))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        mockMvc.perform(post(PATH + "/abc/reject")
                        .with(csrf())
                        .session(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REASON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
    }

    // The owner's details and the reason are personal data, so neither reading nor reviewing writes them to the logs
    @Test
    void neverLogsTheOwnerOrTheReason(CapturedOutput output) throws Exception {
        long toApprove = insertListingRequest("Ana Torres", "PENDING", TIME);
        long toReject = insertListingRequest("Ana Torres", "PENDING", TIME);
        String reason = "Ana Torres gave an address outside Barcelona";

        details(toApprove).andExpect(status().isOk());
        approve(toApprove).andExpect(status().isOk());
        reject(toReject, "{\"reason\":\"" + reason + " " + "x".repeat(1000) + "\"}")
                .andExpect(status().isBadRequest());
        reject(toReject, "{\"reason\":\"" + reason + "\"}").andExpect(status().isOk());

        assertThat(output)
                .doesNotContain("600000003")
                .doesNotContain("Ana Torres")
                .doesNotContain("Carrer de Verdi")
                .doesNotContain("outside Barcelona");
    }

    private ResultActions list(String query) throws Exception {
        return mockMvc.perform(get(PATH + query).session(signIn()));
    }

    private ResultActions details(long id) throws Exception {
        return mockMvc.perform(get(PATH + "/" + id).session(signIn()));
    }

    private ResultActions approve(long id) throws Exception {
        return mockMvc.perform(post(PATH + "/" + id + "/approve").with(csrf()).session(signIn()));
    }

    private ResultActions reject(long id, String body) throws Exception {
        return mockMvc.perform(post(PATH + "/" + id + "/reject")
                .with(csrf())
                .session(signIn())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private long approvedPropertyId(long id) throws Exception {
        String body =
                approve(id).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return JsonPath.<Number>read(body, "$.propertyId").longValue();
    }

    // JPA writes the review when the transaction ends, so it is flushed before reading it with SQL
    private Long reviewerOf(long id) {
        entityManager.flush();
        return jdbcTemplate.queryForObject("SELECT reviewed_by FROM listing_request WHERE id = ?", Long.class, id);
    }

    private MockHttpSession signIn() throws Exception {
        return signIn(EMAIL);
    }

    private MockHttpSession signIn(String email) throws Exception {
        return (MockHttpSession) mockMvc.perform(post("/api/agency/session")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn()
                .getRequest()
                .getSession(false);
    }

    private long insertUser(String fullName, String email, String role) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)"
                        + " RETURNING id",
                Long.class,
                agencyId,
                fullName,
                email,
                passwordEncoder.encode(PASSWORD),
                role);
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
