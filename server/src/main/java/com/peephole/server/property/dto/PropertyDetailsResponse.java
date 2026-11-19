package com.peephole.server.property.dto;

import java.util.List;

public record PropertyDetailsResponse(
        long id,
        String title,
        String operation,
        String propertyType,
        int priceEuros,
        String area,
        int bedrooms,
        int sizeM2,
        Integer floor,
        String description,
        boolean videoVisitAvailable,
        AgencyResponse agency,
        List<ImageResponse> images) {}
