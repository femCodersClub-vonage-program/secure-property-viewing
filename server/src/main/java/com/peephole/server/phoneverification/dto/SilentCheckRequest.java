package com.peephole.server.phoneverification.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

// What the redirect of the silent check brings back in the URL fragment
public record SilentCheckRequest(
        @NotBlank(message = "is required, as the silent check brings it back")
        String requestId,

        @NotBlank
        @Pattern(regexp = "[A-Za-z0-9]{4,10}", message = "must be the 4 to 10 letters and digits of the silent check")
        String code) {

    @Override
    public String toString() {
        return "SilentCheckRequest[requestId=" + requestId + ", code=<hidden>]";
    }
}
