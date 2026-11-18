package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySummaryResponse;
import com.peephole.server.agency.dto.AgencyVisitResponse;
import com.peephole.server.agency.dto.UpcomingVisitResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
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

    // From the start of `from` to the start of the day after `to` in the agency's time zone, so both days are
    // included and a week with a clock change still covers every visit
    @Transactional(readOnly = true)
    List<AgencyVisitResponse> visits(long agencyId, LocalDate from, LocalDate to) {
        return queries
                .findVisitsBetween(
                        agencyId,
                        from.atStartOfDay(AGENCY_ZONE).toOffsetDateTime(),
                        to.plusDays(1).atStartOfDay(AGENCY_ZONE).toOffsetDateTime())
                .stream()
                .map(AgencyDashboardService::toAgencyVisit)
                .toList();
    }

    private static UpcomingVisitResponse toUpcomingVisit(DashboardVisit visit) {
        return new UpcomingVisitResponse(
                visit.id(), inAgencyZone(visit.startsAt()), visit.visitorName(), visit.propertyTitle());
    }

    private static AgencyVisitResponse toAgencyVisit(DashboardVisit visit) {
        return new AgencyVisitResponse(
                visit.id(),
                inAgencyZone(visit.startsAt()),
                inAgencyZone(visit.endsAt()),
                visit.visitorName(),
                visit.propertyTitle(),
                visit.status());
    }

    private static OffsetDateTime inAgencyZone(OffsetDateTime time) {
        return time.atZoneSameInstant(AGENCY_ZONE).toOffsetDateTime();
    }
}
