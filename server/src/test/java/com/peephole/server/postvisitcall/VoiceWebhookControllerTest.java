package com.peephole.server.postvisitcall;

import static com.peephole.server.postvisitcall.PostVisitCallFixtures.VISITOR_NAME;
import static com.peephole.server.postvisitcall.PostVisitCallFixtures.VISITOR_PHONE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.TestVoiceWebhookTokens;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = "app.vonage.voice.signature-secret=" + VoiceWebhookControllerTest.SECRET)
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class VoiceWebhookControllerTest {

    static final String SECRET = "test-voice-signature-secret";
    private static final String CALL_UUID = "63f61863-4a51-4f6b-86e1-46edebcf9356";
    private static final String ASKED_FOR_MONEY_TEXT =
            "Gracias. Hemos avisado a la agencia. No hagas ningún pago antes de firmar el contrato.";
    private static final String NOT_ASKED_TEXT = "Gracias por tu respuesta. Que vaya muy bien la búsqueda.";
    private static final String NO_VALID_KEY_TEXT = "No hemos recibido tu respuesta. Gracias y hasta pronto.";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @MockitoSpyBean
    private PostVisitCallRepository repository;

    // 11:47 in Madrid, two minutes after the call of an 11:00 visit was placed
    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(Instant.parse("2026-11-23T10:47:00Z"), ZoneOffset.UTC);
    }

    private long callId;

    @BeforeEach
    void createACallInProgress() {
        PostVisitCallFixtures fixtures = new PostVisitCallFixtures(jdbcTemplate);
        long visitId =
                fixtures.createJoinedVisit(fixtures.createAgency(), OffsetDateTime.parse("2026-11-23T11:00:00+01:00"));
        callId = fixtures.insertCall(visitId, "CALLING", CALL_UUID);
    }

    // Key webhook

    @Test
    void recordsThatSomeoneAskedForMoneyAndAnswersWithTheClosingSentence() throws Exception {
        // Contract: the closing NCCO is a JSON array with exactly one talk action in es-ES
        sendKey("1")
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                                [{"action": "talk", "text": "%s", "language": "es-ES"}]
                                """.formatted(ASKED_FOR_MONEY_TEXT), true));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "ASKED_FOR_MONEY");
        assertThat(answeredAt()).isAtSameInstantAs(OffsetDateTime.parse("2026-11-23T10:47:00Z"));
    }

    @Test
    void recordsThatNobodyAskedForMoneyWithKeyTwo() throws Exception {
        sendKey("2").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(NOT_ASKED_TEXT));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "NOT_ASKED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "5", "*"})
    void recordsNoAnswerForNoKeyOrAnotherKey(String digits) throws Exception {
        sendKey(digits)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value(NO_VALID_KEY_TEXT));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", null);
        assertThat(answeredAt()).isNull();
    }

    @Test
    void aRepeatedKeyChangesNothingAndAnswersTheSameSentence() throws Exception {
        sendKey("1").andExpect(status().isOk());

        sendKey("2").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(ASKED_FOR_MONEY_TEXT));

        assertThat(callRow()).containsEntry("answer", "ASKED_FOR_MONEY");
    }

    @Test
    void aLateKeyStillRecordsTheAnswerOfACallMarkedNotReached() throws Exception {
        sendEvent("completed").andExpect(status().isNoContent());
        assertThat(callRow()).containsEntry("status", "NOT_REACHED");

        sendKey("1").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(ASKED_FOR_MONEY_TEXT));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "ASKED_FOR_MONEY");
    }

    @Test
    void recordsAKeyOnACallMarkedFailedBecauseVonageStartedItAnyway() throws Exception {
        // The request to Vonage timed out, but the call went through
        jdbcTemplate.update("UPDATE post_visit_call SET status = 'FAILED' WHERE id = ?", callId);

        sendKey("1").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(ASKED_FOR_MONEY_TEXT));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "ASKED_FOR_MONEY");
    }

    @Test
    void ignoresAKeyOnACallThatWasSkipped() throws Exception {
        jdbcTemplate.update("UPDATE post_visit_call SET status = 'SKIPPED' WHERE id = ?", callId);

        sendKey("1").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(NO_VALID_KEY_TEXT));

        assertThat(callRow()).containsEntry("status", "SKIPPED").containsEntry("answer", null);
    }

    @Test
    void answersAnUnknownCallWithTheNoKeySentenceAndLogsItsId(CapturedOutput output) throws Exception {
        long unknown = callId + 1000;

        sendKey(unknown, CALL_UUID, "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value(NO_VALID_KEY_TEXT));

        assertThat(output).contains("Ignored a key for post-visit call " + unknown);
    }

    @Test
    void ignoresAKeyWhoseCallIdDoesNotMatchTheStoredOne() throws Exception {
        sendKey(callId, "another-call-uuid", "1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].text").value(NO_VALID_KEY_TEXT));

        assertThat(callRow()).containsEntry("status", "CALLING").containsEntry("answer", null);
    }

    @Test
    void recordsAKeyThatArrivesBeforeTheCallIdIsStored() throws Exception {
        PostVisitCallFixtures fixtures = new PostVisitCallFixtures(jdbcTemplate);
        long visitId =
                fixtures.createJoinedVisit(fixtures.createAgency(), OffsetDateTime.parse("2026-11-23T11:00:00+01:00"));
        callId = fixtures.insertCall(visitId, "CALLING", null);

        sendKey("1").andExpect(status().isOk()).andExpect(jsonPath("$[0].text").value(ASKED_FOR_MONEY_TEXT));

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "ASKED_FOR_MONEY");
    }

    @Test
    void answersAnInternalErrorWhenTheDatabaseFailsSoVonageRetries() throws Exception {
        doThrow(new DataAccessResourceFailureException("database down"))
                .when(repository)
                .findWithLockById(anyLong());

        sendKey("1")
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
    }

    // Event webhook

    @ParameterizedTest
    @ValueSource(strings = {"busy", "unanswered", "rejected", "failed", "timeout", "cancelled", "machine"})
    void marksTheCallNotReachedWhenItNeverReachedTheVisitor(String event) throws Exception {
        sendEvent(event).andExpect(status().isNoContent());

        assertThat(callRow()).containsEntry("status", "NOT_REACHED");
    }

    @Test
    void marksACallCompletedWithNoKeyAsNotReached() throws Exception {
        sendEvent("completed").andExpect(status().isNoContent());

        assertThat(callRow()).containsEntry("status", "NOT_REACHED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"started", "ringing", "answered", "human", "input", "disconnected"})
    void ignoresTheStatusesOfACallInProgress(String event) throws Exception {
        sendEvent(event).andExpect(status().isNoContent());

        assertThat(callRow()).containsEntry("status", "CALLING");
    }

    @Test
    void neverChangesAnAnswerAlreadyRecorded() throws Exception {
        sendKey("1").andExpect(status().isOk());

        sendEvent("completed").andExpect(status().isNoContent());
        sendEvent("busy").andExpect(status().isNoContent());

        assertThat(callRow()).containsEntry("status", "ANSWERED").containsEntry("answer", "ASKED_FOR_MONEY");
    }

    @Test
    void acceptsAnEventAboutAnUnknownCallAndLogsItsId(CapturedOutput output) throws Exception {
        long unknown = callId + 1000;

        sendEvent(unknown, CALL_UUID, "busy").andExpect(status().isNoContent());

        assertThat(output).contains("Ignored an event for post-visit call " + unknown);
    }

    @Test
    void ignoresAnEventWhoseCallIdDoesNotMatchTheStoredOne() throws Exception {
        sendEvent(callId, "another-call-uuid", "busy").andExpect(status().isNoContent());

        assertThat(callRow()).containsEntry("status", "CALLING");
    }

    @Test
    void answersAnInternalErrorWhenTheDatabaseFailsOnAnEvent() throws Exception {
        doThrow(new DataAccessResourceFailureException("database down"))
                .when(repository)
                .findWithLockById(anyLong());

        sendEvent("busy").andExpect(status().isInternalServerError());
    }

    // Signature

    @Test
    void refusesBothWebhooksWithoutASignature() throws Exception {
        expectSignatureInvalid(mockMvc.perform(post("/api/webhooks/voice/input")
                .param("callId", String.valueOf(callId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(keyBody(CALL_UUID, "1"))));
        expectSignatureInvalid(mockMvc.perform(post("/api/webhooks/voice/event")
                .param("callId", String.valueOf(callId))
                .contentType(MediaType.APPLICATION_JSON)
                .content(eventBody(CALL_UUID, "busy"))));

        assertThat(callRow()).containsEntry("status", "CALLING").containsEntry("answer", null);
    }

    @Test
    void refusesBothWebhooksSignedWithAnotherSecret() throws Exception {
        String key = keyBody(CALL_UUID, "1");
        String event = eventBody(CALL_UUID, "busy");

        expectSignatureInvalid(mockMvc.perform(post("/api/webhooks/voice/input")
                .param("callId", String.valueOf(callId))
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor("another-secret", key))
                .contentType(MediaType.APPLICATION_JSON)
                .content(key)));
        expectSignatureInvalid(mockMvc.perform(post("/api/webhooks/voice/event")
                .param("callId", String.valueOf(callId))
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor("another-secret", event))
                .contentType(MediaType.APPLICATION_JSON)
                .content(event)));

        assertThat(callRow()).containsEntry("status", "CALLING");
    }

    @Test
    void refusesAValidTokenSentWithAForgedKey() throws Exception {
        // A JWT that leaked, such as through the ngrok inspector, can't record a "no" before the real "yes"
        String signedByVonage = keyBody(CALL_UUID, "1");

        expectSignatureInvalid(mockMvc.perform(post("/api/webhooks/voice/input")
                .param("callId", String.valueOf(callId))
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor(SECRET, signedByVonage))
                .contentType(MediaType.APPLICATION_JSON)
                .content(keyBody(CALL_UUID, "2"))));

        assertThat(callRow()).containsEntry("status", "CALLING").containsEntry("answer", null);
    }

    // Personal data

    @Test
    void neverLogsThePhoneTheNameOrTheAnswer(CapturedOutput output) throws Exception {
        sendKey("1").andExpect(status().isOk());
        sendEvent("completed").andExpect(status().isNoContent());

        assertThat(output).contains("Recorded the answer of post-visit call " + callId);
        assertThat(output).doesNotContain(VISITOR_PHONE, VISITOR_NAME, "ASKED_FOR_MONEY", "NOT_ASKED");
    }

    private ResultActions sendKey(String digits) throws Exception {
        return sendKey(callId, CALL_UUID, digits);
    }

    private ResultActions sendKey(long id, String callUuid, String digits) throws Exception {
        String body = keyBody(callUuid, digits);
        return mockMvc.perform(post("/api/webhooks/voice/input")
                .param("callId", String.valueOf(id))
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor(SECRET, body))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private ResultActions sendEvent(String event) throws Exception {
        return sendEvent(callId, CALL_UUID, event);
    }

    private ResultActions sendEvent(long id, String callUuid, String event) throws Exception {
        String body = eventBody(callUuid, event);
        return mockMvc.perform(post("/api/webhooks/voice/event")
                .param("callId", String.valueOf(id))
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor(SECRET, body))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private static void expectSignatureInvalid(ResultActions result) throws Exception {
        result.andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"));
    }

    // The test transaction never commits, so the changes are written by hand before reading them with SQL
    private Map<String, Object> callRow() {
        entityManager.flush();
        return jdbcTemplate.queryForMap("SELECT status, answer FROM post_visit_call WHERE id = ?", callId);
    }

    private OffsetDateTime answeredAt() {
        entityManager.flush();
        return jdbcTemplate.queryForObject(
                "SELECT answered_at FROM post_visit_call WHERE id = ?", OffsetDateTime.class, callId);
    }

    // Shaped as the input webhook of the Voice API reference
    private static String keyBody(String callUuid, String digits) {
        return """
                {"speech":{"results":[]},"dtmf":{"digits":"%s","timed_out":%s},"from":"34911067298",
                 "to":"34600000001","uuid":"%s","conversation_uuid":"CON-1",
                 "timestamp":"2026-11-23T10:47:00.000Z"}
                """.formatted(digits, digits.isEmpty(), callUuid);
    }

    private static String eventBody(String callUuid, String event) {
        return """
                {"from":"34911067298","to":"34600000001","uuid":"%s","conversation_uuid":"CON-1",
                 "status":"%s","direction":"outbound","timestamp":"2026-11-23T10:47:00.000Z"}
                """.formatted(callUuid, event);
    }
}
