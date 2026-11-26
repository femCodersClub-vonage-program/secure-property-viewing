package com.peephole.server.visit;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

// Read-only queries for the agency dashboard and the post-visit call. The dashboard ones join property for its agency
// and its title in the same query, instead of asking PropertyService for each visit, so a list of visits is one
// query. They use JdbcClient instead of VisitRepository because they return rows from several tables, not entities
@Component
class VisitQueries {

    private static final String VISIT_COLUMNS =
            "SELECT v.id, s.starts_at, s.ends_at, v.visitor_name, p.title, v.status ";

    private static final String VISITS_OF_AGENCY = """
            FROM visit v
            JOIN visit_slot s ON s.id = v.visit_slot_id
            JOIN property p ON p.id = v.property_id
            WHERE p.agency_id = :agencyId
            """;

    private final JdbcClient jdbcClient;

    VisitQueries(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // A visit in progress counts until it ends, so the agent can still join it
    long countNotEndedWithStatus(long agencyId, VisitStatus status, OffsetDateTime from, OffsetDateTime to) {
        return jdbcClient
                .sql("SELECT count(*) " + VISITS_OF_AGENCY
                        + " AND v.status = :status AND s.ends_at > :from AND s.starts_at < :to")
                .param("agencyId", agencyId)
                .param("status", status.name())
                .param("from", from)
                .param("to", to)
                .query(Long.class)
                .single();
    }

    // A visit in progress stays in the list until it ends, so the agent can still join it
    List<AgencyVisit> findNotEndedWithStatus(long agencyId, VisitStatus status, OffsetDateTime from, int limit) {
        return jdbcClient
                .sql(VISIT_COLUMNS + VISITS_OF_AGENCY
                        + " AND v.status = :status AND s.ends_at > :from ORDER BY s.starts_at, v.id LIMIT :limit")
                .param("agencyId", agencyId)
                .param("status", status.name())
                .param("from", from)
                .param("limit", limit)
                .query(VisitQueries::toAgencyVisit)
                .list();
    }

    List<AgencyVisit> findBetween(long agencyId, OffsetDateTime from, OffsetDateTime to) {
        return jdbcClient
                .sql(VISIT_COLUMNS + VISITS_OF_AGENCY
                        + " AND s.starts_at >= :from AND s.starts_at < :to ORDER BY s.starts_at, v.id")
                .param("agencyId", agencyId)
                .param("from", from)
                .param("to", to)
                .query(VisitQueries::toAgencyVisit)
                .list();
    }

    List<AgencyVisit> findAmong(long agencyId, Collection<Long> visitIds) {
        if (visitIds.isEmpty()) {
            return List.of();
        }
        return jdbcClient
                .sql(VISIT_COLUMNS + VISITS_OF_AGENCY + " AND v.id IN (:visitIds) ORDER BY s.starts_at, v.id")
                .param("agencyId", agencyId)
                .param("visitIds", visitIds)
                .query(VisitQueries::toAgencyVisit)
                .list();
    }

    // Only visits the visitor actually joined, so the call can talk about "the video visit you just had"
    List<EndedVisit> findJoinedEndedBetween(OffsetDateTime after, OffsetDateTime upTo) {
        return jdbcClient
                .sql("""
                        SELECT v.id, v.visitor_phone, s.ends_at
                        FROM visit v
                        JOIN visit_slot s ON s.id = v.visit_slot_id
                        WHERE v.status = :status AND v.visitor_joined_at IS NOT NULL
                          AND s.ends_at > :after AND s.ends_at <= :upTo
                        ORDER BY s.ends_at, v.id
                        """)
                .param("status", VisitStatus.CONFIRMED.name())
                .param("after", after)
                .param("upTo", upTo)
                .query((row, rowNumber) -> new EndedVisit(
                        row.getLong("id"),
                        row.getString("visitor_phone"),
                        row.getObject("ends_at", OffsetDateTime.class)))
                .list();
    }

    Optional<VisitForMessage> findForMessage(long visitId) {
        return jdbcClient
                .sql("""
                        SELECT v.id, v.visitor_phone, p.title, s.starts_at
                        FROM visit v
                        JOIN visit_slot s ON s.id = v.visit_slot_id
                        JOIN property p ON p.id = v.property_id
                        WHERE v.id = :visitId
                        """)
                .param("visitId", visitId)
                .query((row, rowNumber) -> new VisitForMessage(
                        row.getLong("id"),
                        row.getString("visitor_phone"),
                        row.getString("title"),
                        row.getObject("starts_at", OffsetDateTime.class)))
                .optional();
    }

    private static AgencyVisit toAgencyVisit(ResultSet row, int rowNumber) throws SQLException {
        return new AgencyVisit(
                row.getLong("id"),
                row.getObject("starts_at", OffsetDateTime.class),
                row.getObject("ends_at", OffsetDateTime.class),
                row.getString("visitor_name"),
                row.getString("title"),
                row.getString("status"));
    }
}
