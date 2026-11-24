package com.peephole.server.postvisitcall;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

// Writes visits and calls straight into their tables, so these tests don't go through booking or the video room
final class PostVisitCallFixtures {

    static final String VISITOR_NAME = "Laura Test";
    static final String VISITOR_PHONE = "+34600000001";
    static final String PROPERTY_TITLE = "Call test flat";

    private final JdbcTemplate jdbcTemplate;

    PostVisitCallFixtures(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    long createAgency() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Call Test Agency",
                "agency.call-test-" + UUID.randomUUID() + "@peephole.example",
                "+34600000000");
    }

    /** A confirmed visit of 30 minutes whose visitor entered the room. */
    long createJoinedVisit(long agencyId, OffsetDateTime startsAt) {
        return createVisit(agencyId, "CONFIRMED", startsAt, startsAt.plusMinutes(1));
    }

    // joinedAt is null when the visitor never entered the room
    long createVisit(long agencyId, String status, OffsetDateTime startsAt, OffsetDateTime joinedAt) {
        Long propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, ?, 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for the post-visit call tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId, PROPERTY_TITLE);
        Long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                startsAt,
                startsAt.plusMinutes(30));
        Long verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status)"
                        + " VALUES ('VISIT', ?, 'call-test-request', 'VERIFIED') RETURNING id",
                Long.class,
                "call-test-" + UUID.randomUUID());
        return jdbcTemplate.queryForObject(
                "INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone,"
                        + " status, visitor_joined_at) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
                Long.class,
                propertyId,
                slotId,
                verificationId,
                VISITOR_NAME,
                VISITOR_PHONE,
                status,
                joinedAt);
    }

    long insertCall(long visitId, String status, String callUuid) {
        return insertCall(visitId, status, callUuid, null, null);
    }

    long insertCall(long visitId, String status, String callUuid, String answer, OffsetDateTime answeredAt) {
        return jdbcTemplate.queryForObject(
                "INSERT INTO post_visit_call (visit_id, vonage_call_uuid, status, answer, answered_at)"
                        + " VALUES (?, ?, ?, ?, ?) RETURNING id",
                Long.class,
                visitId,
                callUuid,
                status,
                answer,
                answeredAt);
    }

    // For the tests that run without a test transaction, so nothing is rolled back on its own
    void deleteAgencyAndItsVisits(long agencyId) {
        String visitsOfAgency =
                "SELECT v.id FROM visit v JOIN property p ON p.id = v.property_id WHERE p.agency_id = ?";
        jdbcTemplate.update("DELETE FROM post_visit_call WHERE visit_id IN (" + visitsOfAgency + ")", agencyId);
        List<Long> verificationIds = jdbcTemplate.queryForList(
                "SELECT v.phone_verification_id FROM visit v JOIN property p ON p.id = v.property_id"
                        + " WHERE p.agency_id = ?",
                Long.class,
                agencyId);
        jdbcTemplate.update(
                "DELETE FROM visit WHERE property_id IN (SELECT id FROM property WHERE agency_id = ?)", agencyId);
        verificationIds.forEach(id -> jdbcTemplate.update("DELETE FROM phone_verification WHERE id = ?", id));
        jdbcTemplate.update(
                "DELETE FROM visit_slot WHERE property_id IN (SELECT id FROM property WHERE agency_id = ?)", agencyId);
        jdbcTemplate.update("DELETE FROM property WHERE agency_id = ?", agencyId);
        jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
    }
}
