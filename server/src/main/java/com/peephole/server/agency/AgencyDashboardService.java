package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySummaryResponse;
import com.peephole.server.agency.dto.UpcomingVisitResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AgencyDashboardService {

    // The dashboard shows every time in the agency's time zone, as the spec examples do
    private static final ZoneId AGENCY_ZONE = ZoneId.of("Europe/Madrid");
    private static final Duration UPCOMING_PERIOD = Duration.ofDays(7);
    private static final int NEXT_VISITS = 5;

    private final AgencyDashboardQueries queries;
    private final Clock clock;

    AgencyDashboardService(AgencyDashboardQueries queries, Clock clock) {
        this.queries = queries;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    AgencySummaryResponse summary(long agencyId, String agentName) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        return new AgencySummaryResponse(
                agentName,
                queries.countPendingListingRequests(),
                queries.countConfirmedVisits(agencyId, now, now.plus(UPCOMING_PERIOD)),
                queries.countActiveProperties(agencyId),
                queries.findConfirmedVisitsFrom(agencyId, now, NEXT_VISITS).stream()
                        .map(AgencyDashboardService::toUpcomingVisit)
                        .toList());
    }

    private static UpcomingVisitResponse toUpcomingVisit(DashboardVisit visit) {
        return new UpcomingVisitResponse(
                visit.id(), inAgencyZone(visit.startsAt()), visit.visitorName(), visit.propertyTitle());
    }

    private static OffsetDateTime inAgencyZone(OffsetDateTime time) {
        return time.atZoneSameInstant(AGENCY_ZONE).toOffsetDateTime();
    }
}
