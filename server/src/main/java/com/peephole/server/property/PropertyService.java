package com.peephole.server.property;

import com.peephole.server.property.dto.AgencyResponse;
import com.peephole.server.property.dto.CoverImageResponse;
import com.peephole.server.property.dto.ImageResponse;
import com.peephole.server.property.dto.PropertyDetailsResponse;
import com.peephole.server.property.dto.PropertySummaryResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PropertyService {

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
