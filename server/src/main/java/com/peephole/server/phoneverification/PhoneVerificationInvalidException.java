package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

public class PhoneVerificationInvalidException extends BusinessException {
    public PhoneVerificationInvalidException(PhoneVerificationPurpose purpose) {
        super(HttpStatus.UNPROCESSABLE_CONTENT, "PHONE_VERIFICATION_INVALID", messageFor(purpose));
    }

    private static String messageFor(PhoneVerificationPurpose purpose) {
        return switch (purpose) {
            case VISIT -> "Verify your phone number again before booking a visit.";
            case LISTING_REQUEST -> "Verify your phone number again before sending your listing request.";
        };
    }
}
