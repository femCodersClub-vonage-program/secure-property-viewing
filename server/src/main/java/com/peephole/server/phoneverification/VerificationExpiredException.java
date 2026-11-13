package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationExpiredException extends BusinessException {
    VerificationExpiredException() {
        super(HttpStatus.UNPROCESSABLE_CONTENT, "VERIFICATION_EXPIRED", "The code has expired. Ask for a new code.");
    }
}
