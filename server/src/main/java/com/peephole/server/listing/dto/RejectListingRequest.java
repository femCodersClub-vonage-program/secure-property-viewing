package com.peephole.server.listing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Why the agency rejects a listing request. The owner can ask for it, so it is required. */
public record RejectListingRequest(
        @NotBlank(message = "must explain why the request is rejected")
        @Size(max = 1000, message = "must be 1000 characters or fewer")
        String reason) {

    public RejectListingRequest {
        reason = reason == null ? null : reason.strip();
    }

    // The agency writes the reason, and it may name the owner, so it never reaches a log
    @Override
    public String toString() {
        return "RejectListingRequest[reason=<redacted>]";
    }
}
