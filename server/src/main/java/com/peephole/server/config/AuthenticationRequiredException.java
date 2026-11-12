package com.peephole.server.config;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class AuthenticationRequiredException extends BusinessException {

    AuthenticationRequiredException() {
        super(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "Sign in to continue.");
    }
}
