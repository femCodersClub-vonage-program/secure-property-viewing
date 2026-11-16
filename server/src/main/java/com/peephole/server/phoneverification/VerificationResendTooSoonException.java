package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class VerificationResendTooSoonException extends BusinessException {

    VerificationResendTooSoonException() {
        super(
                HttpStatus.TOO_MANY_REQUESTS,
                "VERIFICATION_RESEND_TOO_SOON",
                "Wait until you can ask for a new code, as the countdown on the screen shows.");
    }
}
