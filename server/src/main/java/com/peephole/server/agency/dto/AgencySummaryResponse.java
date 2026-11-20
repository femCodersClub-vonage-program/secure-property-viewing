package com.peephole.server.agency.dto;

import java.util.List;

public record AgencySummaryResponse(
        String agentName,
        long newRequests,
        long upcomingVisits,
        long activeProperties,
        List<UpcomingVisitResponse> nextVisits) {

    // The agent's name is personal data, so it never reaches a log
    @Override
    public String toString() {
        return "AgencySummaryResponse[newRequests=" + newRequests + ", upcomingVisits=" + upcomingVisits
                + ", activeProperties=" + activeProperties + ", nextVisits=" + nextVisits + "]";
    }
}
