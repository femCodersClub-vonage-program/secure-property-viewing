package com.peephole.server.vonage;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// The payload_hash claim of a webhook JWT from Vonage, shared by the Verify, Voice and Messages readers. Each reader
// decides what a token without it means. Only meaningful once the signature is valid, since the claim is signed too
enum BodyHash {
    MATCHES,
    MISSING,
    DOES_NOT_MATCH;

    private static final String BEARER = "Bearer ";
    private static final JsonMapper JSON = JsonMapper.builder().build();

    // The claim is the SHA-256 of the body as compact JSON, so the body is compared as it arrived and, in case it
    // came with spaces, as compact JSON
    static BodyHash check(String authorization, String body) {
        try {
            String[] parts = authorization.substring(BEARER.length()).strip().split("\\.");
            JsonNode claims = JSON.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!claims.has("payload_hash")) {
                return MISSING;
            }
            String expected = claims.path("payload_hash").asString("").toLowerCase(Locale.ROOT);
            String text = body == null ? "" : body;
            boolean matches = !expected.isEmpty()
                    && (sameHash(expected, text) || sameHash(expected, JSON.writeValueAsString(JSON.readTree(text))));
            return matches ? MATCHES : DOES_NOT_MATCH;
        } catch (RuntimeException exception) {
            return DOES_NOT_MATCH;
        }
    }

    // In constant time, so how long it takes says nothing about the hash
    private static boolean sameHash(String expected, String text) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), sha256(text).getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String text) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }
}
