package com.peephole.server.visit;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VisitNotFoundException extends BusinessException {
    VisitNotFoundException() {
        super(HttpStatus.NOT_FOUND, "NOT_FOUND", "The requested property or visit slot was not found.");
    }
}
