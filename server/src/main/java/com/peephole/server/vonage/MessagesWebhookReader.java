package com.peephole.server.vonage;

import java.util.Locale;
import java.util.Optional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.JsonNodeType;

/** Checks and reads the Messages webhooks. As with Verify, a token without the payload_hash claim is accepted. */
public class MessagesWebhookReader {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private final WebhookSignatureVerifier signatureVerifier;

    public MessagesWebhookReader(WebhookSignatureVerifier signatureVerifier) {
        this.signatureVerifier = signatureVerifier;
    }

    public boolean isSignedByVonage(String authorization, String body) {
        return signatureVerifier.isValid(authorization)
                && BodyHash.check(authorization, body) != BodyHash.DOES_NOT_MATCH;
    }

    /** Empty when the body lacks client_ref, message_uuid or status. */
    public Optional<MessageStatusUpdate> readStatus(String body) {
        try {
            JsonNode json = JSON.readTree(body);
            String clientRef = text(json, "client_ref");
            String messageUuid = text(json, "message_uuid");
            String status = text(json, "status");
            if (clientRef == null || messageUuid == null || status == null) {
                return Optional.empty();
            }
            return Optional.of(new MessageStatusUpdate(clientRef, messageUuid, status.toLowerCase(Locale.ROOT)));
        } catch (RuntimeException exception) {
            return Optional.empty();
        }
    }

    private static String text(JsonNode json, String field) {
        JsonNode value = json.get(field);
        return value != null && value.getNodeType() == JsonNodeType.STRING ? value.asString() : null;
    }

    public record MessageStatusUpdate(String clientRef, String messageUuid, String status) {}
}
