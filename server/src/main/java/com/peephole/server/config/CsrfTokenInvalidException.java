package com.peephole.server.config;

import com.peephole.server.common.BusinessException;
import org.springframework.http.HttpStatus;

class CsrfTokenInvalidException extends BusinessException {

    CsrfTokenInvalidException() {
        super(
                HttpStatus.FORBIDDEN,
                "CSRF_TOKEN_INVALID",
                "The request has no valid security token. Reload the page and try again.");
    }
}
