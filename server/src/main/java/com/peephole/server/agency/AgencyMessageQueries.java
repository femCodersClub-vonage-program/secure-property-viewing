package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencyMessageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

// Read-only. It joins the tables of other features, as AgencyDashboardQueries reads them, so the list and the names of
// its recipients are one query. Everything that writes messages belongs to the messages feature (#87)
@Component
class AgencyMessageQueries {

    private final JdbcClient jdbcClient;

    AgencyMessageQueries(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    // The MVP has a single agency, so messages about listing requests, in any status, are not filtered by agency.
    // With several agencies, they would show the owners' names to all of them
    List<AgencyMessageResponse> findByAgency(long agencyId) {
        return jdbcClient
                .sql("""
                    SELECT m.id, m.type, m.channel, coalesce(v.visitor_name, r.owner_full_name) AS recipient_name,
                        m.visit_id, m.listing_request_id, m.scheduled_at, m.updated_at, m.status
                    FROM message m
                    LEFT JOIN visit v ON v.id = m.visit_id
                    LEFT JOIN property p ON p.id = v.property_id
                    LEFT JOIN listing_request r ON r.id = m.listing_request_id
                    WHERE p.agency_id = :agencyId OR m.listing_request_id IS NOT NULL
                    ORDER BY m.updated_at DESC, m.id DESC
                    """)
                .param("agencyId", agencyId)
                .query((row, index) -> new AgencyMessageResponse(
                        row.getLong("id"),
                        row.getString("type"),
                        row.getString("channel"),
                        row.getString("recipient_name"),
                        row.getObject("visit_id", Long.class),
                        row.getObject("listing_request_id", Long.class),
                        AgencyDashboardService.inAgencyZone(row.getObject("scheduled_at", OffsetDateTime.class)),
                        AgencyDashboardService.inAgencyZone(row.getObject("updated_at", OffsetDateTime.class)),
                        row.getString("status")))
                .list();
    }
}
