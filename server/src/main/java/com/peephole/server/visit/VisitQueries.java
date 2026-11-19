package com.peephole.server.visit;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

// Read-only queries for the agency dashboard. They join property for its agency and its title in the same query,
// instead of asking PropertyService for each visit, so a list of visits is one query. They use JdbcClient instead
// of VisitRepository because they return rows from three tables, not Visit entities
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
