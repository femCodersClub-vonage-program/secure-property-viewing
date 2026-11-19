package com.peephole.server.property;

import com.peephole.server.common.FieldValidationException;

class InvalidOperationException extends FieldValidationException {

    InvalidOperationException(String value) {
        super("operation", "must be RENT or SALE, got: " + value);
    }
}
