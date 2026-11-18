package com.peephole.server.visit;

import java.util.Optional;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitService {

    private final VisitRepository repository;

    VisitService(VisitRepository repository) {
        this.repository = repository;
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

    private BookedVisit toBookedVisit(Visit visit) {
        return new BookedVisit(
                visit.getId(),
                visit.getStatus() == VisitStatus.CONFIRMED,
                visit.getSlot().getStartsAt().toInstant(),
                visit.getSlot().getEndsAt().toInstant(),
                repository.findAgencyIdOfProperty(visit.getPropertyId()));
    }
}
