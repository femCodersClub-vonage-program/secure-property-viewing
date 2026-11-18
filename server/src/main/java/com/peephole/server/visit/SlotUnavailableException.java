package com.peephole.server.visit;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class SlotUnavailableException extends BusinessException {
    SlotUnavailableException() {
        super(HttpStatus.CONFLICT, "SLOT_UNAVAILABLE", "That time is no longer available. Choose another visit time.");
    }
}
