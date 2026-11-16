package com.peephole.server.common;

// A field that passed Bean Validation but turned out invalid later, such as a phone number Vonage rejects.
// RestExceptionHandler returns it as VALIDATION_FAILED, the same as any other invalid field
public class FieldValidationException extends RuntimeException {

    private final String field;

    public FieldValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
