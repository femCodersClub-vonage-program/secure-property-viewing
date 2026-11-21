package com.peephole.server.common;

import org.springframework.http.HttpStatus;

// A webhook under /api/webhooks without a valid signature from Vonage, as the data model spec describes
public class WebhookSignatureInvalidException extends BusinessException {

    public WebhookSignatureInvalidException() {
        super(HttpStatus.UNAUTHORIZED, "WEBHOOK_SIGNATURE_INVALID", "The webhook signature is not valid.");
    }
}
