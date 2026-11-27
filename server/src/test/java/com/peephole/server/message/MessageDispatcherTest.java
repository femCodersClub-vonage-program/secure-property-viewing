package com.peephole.server.message;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.peephole.server.vonage.MessageSendException;
import com.peephole.server.vonage.MessageSender;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

// No @Transactional, so the dispatcher runs as it does in production and a transaction around it would show
@SpringBootTest
@ExtendWith(OutputCaptureExtension.class)
class MessageDispatcherTest {

    private static final String PHONE = "+34611222333";
    private static final String OWNER_PHONE = "+34611444555";
    // Before every real message in the database, so the dispatcher only finds the ones each test saves
    private static final OffsetDateTime NOW = OffsetDateTime.parse("2000-01-01T12:00:00Z");
    private static final OffsetDateTime VISIT_STARTS_AT = OffsetDateTime.parse("2099-01-01T14:00:00Z");
    private static final String TEXT =
            "Peephole: your video visit for Bright test flat is confirmed for Thursday 1 January at 15:00.";
    private static final String MESSAGE_UUID = "aaaaaaaa-bbbb-cccc-dddd-0123456789ab";

    @Autowired
    private MessageDispatcher dispatcher;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @MockitoBean
    private MessageSender messageSender;

    private long agencyId;
    private long propertyId;
    private long slotId;
    private long verificationId;
    private long visitId;
    private final List<Long> listingRequestIds = new ArrayList<>();

    @BeforeEach
    void createVisit() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Message Test Agency",
                "message-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
        propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Bright test flat', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for message tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
        slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                VISIT_STARTS_AT,
                VISIT_STARTS_AT.plusMinutes(30));
        verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, verified_at)"
                        + " VALUES ('VISIT', ?, ?, 'VERIFIED', ?) RETURNING id",
                Long.class,
                "message-test-hash-" + UUID.randomUUID(),
                "message-test-request-" + UUID.randomUUID(),
                NOW);
        visitId = jdbcTemplate.queryForObject("""
                INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone,
                    status, created_at)
                VALUES (?, ?, ?, 'Laura', ?, 'CONFIRMED', ?)
                RETURNING id
                """, Long.class, propertyId, slotId, verificationId, PHONE, NOW);
    }

    @AfterEach
    void deleteRows() {
        for (long listingRequestId : listingRequestIds) {
            jdbcTemplate.update("DELETE FROM message WHERE listing_request_id = ?", listingRequestId);
            jdbcTemplate.update("DELETE FROM listing_request WHERE id = ?", listingRequestId);
        }
        jdbcTemplate.update("DELETE FROM phone_verification WHERE vonage_request_id LIKE 'message-test-listing-%'");
        jdbcTemplate.update("DELETE FROM message WHERE visit_id = ?", visitId);
        jdbcTemplate.update("DELETE FROM visit WHERE id = ?", visitId);
        jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", verificationId);
        jdbcTemplate.update("DELETE FROM visit_slot WHERE id = ?", slotId);
        jdbcTemplate.update("DELETE FROM property WHERE id = ?", propertyId);
        jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
    }

    @Test
    void sendsADueConfirmationAndMarksItSubmitted() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "SUBMITTED").containsEntry("vonage_message_id", MESSAGE_UUID);
    }

    @Test
    void callsVonageOutsideAnyTransaction() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive())
                    .isFalse();
            return MESSAGE_UUID;
        });

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "SUBMITTED");
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
        long broken = message(NOW);
        long other = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(broken)))
                .thenThrow(new IllegalStateException("Unexpected answer for " + PHONE));
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(other))).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(broken)).containsEntry("status", "SCHEDULED");
        assertThat(stored(other)).containsEntry("status", "SUBMITTED");
        assertThat(output).contains("IllegalStateException").doesNotContain("611222333");
    }

    // The status webhook can arrive before the dispatcher saves Vonage's answer to the send
    @Test
    void keepsADeliveredStatusThatArrivedWhileSending() {
        long id = message(NOW);
        when(messageSender.sendSms(PHONE, TEXT, String.valueOf(id))).thenAnswer(invocation -> {
            jdbcTemplate.update(
                    "UPDATE message SET status = 'DELIVERED', vonage_message_id = ? WHERE id = ?", MESSAGE_UUID, id);
            return MESSAGE_UUID;
        });

        dispatcher.sendDueMessages(NOW);

        assertThat(stored(id)).containsEntry("status", "DELIVERED");
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

    // Listing requests (#128)

    @Test
    void sendsTheRequestReceivedSmsToTheOwner() {
        long id = listingRequestMessage(listingRequest("PENDING"), "CONFIRMATION");
        when(messageSender.sendSms(eq(OWNER_PHONE), any(), eq(String.valueOf(id))))
                .thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        verify(messageSender)
                .sendSms(
                        OWNER_PHONE,
                        "Peephole: we have received your request for Loft for a test owner."
                                + " The agency will review it and text you with its decision.",
                        String.valueOf(id));
        assertThat(stored(id)).containsEntry("status", "SUBMITTED").containsEntry("vonage_message_id", MESSAGE_UUID);
    }

    @Test
    void tellsTheOwnerTheDecisionOfTheReview() {
        long approved = listingRequestMessage(listingRequest("APPROVED"), "STATUS_UPDATE");
        long rejected = listingRequestMessage(listingRequest("REJECTED"), "STATUS_UPDATE");
        when(messageSender.sendSms(eq(OWNER_PHONE), any(), any())).thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        verify(messageSender)
                .sendSms(
                        OWNER_PHONE,
                        "Peephole: your property Loft for a test owner has been approved and is now published.",
                        String.valueOf(approved));
        verify(messageSender)
                .sendSms(
                        OWNER_PHONE,
                        "Peephole: your request for Loft for a test owner has not been approved.",
                        String.valueOf(rejected));
    }

    @Test
    void neverTellsTheOwnerADecisionThatWasNotMade() {
        long id = listingRequestMessage(listingRequest("PENDING"), "STATUS_UPDATE");

        dispatcher.sendDueMessages(NOW);

        verify(messageSender, never()).sendSms(any(), any(), eq(String.valueOf(id)));
        assertThat(stored(id)).containsEntry("status", "SCHEDULED");
    }

    @Test
    void neverLogsTheOwnersPhoneOrTheTitle(CapturedOutput output) {
        long listingRequestId = listingRequest("PENDING");
        long id = listingRequestMessage(listingRequestId, "CONFIRMATION");
        when(messageSender.sendSms(eq(OWNER_PHONE), any(), eq(String.valueOf(id))))
                .thenReturn(MESSAGE_UUID);

        dispatcher.sendDueMessages(NOW);

        assertThat(output)
                .contains("Sent message " + id + " for listing request " + listingRequestId)
                .doesNotContain("611444555")
                .doesNotContain("Loft for a test owner")
                .doesNotContain("Marta Test");
    }

    private long listingRequest(String status) {
        long verification = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status, verified_at)"
                        + " VALUES ('LISTING_REQUEST', ?, ?, 'VERIFIED', ?) RETURNING id",
                Long.class,
                "message-test-hash-" + UUID.randomUUID(),
                "message-test-listing-" + UUID.randomUUID(),
                NOW);
        long id = jdbcTemplate.queryForObject("""
                INSERT INTO listing_request (phone_verification_id, owner_full_name, owner_phone, title, description,
                    property_type, operation, area, address, price_euros, bedrooms, size_m2, floor, status, created_at)
                VALUES (?, 'Marta Test', ?, 'Loft for a test owner', 'A loft for message tests', 'APARTMENT',
                    'RENT', 'Gràcia', 'Fictional test address', 1200, 1, 50, NULL, ?, ?)
                RETURNING id
                """, Long.class, verification, OWNER_PHONE, status, NOW);
        listingRequestIds.add(id);
        return id;
    }

    private long listingRequestMessage(long listingRequestId, String type) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO message (listing_request_id, type, channel, status, scheduled_at)"
                        + " VALUES (?, ?, 'SMS', 'SCHEDULED', ?) RETURNING id",
                Long.class,
                listingRequestId,
                type,
                NOW);
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
        return jdbcTemplate.queryForMap("SELECT status, vonage_message_id FROM message WHERE id = ?", id);
    }
}
