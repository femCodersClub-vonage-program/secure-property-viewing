package com.peephole.server.agency;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class InvalidCredentialsException extends BusinessException {

    InvalidCredentialsException() {
        super(
                HttpStatus.UNAUTHORIZED,
                "INVALID_CREDENTIALS",
                "The email or password is incorrect. Check them and try again.");
    }
}
