package com.peephole.server.property;

import com.peephole.server.property.dto.AgencyResponse;
import com.peephole.server.property.dto.CoverImageResponse;
import com.peephole.server.property.dto.ImageResponse;
import com.peephole.server.property.dto.PropertyDetailsResponse;
import com.peephole.server.property.dto.PropertySummaryResponse;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PropertyService {

    private final PropertyRepository repository;

    PropertyService(PropertyRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    List<PropertySummaryResponse> findAll(PropertyOperation operation) {
        List<Property> properties =
            operation != null ? repository.findAllActiveByOperation(operation) : repository.findAllActive();
        return properties.stream().map(PropertyService::toSummary).toList();
    }

    @Transactional(readOnly = true)
    PropertyDetailsResponse findById(long id) {
        Property property = repository.findActiveById(id).orElseThrow(PropertyNotFoundException::new);
        return toDetails(property);
    }

    /** For other features: the property with this id, active or not, or empty if it doesn't exist. */
    @Transactional(readOnly = true)
    public Optional<PropertyOverview> findOverview(long id) {
        return repository.findById(id).map(PropertyService::toOverview);
    }

    /** For other features: publishes an active property in the catalog and returns its id. */
    @Transactional
    public long publish(NewProperty newProperty) {
        // The agency comes from the signed-in user, so a missing one is a programming error
        Agency agency = repository
            .findAgencyById(newProperty.agencyId())
            .orElseThrow(() -> new IllegalStateException("Agency " + newProperty.agencyId() + " does not exist"));
        return repository.save(new Property(agency, newProperty)).getId();
    }

    private static PropertyOverview toOverview(Property property) {
        return new PropertyOverview(
            property.getId(),
            property.getAgency().getId(),
            property.getTitle(),
            property.getArea(),
            property.getAddress(),
            property.getStatus() == PropertyStatus.ACTIVE);
    }

    private static PropertySummaryResponse toSummary(Property property) {
        CoverImageResponse coverImage = property.getImages().isEmpty()
            ? null
            : new CoverImageResponse(
            property.getImages().get(0).getUrl(),
            property.getImages().get(0).getAltText());
        return new PropertySummaryResponse(
            property.getId(),
            property.getTitle(),
            property.getOperation().name(),
            property.getPriceEuros(),
            property.getArea(),
            property.getBedrooms(),
            property.getSizeM2(),
            property.getLatitude(),
            property.getLongitude(),
            coverImage,
            toAgency(property.getAgency()));
    }

    private static PropertyDetailsResponse toDetails(Property property) {
        List<ImageResponse> images = property.getImages().stream()
            .map(image -> new ImageResponse(image.getUrl(), image.getAltText()))
            .toList();
        return new PropertyDetailsResponse(
            property.getId(),
            property.getTitle(),
            property.getOperation().name(),
            property.getPropertyType().name(),
            property.getPriceEuros(),
            property.getArea(),
            property.getBedrooms(),
            property.getSizeM2(),
            property.getFloor() != null ? property.getFloor().intValue() : null,
            property.getDescription(),
            property.isVideoVisitAvailable(),
            toAgency(property.getAgency()),
            images);
    }

    private static AgencyResponse toAgency(Agency agency) {
        return new AgencyResponse(agency.getName(), agency.isVerified());
    }
}
