package com.peephole.server.videovisit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import com.peephole.server.visit.SessionVisits;
import com.peephole.server.vonage.VideoProvider;
import com.peephole.server.vonage.VideoProviderException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class VideoVisitControllerTest {

    private static final String SESSION_ID = "2_MX4xMjM0NTY3OH5-test-session";
    private static final String VIDEO_TOKEN = "test-video-jwt";
    private static final String APPLICATION_ID = "00000000-0000-4000-8000-000000000001";
    private static final String AGENT_EMAIL = "agent.video-test@peephole.example";
    private static final String AGENT_PASSWORD = "Video-test-password-1";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoBean
    private VideoProvider videoProvider;

    // 10:55 in Madrid on the day of the spec's example: its room is open, from 10:50 to 11:45
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-23T09:55:00Z"), ZoneOffset.UTC);
    }

    private VideoVisitFixtures fixtures;
    private long agencyId;
    private long visitId;
    private MockHttpSession bookingSession;

    @BeforeEach
    void createAConfirmedVisitBookedFromThisBrowser() {
        when(videoProvider.applicationId()).thenReturn(APPLICATION_ID);
        when(videoProvider.createSession()).thenReturn(SESSION_ID);
        when(videoProvider.generateToken(anyString(), anyString(), any())).thenReturn(VIDEO_TOKEN);

        fixtures = new VideoVisitFixtures(jdbcTemplate);
        agencyId = fixtures.createAgency();
        visitId = fixtures.createVisit(agencyId, "CONFIRMED");
        bookingSession = new MockHttpSession();
        SessionVisits.add(bookingSession, visitId);
    }

    // Room links

    @Test
    void createsTheVisitorLinkAndStoresOnlyTheHashOfItsToken() throws Exception {
        String body = createRoomLink(bookingSession, visitId, "VISITOR")
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Contract: exactly the fields of the spec's example
        Map<String, Object> json = JsonPath.read(body, "$");
        assertThat(json).containsOnlyKeys("role", "token").containsEntry("role", "VISITOR");
        String token = JsonPath.read(body, "$.token");
        assertThat(token).hasSize(43);

        String storedHash = jdbcTemplate.queryForObject(
                "SELECT token_hash FROM video_access WHERE visit_id = ? AND role = 'VISITOR'", String.class, visitId);
        assertThat(storedHash).isEqualTo(RoomToken.hash(token)).isNotEqualTo(token);
    }

    @Test
    void replacesThePreviousVisitorLinkWhenAskedAgain() throws Exception {
        String first = roomLinkToken(visitId, "VISITOR");
        String second = roomLinkToken(visitId, "VISITOR");

        Integer visitorLinks = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM video_access WHERE visit_id = ? AND role = 'VISITOR'", Integer.class, visitId);
        assertThat(visitorLinks).isEqualTo(1);
        expectProblem(videoTokenForRoomLink(first), 404, "NOT_FOUND");
        videoTokenForRoomLink(second).andExpect(status().isOk());
    }

    @Test
    void createsUpToFourGuestLinksAndRefusesTheFifth() throws Exception {
        for (int i = 0; i < 4; i++) {
            createRoomLink(bookingSession, visitId, "GUEST")
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.role").value("GUEST"));
        }

        expectProblem(createRoomLink(bookingSession, visitId, "GUEST"), 409, "VIDEO_INVITE_LIMIT_REACHED");
    }

    @Test
    void theVisitorLinkDoesNotCountTowardsTheGuestLimit() throws Exception {
        roomLinkToken(visitId, "VISITOR");
        for (int i = 0; i < 4; i++) {
            createRoomLink(bookingSession, visitId, "GUEST").andExpect(status().isCreated());
        }
    }

    @Test
    void createsRoomLinksBeforeTheRoomOpens() throws Exception {
        long laterVisit = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.plusDays(1));
        SessionVisits.add(bookingSession, laterVisit);

        createRoomLink(bookingSession, laterVisit, "VISITOR").andExpect(status().isCreated());
    }

    @Test
    void refusesRoomLinksForAVisitNotBookedFromThisBrowser() throws Exception {
        expectProblem(createRoomLink(new MockHttpSession(), visitId, "VISITOR"), 404, "NOT_FOUND");
    }

    @Test
    void refusesRoomLinksForAVisitThatDoesNotExist() throws Exception {
        SessionVisits.add(bookingSession, Long.MAX_VALUE);

        expectProblem(createRoomLink(bookingSession, Long.MAX_VALUE, "VISITOR"), 404, "NOT_FOUND");
    }

    @Test
    void refusesRoomLinksForACanceledVisit() throws Exception {
        long canceled = fixtures.createVisit(agencyId, "CANCELED", VideoVisitFixtures.STARTS_AT.plusDays(1));
        SessionVisits.add(bookingSession, canceled);

        expectProblem(createRoomLink(bookingSession, canceled, "GUEST"), 409, "VIDEO_VISIT_NOT_OPEN");
    }

    @Test
    void refusesRoomLinksOnceTheRoomHasClosed() throws Exception {
        long past = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.minusHours(1));
        SessionVisits.add(bookingSession, past);

        expectProblem(createRoomLink(bookingSession, past, "GUEST"), 409, "VIDEO_VISIT_NOT_OPEN");
    }

    @Test
    void refusesARoleThatIsNotVisitorOrGuest() throws Exception {
        expectProblem(createRoomLink(bookingSession, visitId, "AGENCY"), 400, "VALIDATION_FAILED")
                .andExpect(jsonPath("$.errors.role").value("must be VISITOR or GUEST"));
        expectProblem(
                mockMvc.perform(post("/api/visits/{id}/room-links", visitId)
                        .session(bookingSession)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")),
                400,
                "VALIDATION_FAILED");
    }

    @Test
    void refusesARoomLinkWithoutTheCsrfToken() throws Exception {
        mockMvc.perform(post("/api/visits/{id}/room-links", visitId)
                        .session(bookingSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"VISITOR\"}"))
                .andExpect(status().isForbidden());
    }

    // Entering with a room link

    @Test
    void entersWithTheVisitorLink() throws Exception {
        String token = roomLinkToken(visitId, "VISITOR");

        String body = videoTokenForRoomLink(token)
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        // Contract: exactly the fields and formats of the spec's example
        Map<String, Object> json = JsonPath.read(body, "$");
        assertThat(json)
                .containsExactlyInAnyOrderEntriesOf(Map.of(
                        "applicationId", APPLICATION_ID,
                        "sessionId", SESSION_ID,
                        "token", VIDEO_TOKEN,
                        "role", "VISITOR",
                        "closesAt", "2026-11-23T11:45:00+01:00"));
        // The token expires when the room closes, and its data carries only the role
        verify(videoProvider).generateToken(SESSION_ID, "role=VISITOR", Duration.ofMinutes(50));
        // The test transaction never commits, so the change is written by hand before reading it with SQL
        entityManager.flush();
        String savedSession =
                jdbcTemplate.queryForObject("SELECT video_session_id FROM visit WHERE id = ?", String.class, visitId);
        assertThat(savedSession).isEqualTo(SESSION_ID);
    }

    @Test
    void entersWithAGuestLinkAndReusesTheSessionOfTheVisit() throws Exception {
        videoTokenForRoomLink(roomLinkToken(visitId, "VISITOR")).andExpect(status().isOk());

        videoTokenForRoomLink(roomLinkToken(visitId, "GUEST"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("GUEST"))
                .andExpect(jsonPath("$.sessionId").value(SESSION_ID));

        verify(videoProvider, times(1)).createSession();
        verify(videoProvider).generateToken(SESSION_ID, "role=GUEST", Duration.ofMinutes(50));
    }

    @Test
    void entersFromAnotherBrowserWithNoSession() throws Exception {
        String token = roomLinkToken(visitId, "GUEST");

        // videoTokenForRoomLink never sends the booking session
        videoTokenForRoomLink(token).andExpect(status().isOk());
    }

    // The post-visit call only goes to visitors who entered the room (specs/post-visit-call.md)

    @Test
    void recordsWhenTheVisitorFirstEntersTheRoom() throws Exception {
        videoTokenForRoomLink(roomLinkToken(visitId, "VISITOR")).andExpect(status().isOk());

        assertThat(visitorJoinedAt()).isAtSameInstantAs(OffsetDateTime.parse("2026-11-23T09:55:00Z"));
    }

    @Test
    void keepsTheFirstEntryWhenTheVisitorEntersAgain() throws Exception {
        OffsetDateTime firstEntry = OffsetDateTime.parse("2026-11-23T09:51:00Z");
        jdbcTemplate.update("UPDATE visit SET visitor_joined_at = ? WHERE id = ?", firstEntry, visitId);

        videoTokenForRoomLink(roomLinkToken(visitId, "VISITOR")).andExpect(status().isOk());

        assertThat(visitorJoinedAt()).isAtSameInstantAs(firstEntry);
    }

    @Test
    void guestsAndTheAgencyEnteringDoNotCountAsTheVisitor() throws Exception {
        videoTokenForRoomLink(roomLinkToken(visitId, "GUEST")).andExpect(status().isOk());
        videoTokenForAgency(signedInAgent(agencyId), visitId).andExpect(status().isOk());

        assertThat(visitorJoinedAt()).isNull();
    }

    @Test
    void refusesALinkThatDoesNotExist() throws Exception {
        expectProblem(videoTokenForRoomLink(RoomToken.generate()), 404, "NOT_FOUND");
    }

    @Test
    void refusesARequestWithoutAToken() throws Exception {
        expectProblem(
                        mockMvc.perform(post("/api/room-links/video-token")
                                .with(csrf())
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}")),
                        400,
                        "VALIDATION_FAILED")
                .andExpect(jsonPath("$.errors.token").exists());
    }

    @Test
    void saysWhenTheRoomOpensBeforeItIsOpen() throws Exception {
        long later = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.plusHours(1));
        SessionVisits.add(bookingSession, later);
        String token = roomLinkToken(later, "VISITOR");

        expectProblem(videoTokenForRoomLink(token), 409, "VIDEO_VISIT_NOT_OPEN")
                .andExpect(jsonPath("$.opensAt").value("2026-11-23T11:50:00+01:00"));
        verify(videoProvider, never()).createSession();
    }

    @Test
    void refusesToEnterOnceTheRoomHasClosed() throws Exception {
        long past = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.minusHours(1));
        insertRoomLink(past, "GUEST", "past-visit-token");

        expectProblem(videoTokenForRoomLink("past-visit-token"), 409, "VIDEO_VISIT_NOT_OPEN")
                .andExpect(jsonPath("$.opensAt").doesNotExist());
    }

    @Test
    void refusesToEnterACanceledVisit() throws Exception {
        long canceled = fixtures.createVisit(agencyId, "CANCELED");
        insertRoomLink(canceled, "VISITOR", "canceled-visit-token");

        expectProblem(videoTokenForRoomLink("canceled-visit-token"), 409, "VIDEO_VISIT_NOT_OPEN");
        verify(videoProvider, never()).createSession();
    }

    @Test
    void answersAnInternalErrorWithTheVisitInTheLogWhenVonageFails(CapturedOutput output) throws Exception {
        when(videoProvider.createSession()).thenThrow(new VideoProviderException("Vonage answered 500"));
        String token = roomLinkToken(visitId, "VISITOR");

        expectProblem(videoTokenForRoomLink(token), 500, "INTERNAL_ERROR");
        assertThat(output).contains("Could not create the video session of visit " + visitId);
        assertThat(output).doesNotContain(token);
    }

    @Test
    void entersAtTheExactMomentTheRoomOpens() throws Exception {
        // The clock says 10:55, so a visit at 11:05 opens right now
        long opening = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.plusMinutes(5));

        videoTokenForAgency(signedInAgent(agencyId), opening).andExpect(status().isOk());
    }

    @Test
    void refusesToEnterAtTheExactMomentTheRoomCloses() throws Exception {
        // The clock says 10:55, so a visit from 10:10 to 10:40 closes right now
        long closing = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.minusMinutes(50));

        expectProblem(videoTokenForAgency(signedInAgent(agencyId), closing), 409, "VIDEO_VISIT_NOT_OPEN")
                .andExpect(jsonPath("$.opensAt").doesNotExist());
    }

    @Test
    void theDatabaseKeepsOneVisitorLinkPerVisitAndSeveralGuestLinks() {
        insertRoomLink(visitId, "GUEST", "guest-1");
        insertRoomLink(visitId, "GUEST", "guest-2");
        insertRoomLink(visitId, "VISITOR", "visitor-1");

        assertThatThrownBy(() -> insertRoomLink(visitId, "VISITOR", "visitor-2"))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void neverLogsRoomTokensVideoTokensOrSessionIds(CapturedOutput output) throws Exception {
        String token = roomLinkToken(visitId, "VISITOR");
        videoTokenForRoomLink(token).andExpect(status().isOk());

        assertThat(output).contains("Created the video session of visit " + visitId);
        assertThat(output).doesNotContain(token).doesNotContain(SESSION_ID).doesNotContain(VIDEO_TOKEN);
    }

    // Entering as the agency

    @Test
    void entersAsASignedInUserOfTheAgency() throws Exception {
        MockHttpSession agent = signedInAgent(agencyId);

        videoTokenForAgency(agent, visitId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("AGENCY"))
                .andExpect(jsonPath("$.sessionId").value(SESSION_ID))
                .andExpect(jsonPath("$.closesAt").value("2026-11-23T11:45:00+01:00"));
        verify(videoProvider).generateToken(SESSION_ID, "role=AGENCY", Duration.ofMinutes(50));
    }

    @Test
    void entersEvenWhenThePropertyWasDeactivatedAfterBooking() throws Exception {
        jdbcTemplate.update(
                "UPDATE property SET status = 'INACTIVE' WHERE id = (SELECT property_id FROM visit WHERE id = ?)",
                visitId);

        videoTokenForAgency(signedInAgent(agencyId), visitId).andExpect(status().isOk());
    }

    @Test
    void refusesAUserOfAnotherAgency() throws Exception {
        MockHttpSession otherAgent = signedInAgent(fixtures.createAgency());

        expectProblem(videoTokenForAgency(otherAgent, visitId), 404, "NOT_FOUND");
    }

    @Test
    void refusesTheAgencyEndpointWithoutSigningIn() throws Exception {
        expectProblem(videoTokenForAgency(new MockHttpSession(), visitId), 401, "AUTHENTICATION_REQUIRED");
    }

    @Test
    void refusesAnAgencyVisitThatDoesNotExist() throws Exception {
        expectProblem(videoTokenForAgency(signedInAgent(agencyId), Long.MAX_VALUE), 404, "NOT_FOUND");
    }

    @Test
    void saysWhenTheRoomOpensToTheAgencyToo() throws Exception {
        long later = fixtures.createVisit(agencyId, "CONFIRMED", VideoVisitFixtures.STARTS_AT.plusHours(1));

        expectProblem(videoTokenForAgency(signedInAgent(agencyId), later), 409, "VIDEO_VISIT_NOT_OPEN")
                .andExpect(jsonPath("$.opensAt").value("2026-11-23T11:50:00+01:00"));
    }

    // Helpers

    // The test transaction never commits, so the change is written by hand before reading it with SQL
    private OffsetDateTime visitorJoinedAt() {
        entityManager.flush();
        return jdbcTemplate.queryForObject(
                "SELECT visitor_joined_at FROM visit WHERE id = ?", OffsetDateTime.class, visitId);
    }

    private ResultActions createRoomLink(MockHttpSession session, long visit, String role) throws Exception {
        return mockMvc.perform(post("/api/visits/{id}/room-links", visit)
                .session(session)
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"role\":\"" + role + "\"}"));
    }

    private String roomLinkToken(long visit, String role) throws Exception {
        String body = createRoomLink(bookingSession, visit, role)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return JsonPath.read(body, "$.token");
    }

    private ResultActions videoTokenForRoomLink(String token) throws Exception {
        return mockMvc.perform(post("/api/room-links/video-token")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"));
    }

    private ResultActions videoTokenForAgency(MockHttpSession session, long visit) throws Exception {
        return mockMvc.perform(post("/api/agency/visits/{id}/video-token", visit)
                .session(session)
                .with(csrf()));
    }

    // A room link written straight into the table, for visits whose room links can no longer be created
    private void insertRoomLink(long visit, String role, String token) {
        jdbcTemplate.update(
                "INSERT INTO video_access (visit_id, role, token_hash, created_at) VALUES (?, ?, ?, ?)",
                visit,
                role,
                RoomToken.hash(token),
                OffsetDateTime.now(clock));
    }

    private MockHttpSession signedInAgent(long agency) throws Exception {
        String email = agency + "." + AGENT_EMAIL;
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agency,
                "Agent Test",
                email,
                passwordEncoder.encode(AGENT_PASSWORD),
                "AGENT");
        MockHttpSession session = new MockHttpSession();
        mockMvc.perform(post("/api/agency/session")
                        .session(session)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + AGENT_PASSWORD + "\"}"))
                .andExpect(status().isOk());
        return session;
    }

    private static ResultActions expectProblem(ResultActions result, int status, String code) throws Exception {
        return result.andExpect(status().is(status))
                .andExpect(jsonPath("$.code").value(code));
    }
}
