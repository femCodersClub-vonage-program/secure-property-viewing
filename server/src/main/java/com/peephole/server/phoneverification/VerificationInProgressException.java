package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationInProgressException extends BusinessException {

    VerificationInProgressException() {
        super(
                HttpStatus.CONFLICT,
                "VERIFICATION_IN_PROGRESS",
                "A code is already on its way to this number. Wait a few minutes and try again.");
    }
}
