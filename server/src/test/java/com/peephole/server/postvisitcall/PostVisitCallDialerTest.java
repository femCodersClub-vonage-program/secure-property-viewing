package com.peephole.server.postvisitcall;

import static com.peephole.server.postvisitcall.PostVisitCallFixtures.VISITOR_NAME;
import static com.peephole.server.postvisitcall.PostVisitCallFixtures.VISITOR_PHONE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.VoiceCallException;
import com.peephole.server.vonage.VoiceCaller;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.server-public-url=https://peephole.example")
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class PostVisitCallDialerTest {

    private static final String CALL_UUID = "63f61863-4a51-4f6b-86e1-46edebcf9356";
    // Copied from the spec, so a typo in the question shows up here
    private static final String QUESTION = "Hola, te llamamos de Peephole por la videovisita que acabas de hacer."
            + " Si alguien te ha pedido dinero, una señal o cualquier pago antes de firmar el contrato, pulsa 1."
            + " Si no, pulsa 2.";
    // 11:00 to 11:30 in Madrid, so the call is due at 11:45, 10:45 UTC
    private static final OffsetDateTime STARTS_AT = OffsetDateTime.parse("2026-11-23T11:00:00+01:00");

    @Autowired
    private PostVisitCallDialer dialer;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ApplicationContext context;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoBean
    private VoiceCaller voiceCaller;

    @MockitoBean
    private Clock clock;

    private PostVisitCallFixtures fixtures;
    private long agencyId;

    @BeforeEach
    void setUp() {
        fixtures = new PostVisitCallFixtures(jdbcTemplate);
        agencyId = fixtures.createAgency();
        when(clock.getZone()).thenReturn(ZoneOffset.UTC);
        when(voiceCaller.callAndAskForOneKey(anyString(), anyString(), any(), any()))
                .thenReturn(CALL_UUID);
    }

    @Test
    void callsTheVisitorFifteenMinutesAfterTheVisitEnds() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T10:45:00Z");

        long callId = callIdOf(visitId);
        verify(voiceCaller)
                .callAndAskForOneKey(
                        VISITOR_PHONE,
                        QUESTION,
                        URI.create("https://peephole.example/api/webhooks/voice/input?callId=" + callId),
                        URI.create("https://peephole.example/api/webhooks/voice/event?callId=" + callId));
        assertThat(callRow(visitId))
                .containsEntry("status", "CALLING")
                .containsEntry("vonage_call_uuid", CALL_UUID)
                .containsEntry("answer", null);
    }

    @Test
    void waitsUntilTheDelayHasPassed() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T10:44:59Z");

        verify(voiceCaller, never()).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callCount(visitId)).isZero();
    }

    @Test
    void onlyCallsConfirmedVisitsWhoseVisitorJoined() {
        OffsetDateTime joined = STARTS_AT.plusMinutes(1);
        long notJoined = fixtures.createVisit(agencyId, "CONFIRMED", STARTS_AT, null);
        long canceled = fixtures.createVisit(agencyId, "CANCELED", STARTS_AT, joined);
        long completed = fixtures.createVisit(agencyId, "COMPLETED", STARTS_AT, joined);

        callDueVisitsAt("2026-11-23T10:45:00Z");

        verify(voiceCaller, never()).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(List.of(notJoined, canceled, completed))
                .allSatisfy(visit -> assertThat(callCount(visit)).isZero());
    }

    @Test
    void callsEachVisitOnlyOnce() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T10:45:00Z");
        callDueVisitsAt("2026-11-23T10:46:00Z");

        verify(voiceCaller, times(1)).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callCount(visitId)).isEqualTo(1);
    }

    @Test
    void neverCallsAboutAVisitThatEndedMoreThanTwoHoursAgo() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T12:30:00Z");

        verify(voiceCaller, never()).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callCount(visitId)).isZero();
    }

    @Test
    void stillCallsJustBeforeTheTwoHoursHavePassed() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T12:29:59Z");

        assertThat(callRow(visitId)).containsEntry("status", "CALLING");
    }

    @Test
    void marksTheCallSkippedAfterNineInTheEveningAndNeverCallsLater() {
        // 20:30 to 21:00 in Madrid, so the call would be at 21:15
        long visitId = fixtures.createJoinedVisit(agencyId, OffsetDateTime.parse("2026-11-23T20:30:00+01:00"));

        callDueVisitsAt("2026-11-23T20:15:00Z");
        callDueVisitsAt("2026-11-23T20:16:00Z");

        verify(voiceCaller, never()).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callRow(visitId)).containsEntry("status", "SKIPPED").containsEntry("vonage_call_uuid", null);
    }

    @Test
    void marksTheCallSkippedBeforeNineInTheMorning() {
        // 08:00 to 08:30 in Madrid, so the call would be at 08:45
        long visitId = fixtures.createJoinedVisit(agencyId, OffsetDateTime.parse("2026-11-23T08:00:00+01:00"));

        callDueVisitsAt("2026-11-23T07:45:00Z");

        verify(voiceCaller, never()).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callRow(visitId)).containsEntry("status", "SKIPPED");
    }

    @Test
    void callsFromNineInTheMorningOnwards() {
        // 08:15 to 08:45 in Madrid, so the call is due at 09:00 exactly
        long visitId = fixtures.createJoinedVisit(agencyId, OffsetDateTime.parse("2026-11-23T08:15:00+01:00"));

        callDueVisitsAt("2026-11-23T08:00:00Z");

        assertThat(callRow(visitId)).containsEntry("status", "CALLING");
    }

    @Test
    void marksTheCallSkippedAtNineInTheEveningExactly() {
        // 20:15 to 20:45 in Madrid, so the call is due at 21:00 exactly
        long visitId = fixtures.createJoinedVisit(agencyId, OffsetDateTime.parse("2026-11-23T20:15:00+01:00"));

        callDueVisitsAt("2026-11-23T20:00:00Z");

        assertThat(callRow(visitId)).containsEntry("status", "SKIPPED");
    }

    @Test
    void marksTheCallFailedWhenVonageRefusesItAndNeverTriesAgain() {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);
        when(voiceCaller.callAndAskForOneKey(anyString(), anyString(), any(), any()))
                .thenThrow(new VoiceCallException("Vonage answered 400 when creating a call"));

        callDueVisitsAt("2026-11-23T10:45:00Z");
        callDueVisitsAt("2026-11-23T10:46:00Z");

        verify(voiceCaller, times(1)).callAndAskForOneKey(anyString(), anyString(), any(), any());
        assertThat(callRow(visitId)).containsEntry("status", "FAILED").containsEntry("vonage_call_uuid", null);
    }

    @Test
    void logsTheCallAndTheVisitButNeverThePhoneOrTheName(CapturedOutput output) {
        long visitId = fixtures.createJoinedVisit(agencyId, STARTS_AT);

        callDueVisitsAt("2026-11-23T10:45:00Z");

        assertThat(output).contains("Placed post-visit call " + callIdOf(visitId) + " for visit " + visitId);
        assertThat(output).doesNotContain(VISITOR_PHONE, VISITOR_NAME);
    }

    @Test
    void placesNoCallsWhileCallsAreOff() {
        // The test configuration keeps the calls off, even when server/.env turns them on, so the check that runs
        // every minute doesn't exist
        assertThat(context.getBeansOfType(PostVisitCallScheduler.class)).isEmpty();
    }

    private void callDueVisitsAt(String instant) {
        when(clock.instant()).thenReturn(Instant.parse(instant));
        dialer.callDueVisits();
    }

    // The test transaction never commits, so the changes are written by hand before reading them with SQL
    private Map<String, Object> callRow(long visitId) {
        entityManager.flush();
        return jdbcTemplate.queryForMap(
                "SELECT status, vonage_call_uuid, answer FROM post_visit_call WHERE visit_id = ?", visitId);
    }

    private long callIdOf(long visitId) {
        return jdbcTemplate.queryForObject("SELECT id FROM post_visit_call WHERE visit_id = ?", Long.class, visitId);
    }

    private int callCount(long visitId) {
        return jdbcTemplate.queryForObject(
                "SELECT count(*) FROM post_visit_call WHERE visit_id = ?", Integer.class, visitId);
    }
}
