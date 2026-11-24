package com.peephole.server.vonage;

import java.util.Optional;

// Vonage's request id, and the URL the browser opens for the silent check. Without a check URL, the operator does
// not support the check, and Verify has already moved on to the SMS step by itself
public record SilentAuthStart(String requestId, Optional<String> checkUrl) {}
