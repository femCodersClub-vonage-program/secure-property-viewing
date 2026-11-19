package com.peephole.server.property.dto;

import java.math.BigDecimal;

public record PropertySummaryResponse(
        long id,
        String title,
        String operation,
        int priceEuros,
        String area,
        int bedrooms,
        int sizeM2,
        BigDecimal latitude,
        BigDecimal longitude,
        CoverImageResponse coverImage,
        AgencyResponse agency) {}
