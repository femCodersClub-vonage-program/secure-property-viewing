package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

// The verification never tried the silent check, or it has already moved on to SMS (specs/silent-authentication.md)
class VerificationSilentCheckUnavailableException extends BusinessException {

    VerificationSilentCheckUnavailableException() {
        super(
                HttpStatus.CONFLICT,
                "VERIFICATION_SILENT_CHECK_UNAVAILABLE",
                "Your number is no longer being checked with your mobile operator. Enter the code from the SMS.");
    }
}
