package com.peephole.server.agency;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

// Read-only queries for the dashboard. They read listing_request, property and visit directly, as VisitRepository
// does for the agency of a property, until those features expose these counts in their services
@Component
class AgencyDashboardQueries {

    private static final String VISITS_OF_AGENCY = """
            FROM visit v
            JOIN visit_slot s ON s.id = v.visit_slot_id
            JOIN property p ON p.id = v.property_id
            WHERE p.agency_id = :agencyId
            """;

    private final JdbcClient jdbcClient;

    AgencyDashboardQueries(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // The MVP has a single agency, and a listing request belongs to no agency until it is approved
    long countPendingListingRequests() {
        return jdbcClient
                .sql("SELECT count(*) FROM listing_request WHERE status = 'PENDING'")
                .query(Long.class)
                .single();
    }

    long countActiveProperties(long agencyId) {
        return jdbcClient
                .sql("SELECT count(*) FROM property WHERE agency_id = :agencyId AND status = 'ACTIVE'")
                .param("agencyId", agencyId)
                .query(Long.class)
                .single();
    }

    long countConfirmedVisits(long agencyId, OffsetDateTime from, OffsetDateTime to) {
        return jdbcClient
                .sql("SELECT count(*) " + VISITS_OF_AGENCY
                        + " AND v.status = 'CONFIRMED' AND s.starts_at >= :from AND s.starts_at < :to")
                .param("agencyId", agencyId)
                .param("from", from)
                .param("to", to)
                .query(Long.class)
                .single();
    }

    List<DashboardVisit> findConfirmedVisitsFrom(long agencyId, OffsetDateTime from, int limit) {
        return jdbcClient
                .sql(
                        "SELECT v.id, s.starts_at, s.ends_at, v.visitor_name, p.title, v.status " + VISITS_OF_AGENCY
                                + " AND v.status = 'CONFIRMED' AND s.starts_at >= :from ORDER BY s.starts_at, v.id LIMIT :limit")
                .param("agencyId", agencyId)
                .param("from", from)
                .param("limit", limit)
                .query(AgencyDashboardQueries::toVisit)
                .list();
    }

    private static DashboardVisit toVisit(ResultSet row, int rowNumber) throws SQLException {
        return new DashboardVisit(
                row.getLong("id"),
                row.getObject("starts_at", OffsetDateTime.class),
                row.getObject("ends_at", OffsetDateTime.class),
                row.getString("visitor_name"),
                row.getString("title"),
                row.getString("status"));
    }
}
