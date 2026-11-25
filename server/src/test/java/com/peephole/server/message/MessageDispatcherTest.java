package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.MessageSendException;
import com.peephole.server.vonage.MessageSender;
import jakarta.persistence.EntityManager;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@ExtendWith(OutputCaptureExtension.class)
class MessageDispatcherTest {

    private static final String PHONE = "+34611222333";
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2099-01-01T12:00:00Z");
    private static final String TEXT =
            "Peephole: your video visit for Bright test flat is confirmed for Thursday 1 January at 15:00.";
    private static final String MESSAGE_UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";

    @Autowired
    private MessageDispatcher dispatcher;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private EntityManager entityManager;

    @MockitoBean
    private MessageSender messageSender;

    private long visitId;

    @BeforeEach
    void createVisit() {
        long agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Message Test Agency",
                "message-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
        long propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Bright test flat', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for message tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
        long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                OffsetDateTime.parse("2099-01-01T14:00:00Z"),
                OffsetDateTime.parse("2099-01-01T14:30:00Z"));
        long verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, verified_at)"
                        + " VALUES ('VISIT', 'message-test-hash', 'message-test-request', 'VERIFIED', ?) RETURNING id",
                Long.class,
                NOW);
        visitId = jdbcTemplate.queryForObject("""
                INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone,
                    status, created_at)
                VALUES (?, ?, ?, 'Laura', ?, 'CONFIRMED', ?)
                RETURNING id
                """, Long.class, propertyId, slotId, verificationId, PHONE, NOW);
    }

    @Test
    void sendsADueConfirmationAndMarksItSubmitted() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "SUBMITTED").containsEntry("vonage_message_id", MESSAGE_UUID);
    }

    @Test
    void leavesAMessageThatIsNotDueYet() {
        long id = message(NOW.plusMinutes(1));

        dispatcher.sendDueMessages(NOW);

        verify(messageSender, never()).sendSms(any(), any(), eq(String.valueOf(id)));
        assertThat(stored(id)).containsEntry("status", "SCHEDULED");
    }

    @Test
    void keepsAMessageScheduledAfterATemporaryError() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id)))
                .thenThrow(new MessageSendException("Vonage answered 503 when sending message " + id, true));

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "SCHEDULED").containsEntry("vonage_message_id", null);
    }

    @Test
    void failsAMessageAfterAPermanentError() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id)))
                .thenThrow(new MessageSendException("Vonage answered 422 when sending message " + id, false));

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "FAILED");
    }

    @Test
    void stillSendsAMessageDueTenMinutesAgo() {
        long id = message(NOW.minusMinutes(10));
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "SUBMITTED");
    }

    @Test
    void failsAMessageWhoseRetryWindowHasPassedWithoutSendingIt() {
        long id = message(NOW.minusMinutes(10).minusSeconds(1));

        dispatcher.sendDueMessages(NOW);

        verify(messageSender, never()).sendSms(any(), any(), eq(String.valueOf(id)));
        assertThat(stored(id)).containsEntry("status", "FAILED");
    }

    @Test
    void keepsSendingTheOtherMessagesAfterAnUnexpectedError(CapturedOutput output) {
        long first = message(NOW);
        long second = message(NOW);
        when(messageSender.sendSms(any(), any(), any()))
                .thenThrow(new IllegalStateException("Unexpected answer for " + PHONE))
                .thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(List.of(stored(first).get("status"), stored(second).get("status")))
                .containsExactlyInAnyOrder("SUBMITTED", "SCHEDULED");
        assertThat(output).contains("IllegalStateException").doesNotContain("611222333");
    }

    @Test
    void neverLogsThePhoneOrTheText(CapturedOutput output) {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(output)
                .contains("Sent message " + id)
                .doesNotContain("611222333")
                .doesNotContain("Bright test flat");
    }

    private long message(OffsetDateTime scheduledAt) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO message (visit_id, type, channel, status, scheduled_at)"
                        + " VALUES (?, 'CONFIRMATION', 'SMS', 'SCHEDULED', ?) RETURNING id",
                Long.class,
                visitId,
                scheduledAt);
    }

    private Map<String, Object> stored(long id) {
        entityManager.flush();
        return jdbcTemplate.queryForMap("SELECT status, vonage_message_id FROM message WHERE id = ?", id);
    }
}
