package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationLimitReachedException extends BusinessException {
    VerificationLimitReachedException() {
        super(
                HttpStatus.TOO_MANY_REQUESTS,
                "VERIFICATION_LIMIT_REACHED",
                "Too many codes have been sent. Try again in an hour.");
    }
}
