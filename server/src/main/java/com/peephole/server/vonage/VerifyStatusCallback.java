package com.peephole.server.vonage;

import java.util.Locale;
import java.util.Optional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.JsonNodeType;

// What the phone verification needs from a Verify status callback: the request it is about, whether it reports one
// channel or the whole request, which channel, and what happened. Read without the SDK, whose VerificationCallback has
// no value for some documented statuses, such as blocked, and would lose the whole callback
public record VerifyStatusCallback(
        String requestId, VerifyCallbackType type, String channel, VerifyCallbackStatus status) {

    private static final String SILENT_AUTH_CHANNEL = "silent_auth";
    private static final JsonMapper JSON = JsonMapper.builder().build();

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
            JsonNode json = JSON.readTree(body);
            String requestId = text(json, "request_id");
            String status = text(json, "status");
            if (requestId == null || status == null) {
                return Optional.empty();
            }
            String type = text(json, "type");
            String channel = text(json, "channel");
            return Optional.of(new VerifyStatusCallback(
                    requestId,
                    type == null ? VerifyCallbackType.OTHER : VerifyCallbackType.from(type),
                    channel == null ? null : channel.toLowerCase(Locale.ROOT),
                    VerifyCallbackStatus.from(status)));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    // Null unless the field is there as text
    private static String text(JsonNode json, String field) {
        JsonNode value = json.get(field);
        return value != null && value.getNodeType() == JsonNodeType.STRING ? value.asString() : null;
    }
}
