package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationCodeInvalidException extends BusinessException {
    VerificationCodeInvalidException() {
        super(
                HttpStatus.UNPROCESSABLE_CONTENT,
                "VERIFICATION_CODE_INVALID",
                "The code does not match. Check the SMS and try again.");
    }
}
