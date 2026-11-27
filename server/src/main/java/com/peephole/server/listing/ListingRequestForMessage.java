package com.peephole.server.listing;

/** What the owner's SMS needs from a listing request. */
public record ListingRequestForMessage(long id, String ownerPhone, String title, ListingRequestStatus status) {

    @Override
    public String toString() {
        return "ListingRequestForMessage[id=" + id + ", status=" + status + "]";
    }
}
