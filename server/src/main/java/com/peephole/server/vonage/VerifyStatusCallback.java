package com.peephole.server.vonage;

import com.vonage.client.verify2.VerificationCallback;
import java.util.Locale;
import java.util.Optional;

// What the phone verification needs from a Verify status callback: the request it is about, whether it reports one
// channel or the whole request, which channel, and what happened. Read with the SDK's VerificationCallback, which the
// first step of #106 checked with a real callback
public record VerifyStatusCallback(
        String requestId, VerifyCallbackType type, String channel, VerifyCallbackStatus status) {

    private static final String SILENT_AUTH_CHANNEL = "silent_auth";

    // An event about the silent step only, not about the SMS step or the whole request
    public boolean isSilentAuthEvent() {
        return type == VerifyCallbackType.EVENT && SILENT_AUTH_CHANNEL.equals(channel);
    }

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
                    callback.getType() == null
                            ? VerifyCallbackType.OTHER
                            : VerifyCallbackType.from(String.valueOf(callback.getType())),
                    callback.getChannel() == null
                            ? null
                            : String.valueOf(callback.getChannel()).toLowerCase(Locale.ROOT),
                    VerifyCallbackStatus.from(String.valueOf(callback.getStatus()))));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }
}
