package com.peephole.server.common;

import java.util.Map;
import org.springframework.http.HttpStatus;

public abstract class BusinessException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    protected BusinessException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getCode() {
        return code;
    }

    /** Extra fields for the ProblemDetail that the spec of the error asks for, such as opensAt. */
    public Map<String, Object> getProperties() {
        return Map.of();
    }
}
