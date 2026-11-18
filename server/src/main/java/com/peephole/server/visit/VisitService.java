package com.peephole.server.visit;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitService {

    private final VisitRepository repository;
    private final VisitQueries queries;

    VisitService(VisitRepository repository, VisitQueries queries) {
        this.repository = repository;
        this.queries = queries;
    }

    /** Locks the visit until the caller's transaction ends, so its checks and writes see no other change. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<BookedVisit> lock(long visitId) {
        return repository.findWithLockById(visitId).map(this::toBookedVisit);
    }

    /**
     * The visit's video session, created with {@code createSession} the first time. Call {@link #lock} first in the
     * same transaction, so two people entering at the same moment get the same session.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public String videoSessionId(long visitId, Supplier<String> createSession) {
        Visit visit = repository
                .findWithLockById(visitId)
                .orElseThrow(() -> new IllegalStateException("Visit " + visitId + " was not found"));
        return visit.getVideoSessionId().orElseGet(() -> {
            String sessionId = createSession.get();
            visit.assignVideoSession(sessionId);
            return sessionId;
        });
    }

    /** How many confirmed visits of the agency start from {@code from}, included, to {@code to}, excluded. */
    @Transactional(readOnly = true)
    public long countConfirmedVisits(long agencyId, OffsetDateTime from, OffsetDateTime to) {
        return queries.countWithStatus(agencyId, VisitStatus.CONFIRMED, from, to);
    }

    /** The first {@code limit} confirmed visits of the agency that start from {@code from}, by start time. */
    @Transactional(readOnly = true)
    public List<AgencyVisit> nextConfirmedVisits(long agencyId, OffsetDateTime from, int limit) {
        return queries.findWithStatusFrom(agencyId, VisitStatus.CONFIRMED, from, limit);
    }

    /** Every visit of the agency, in any status, that starts from {@code from}, included, to {@code to}, excluded. */
    @Transactional(readOnly = true)
    public List<AgencyVisit> visitsBetween(long agencyId, OffsetDateTime from, OffsetDateTime to) {
        return queries.findBetween(agencyId, from, to);
    }

    private BookedVisit toBookedVisit(Visit visit) {
        return new BookedVisit(
                visit.getId(),
                visit.getStatus() == VisitStatus.CONFIRMED,
                visit.getSlot().getStartsAt().toInstant(),
                visit.getSlot().getEndsAt().toInstant(),
                repository.findAgencyIdOfProperty(visit.getPropertyId()));
    }
}
