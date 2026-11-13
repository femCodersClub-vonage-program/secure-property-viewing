package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationResendTooSoonException extends BusinessException {
    VerificationResendTooSoonException() {
        super(
                HttpStatus.TOO_MANY_REQUESTS,
                "VERIFICATION_RESEND_TOO_SOON",
                "Wait 30 seconds after the last code before asking for a new one.");
    }
}
