package com.peephole.server.videovisit;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

// Booking (#73) doesn't exist yet, so the tests write a visit straight into the tables it would fill
final class VideoVisitFixtures {

    // The example of the spec: a visit from 11:00 to 11:30, so the room is open from 10:50 to 11:45
    static final OffsetDateTime STARTS_AT = OffsetDateTime.parse("2026-11-23T11:00:00+01:00");

    private final JdbcTemplate jdbcTemplate;

    VideoVisitFixtures(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    long createAgency() {
        return jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Video Test Agency",
                "agency.video-test@peephole.example",
                "+34600000000");
    }

    long createVisit(long agencyId, String status) {
        return createVisit(agencyId, status, STARTS_AT);
    }

    // Every visit lasts 30 minutes, like the demo slots
    long createVisit(long agencyId, String status, OffsetDateTime startsAt) {
        Long propertyId = jdbcTemplate.queryForObject("""
                INSERT INTO property (agency_id, title, operation, property_type, price_euros, area, address,
                    bedrooms, size_m2, description, video_visit_available, status)
                VALUES (?, 'Video test flat', 'RENT', 'APARTMENT', 1200, 'Gràcia', 'Fictional test address',
                    2, 70, 'A flat for the video visit tests', true, 'ACTIVE')
                RETURNING id
                """, Long.class, agencyId);
        Long slotId = jdbcTemplate.queryForObject(
                "INSERT INTO visit_slot (property_id, starts_at, ends_at, status) VALUES (?, ?, ?, 'BOOKED')"
                        + " RETURNING id",
                Long.class,
                propertyId,
                startsAt,
                startsAt.plusMinutes(30));
        Long verificationId = jdbcTemplate.queryForObject(
                "INSERT INTO phone_verification (purpose, phone_hash, vonage_request_id, status)"
                        + " VALUES ('VISIT', ?, 'video-test-request', 'VERIFIED') RETURNING id",
                Long.class,
                "video-test-" + UUID.randomUUID());
        return jdbcTemplate.queryForObject(
                "INSERT INTO visit (property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone,"
                        + " status) VALUES (?, ?, ?, 'Laura Test', '+34600000001', ?) RETURNING id",
                Long.class,
                propertyId,
                slotId,
                verificationId,
                status);
    }

    // For the tests that run without a test transaction, so nothing is rolled back on its own
    void deleteAgencyAndItsVisits(long agencyId) {
        jdbcTemplate.update(
                "DELETE FROM video_access WHERE visit_id IN"
                        + " (SELECT v.id FROM visit v JOIN property p ON p.id = v.property_id WHERE p.agency_id = ?)",
                agencyId);
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
