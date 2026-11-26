package com.peephole.server.listing;

import com.peephole.server.listing.dto.ListingRequestDetailsResponse;
import com.peephole.server.listing.dto.ListingRequestResponse;
import com.peephole.server.listing.dto.ListingRequestSummaryResponse;
import com.peephole.server.listing.dto.NewListingRequest;
import com.peephole.server.phoneverification.PhoneVerificationInvalidException;
import com.peephole.server.phoneverification.PhoneVerificationPurpose;
import com.peephole.server.phoneverification.PhoneVerificationService;
import com.peephole.server.property.PropertyOperation;
import com.peephole.server.property.PropertyType;
import java.sql.SQLException;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ListingRequestService {

    private static final PhoneVerificationPurpose PURPOSE = PhoneVerificationPurpose.LISTING_REQUEST;
    private static final String VERIFICATION_USED_CONSTRAINT = "listing_request_phone_verification_id_key";
    private static final ZoneId AGENCY_ZONE = ZoneId.of("Europe/Madrid");

    private final ListingRequestRepository repository;
    private final PhoneVerificationService phoneVerificationService;
    private final Clock clock;

    ListingRequestService(
        ListingRequestRepository repository, PhoneVerificationService phoneVerificationService, Clock clock) {
        this.repository = repository;
        this.phoneVerificationService = phoneVerificationService;
        this.clock = clock;
    }

    @Transactional
    ListingRequestResponse submit(NewListingRequest request, Long sessionVerificationId) {
        long verificationId = request.phoneVerificationId();
        phoneVerificationService.validateVerified(verificationId, PURPOSE, request.ownerPhone(), sessionVerificationId);
        if (repository.existsByPhoneVerificationId(verificationId)) {
            throw new PhoneVerificationInvalidException(PURPOSE);
        }

        ListingRequest listingRequest = new ListingRequest(
            new ListingRequest.OwnerDetails(request.ownerName(), request.ownerPhone()),
            new ListingRequest.PropertyDetails(
                request.title(),
                request.description(),
                PropertyType.valueOf(request.propertyType()),
                PropertyOperation.valueOf(request.operation()),
                request.area(),
                request.address(),
                request.priceEuros(),
                request.bedrooms().shortValue(),
                request.sizeM2(),
                request.floor() == null ? null : request.floor().shortValue()),
            verificationId,
            OffsetDateTime.now(clock));
        try {
            listingRequest = repository.saveAndFlush(listingRequest);
        } catch (DataIntegrityViolationException exception) {
            throw mapConstraintViolation(exception);
        }
        return new ListingRequestResponse(
            listingRequest.getId(), listingRequest.getStatus().name());
    }

    // Without a status, every request. The newest first in both cases
    @Transactional(readOnly = true)
    List<ListingRequestSummaryResponse> list(ListingRequestStatus status) {
        List<ListingRequest> requests = status == null
            ? repository.findAllByOrderByCreatedAtDescIdDesc()
            : repository.findAllByStatusOrderByCreatedAtDescIdDesc(status);
        return requests.stream().map(ListingRequestService::toSummary).toList();
    }

    @Transactional(readOnly = true)
    ListingRequestDetailsResponse details(long id) {
        return repository
            .findById(id)
            .map(ListingRequestService::toDetails)
            .orElseThrow(ListingRequestNotFoundException::new);
    }

    private static ListingRequestSummaryResponse toSummary(ListingRequest request) {
        return new ListingRequestSummaryResponse(
            request.getId(),
            request.getOwnerFullName(),
            request.getTitle(),
            request.getOperation().name(),
            request.getPriceEuros(),
            inAgencyZone(request.getCreatedAt()),
            request.getStatus().name());
    }

    private static ListingRequestDetailsResponse toDetails(ListingRequest request) {
        return new ListingRequestDetailsResponse(
            request.getId(),
            request.getStatus().name(),
            request.getOwnerFullName(),
            request.getOwnerPhone(),
            request.getTitle(),
            request.getDescription(),
            request.getPropertyType().name(),
            request.getOperation().name(),
            request.getArea(),
            request.getAddress(),
            request.getPriceEuros(),
            request.getBedrooms(),
            request.getSizeM2(),
            request.getFloor() == null ? null : request.getFloor().intValue(),
            inAgencyZone(request.getCreatedAt()),
            inAgencyZone(request.getReviewedAt()),
            request.getRejectionReason());
    }

    private static OffsetDateTime inAgencyZone(OffsetDateTime time) {
        return time == null ? null : time.atZoneSameInstant(AGENCY_ZONE).toOffsetDateTime();
    }

    // The lock in validateVerified stops a double submit before this, but the UNIQUE constraint keeps the
    // last word if that ever changes
    private static RuntimeException mapConstraintViolation(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException violation
                && Objects.equals(VERIFICATION_USED_CONSTRAINT, violation.getConstraintName())) {
                return new PhoneVerificationInvalidException(PURPOSE);
            }
            if (cause instanceof SQLException sqlException
                && "23505".equals(sqlException.getSQLState())
                && sqlException.getMessage() != null
                && sqlException.getMessage().contains(VERIFICATION_USED_CONSTRAINT)) {
                return new PhoneVerificationInvalidException(PURPOSE);
            }
        }
        return exception;
    }
}
