package com.peephole.server.property;

/** What another feature sends to publish a property, such as an approved listing request. */
public record NewProperty(
        long agencyId,
        long listingRequestId,
        String title,
        String description,
        PropertyOperation operation,
        PropertyType propertyType,
        int priceEuros,
        String area,
        String address,
        short bedrooms,
        int sizeM2,
        Short floor) {

    // The address comes from the owner's request, so it never reaches a log
    @Override
    public String toString() {
        return "NewProperty[agencyId=" + agencyId + ", listingRequestId=" + listingRequestId + "]";
    }
}
