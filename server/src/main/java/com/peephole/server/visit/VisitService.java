package com.peephole.server.visit;

import com.peephole.server.common.FieldValidationException;
import com.peephole.server.phoneverification.PhoneVerificationInvalidException;
import com.peephole.server.phoneverification.PhoneVerificationService;
import com.peephole.server.property.PropertyOverview;
import com.peephole.server.property.PropertyService;
import com.peephole.server.visit.dto.VisitBookingRequest;
import com.peephole.server.visit.dto.VisitBookingResponse;
import com.peephole.server.visit.dto.VisitSlotResponse;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Supplier;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VisitService {

    private final VisitRepository repository;
    private final VisitSlotRepository slotRepository;
    private final PhoneVerificationService phoneVerificationService;
    private final PropertyService propertyService;
    private final Clock clock;
    private static final ZoneId MADRID = ZoneId.of("Europe/Madrid");

    VisitService(
            VisitRepository repository,
            VisitSlotRepository slotRepository,
            PhoneVerificationService phoneVerificationService,
            PropertyService propertyService,
            Clock clock) {
        this.repository = repository;
        this.slotRepository = slotRepository;
        this.phoneVerificationService = phoneVerificationService;
        this.propertyService = propertyService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<VisitSlotResponse> availableSlots(long propertyId, LocalDate from, LocalDate to) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        LocalDate today = LocalDate.now(clock.withZone(MADRID));
        if (from != null && to != null && from.isAfter(to)) {
            throw new FieldValidationException("from", "must be on or before to");
        }

        LocalDate firstDay = from == null || from.isBefore(today) ? today : from;
        LocalDate lastAllowedDay = today.plusDays(14);
        LocalDate lastDay = to == null || to.isAfter(lastAllowedDay) ? lastAllowedDay : to;

        if (propertyService
                .findOverview(propertyId)
                .filter(PropertyOverview::active)
                .isEmpty()) {
            throw new VisitNotFoundException();
        }
        if (firstDay.isAfter(lastDay)) {
            return List.of();
        }

        OffsetDateTime fromInclusive = firstDay.atStartOfDay(MADRID).toOffsetDateTime();
        OffsetDateTime toExclusive = lastDay.plusDays(1).atStartOfDay(MADRID).toOffsetDateTime();
        return slotRepository.findAvailable(propertyId, now, fromInclusive, toExclusive).stream()
                .map(slot ->
                        new VisitSlotResponse(slot.getId(), inMadrid(slot.getStartsAt()), inMadrid(slot.getEndsAt())))
                .toList();
    }

    @Transactional
    public VisitBookingResponse book(VisitBookingRequest request, Long sessionVerificationId) {
        OffsetDateTime now = OffsetDateTime.now(clock);
        OffsetDateTime verifiedAt = phoneVerificationService.validateForVisit(
                request.phoneVerificationId(), request.phone(), sessionVerificationId);
        if (!now.isBefore(verifiedAt.plusMinutes(30))) {
            throw new PhoneVerificationInvalidException();
        }
        if (repository.existsByPhoneVerificationId(request.phoneVerificationId())) {
            throw new PhoneVerificationInvalidException();
        }

        int updated = slotRepository.bookIfAvailable(request.slotId(), now);
        if (updated == 0) {
            if (!slotRepository.existsById(request.slotId())) {
                throw new VisitNotFoundException();
            }
            throw new SlotUnavailableException();
        }

        VisitSlot slot = slotRepository.findById(request.slotId()).orElseThrow(VisitNotFoundException::new);
        PropertyOverview property = propertyService
                .findOverview(slot.getPropertyId())
                .orElseThrow(() -> new IllegalStateException("Slot " + slot.getId() + " has no property"));
        Visit visit = new Visit(
                property.id(), slot, request.phoneVerificationId(), request.visitorName(), request.phone(), now);
        try {
            visit = repository.saveAndFlush(visit);
        } catch (DataIntegrityViolationException exception) {
            throw mapConstraintViolation(exception);
        }

        saveConfirmationMessages(visit);
        return new VisitBookingResponse(
                visit.getId(),
                inMadrid(slot.getStartsAt()),
                inMadrid(slot.getEndsAt()),
                visit.getVisitorName(),
                new VisitBookingResponse.PropertySummary(property.title(), property.area(), property.address()));
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
                propertyService
                        .findOverview(visit.getPropertyId())
                        .map(PropertyOverview::agencyId)
                        .orElseThrow(() -> new IllegalStateException("Visit " + visit.getId() + " has no property")));
    }

    private RuntimeException mapConstraintViolation(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation) {
                if (Objects.equals("visit_visit_slot_id_key", violation.getConstraintName())) {
                    return new SlotUnavailableException();
                }
                if (Objects.equals("visit_phone_verification_id_key", violation.getConstraintName())) {
                    return new PhoneVerificationInvalidException();
                }
            }
            if (cause instanceof SQLException sqlException && "23505".equals(sqlException.getSQLState())) {
                String message = sqlException.getMessage();
                if (message != null) {
                    if (message.contains("visit_visit_slot_id_key")) {
                        return new SlotUnavailableException();
                    }
                    if (message.contains("visit_phone_verification_id_key")) {
                        return new PhoneVerificationInvalidException();
                    }
                }
            }
        }
        return exception;
    }

    private void saveConfirmationMessages(Visit visit) {
        // The messages feature is not in dev yet; its transactional call belongs here.
    }

    private static OffsetDateTime inMadrid(OffsetDateTime value) {
        return value.atZoneSameInstant(MADRID).toOffsetDateTime();
    }

    private static OffsetDateTime inMadrid(Instant value) {
        return value.atZone(MADRID).toOffsetDateTime();
    }
}
