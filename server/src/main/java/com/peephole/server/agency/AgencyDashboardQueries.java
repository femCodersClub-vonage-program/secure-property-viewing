package com.peephole.server.agency;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

// Read-only counts for the dashboard. They read listing_request and property directly until those features expose
// the counts in their services: the listing feature, with the agency's review in #57, for the pending requests and
// the catalog (#52) for the active properties. The visits come from VisitService
@Component
class AgencyDashboardQueries {

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
}
