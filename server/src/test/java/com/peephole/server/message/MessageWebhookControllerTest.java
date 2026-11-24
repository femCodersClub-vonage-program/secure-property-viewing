package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.peephole.server.vonage.TestVoiceWebhookTokens;
import jakarta.persistence.EntityManager;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.convention.TestBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@ExtendWith(OutputCaptureExtension.class)
@TestPropertySource(properties = "app.vonage.messages.signature-secret=" + MessageWebhookControllerTest.SECRET)
class MessageWebhookControllerTest {

    static final String SECRET = "test-messages-signature-secret";
    private static final String STATUS_PATH = "/api/webhooks/messages/status";
    private static final String INBOUND_PATH = "/api/webhooks/messages/inbound";
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2099-01-01T12:00:00Z");
    private static final String MESSAGE_UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @TestBean
    private Clock clock;

    static Clock clock() {
        return Clock.fixed(NOW.toInstant(), ZoneOffset.UTC);
    }

    private long visitId;

    @BeforeEach
    void createVisit() {
        long agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Message Webhook Test Agency",
                "message-webhook-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
        long propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Bright test flat', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for message webhook tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
        long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                NOW.plusHours(2),
                NOW.plusHours(2).plusMinutes(30));
        long verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, verified_at)"
                        + " VALUES ('VISIT', 'message-webhook-hash', 'message-webhook-request', 'VERIFIED', ?)"
                        + " RETURNING id",
                Long.class,
                NOW);
        visitId = jdbcTemplate.queryForObject("""
                INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone,
                    status, created_at)
                VALUES (?, ?, ?, 'Laura', '+34611222333', 'CONFIRMED', ?)
                RETURNING id
                """, Long.class, propertyId, slotId, verificationId, NOW);
    }

    // The table of statuses in specs/messages.md

    @Test
    void marksADeliveredMessageDelivered() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "delivered")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "DELIVERED");
    }

    @Test
    void failsARejectedMessage() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "rejected")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "FAILED");
    }

    @Test
    void schedulesAnUndeliverableMessageAgainWithinItsRetryWindow() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "undeliverable")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "SCHEDULED").containsEntry("vonage_message_id", null);
    }

    @Test
    void failsAnUndeliverableMessageAfterItsRetryWindow() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(11));

        sendStatus(statusBody(id, MESSAGE_UUID, "undeliverable")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "FAILED");
    }

    @Test
    void neverChangesADeliveredMessage() throws Exception {
        long id = message("DELIVERED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "rejected")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "DELIVERED");
    }

    // Vonage's status may arrive before its answer to the send is saved
    @Test
    void acceptsAStatusThatArrivesBeforeTheMessageUuidIsSaved() throws Exception {
        long id = message("SCHEDULED", null, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "submitted")).andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "SUBMITTED").containsEntry("vonage_message_id", MESSAGE_UUID);
    }

    // A local test's status reaching Railway could carry the id of another message
    @Test
    void ignoresAStatusForAnotherMessageUuid() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, "bbbbbbbb-bbbb-cccc-dddd-0123456789ab", "rejected"))
                .andExpect(status().isOk());

        assertThat(stored(id)).containsEntry("status", "SUBMITTED");
    }

    @Test
    void answersOkToAStatusForAnUnknownMessage(CapturedOutput output) throws Exception {
        sendStatus(statusBody(999_999_999L, MESSAGE_UUID, "delivered")).andExpect(status().isOk());

        assertThat(output).contains("Ignored a status for message 999999999");
    }

    // Signature

    @Test
    void rejectsAStatusWithoutAValidSignature() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));
        String body = statusBody(id, MESSAGE_UUID, "rejected");

        mockMvc.perform(post(STATUS_PATH)
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                TestVoiceWebhookTokens.authorizationFor("another-secret", body))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"));

        assertThat(stored(id)).containsEntry("status", "SUBMITTED");
    }

    @Test
    void rejectsAValidTokenThatCameWithAnotherBody() throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        mockMvc.perform(post(STATUS_PATH)
                        .header(
                                HttpHeaders.AUTHORIZATION,
                                TestVoiceWebhookTokens.authorizationFor(
                                        SECRET, statusBody(id, MESSAGE_UUID, "delivered")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(statusBody(id, MESSAGE_UUID, "rejected")))
                .andExpect(status().isUnauthorized());

        assertThat(stored(id)).containsEntry("status", "SUBMITTED");
    }

    // The inbound webhook

    @Test
    void answersOkToASignedInboundMessageWithoutLoggingIt(CapturedOutput output) throws Exception {
        String body = "{\"from\":\"34611222333\",\"text\":\"A private reply\",\"channel\":\"sms\"}";

        mockMvc.perform(post(INBOUND_PATH)
                        .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor(SECRET, body))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        assertThat(output).doesNotContain("611222333").doesNotContain("A private reply");
    }

    @Test
    void rejectsAnInboundMessageWithoutAValidSignature() throws Exception {
        mockMvc.perform(post(INBOUND_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("WEBHOOK_SIGNATURE_INVALID"));
    }

    @Test
    void neverLogsThePhoneOfAStatus(CapturedOutput output) throws Exception {
        long id = message("SUBMITTED", MESSAGE_UUID, NOW.minusMinutes(1));

        sendStatus(statusBody(id, MESSAGE_UUID, "delivered")).andExpect(status().isOk());

        assertThat(output).doesNotContain("611222333");
    }

    private ResultActions sendStatus(String body) throws Exception {
        return mockMvc.perform(post(STATUS_PATH)
                .header(HttpHeaders.AUTHORIZATION, TestVoiceWebhookTokens.authorizationFor(SECRET, body))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    // The shape of the SMS status webhook in the Messages API reference
    private static String statusBody(long messageId, String messageUuid, String status) {
        return "{\"message_uuid\":\"" + messageUuid + "\",\"to\":\"34611222333\",\"from\":\"Peephole\","
                + "\"timestamp\":\"2099-01-01T12:00:00Z\",\"status\":\"" + status + "\",\"channel\":\"sms\","
                + "\"client_ref\":\"" + messageId + "\"}";
    }

    private long message(String status, String vonageMessageId, OffsetDateTime scheduledAt) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO message (visit_id, type, channel, status, vonage_message_id, scheduled_at)"
                        + " VALUES (?, 'CONFIRMATION', 'SMS', ?, ?, ?) RETURNING id",
                Long.class,
                visitId,
                status,
                vonageMessageId,
                scheduledAt);
    }

    private Map<String, Object> stored(long id) {
        entityManager.flush();
        return jdbcTemplate.queryForMap("SELECT status, vonage_message_id FROM message WHERE id = ?", id);
    }
}
