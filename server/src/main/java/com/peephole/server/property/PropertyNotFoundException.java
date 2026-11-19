package com.peephole.server.property;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class PropertyNotFoundException extends BusinessException {

    PropertyNotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", "The property does not exist.");
    }
}
