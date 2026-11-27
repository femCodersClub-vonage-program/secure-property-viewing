package com.peephole.server.listing;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class ListingRequestNotFoundException extends BusinessException {

    ListingRequestNotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", "The listing request does not exist.");
    }
}
