package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationTooManyAttemptsException extends BusinessException {
    VerificationTooManyAttemptsException() {
        super(
                HttpStatus.TOO_MANY_REQUESTS,
                "VERIFICATION_TOO_MANY_ATTEMPTS",
                "You entered a wrong code too many times. Ask for a new code.");
    }
}
