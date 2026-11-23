package com.peephole.server.vonage;

import com.vonage.client.verify2.VerificationCallback;
import java.util.Optional;

// What the phone verification needs from a Verify status callback: the request it is about and what happened.
// Read with the SDK's VerificationCallback, which the first step of #106 checked with a real callback
public record VerifyStatusCallback(String requestId, VerifyCallbackStatus status) {

    // Empty when the body cannot be read, so a broken callback is ignored instead of failing
    public static Optional<VerifyStatusCallback> fromJson(String body) {
        if (body == null || body.isBlank()) {
            return Optional.empty();
        }
        try {
            VerificationCallback callback = VerificationCallback.fromJson(body);
            if (callback.getRequestId() == null || callback.getStatus() == null) {
                return Optional.empty();
            }
            return Optional.of(new VerifyStatusCallback(
                    callback.getRequestId().toString(),
                    VerifyCallbackStatus.from(String.valueOf(callback.getStatus()))));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }
}
