package com.peephole.server.listing;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class ListingRequestAlreadyReviewedException extends BusinessException {

    ListingRequestAlreadyReviewedException() {
        super(
                HttpStatus.CONFLICT,
                "LISTING_REQUEST_ALREADY_REVIEWED",
                "The listing request has already been approved or rejected.");
    }
}
