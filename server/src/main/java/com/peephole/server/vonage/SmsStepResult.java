package com.peephole.server.vonage;

public enum SmsStepResult {
    // The SMS step has started, or Verify starts it by itself once the silent step times out
    STARTED,
    // Vonage has already ended the request, because it expired or was canceled
    ENDED
}
