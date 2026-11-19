package com.peephole.server.phoneverification;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

public class PhoneVerificationInvalidException extends BusinessException {
    public PhoneVerificationInvalidException() {
        super(
                HttpStatus.UNPROCESSABLE_CONTENT,
                "PHONE_VERIFICATION_INVALID",
                "Verify your phone number again before booking a visit.");
    }
}
