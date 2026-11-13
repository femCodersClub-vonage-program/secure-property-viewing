package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationNotFoundException extends BusinessException {
    VerificationNotFoundException() {
        super(HttpStatus.NOT_FOUND, "VERIFICATION_NOT_FOUND", "This verification was not found. Ask for a new code.");
    }
}
