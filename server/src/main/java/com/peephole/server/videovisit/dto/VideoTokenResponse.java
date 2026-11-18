package com.peephole.server.videovisit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record VideoTokenResponse(
        String applicationId,
        String sessionId,
        String token,

        @Schema(allowableValues = {"VISITOR", "GUEST", "AGENCY"})
        String role,

        OffsetDateTime closesAt) {

    @Override
    public String toString() {
        return "VideoTokenResponse[applicationId=" + applicationId + ", sessionId=<hidden>, token=<hidden>, role="
                + role + ", closesAt=" + closesAt + "]";
    }
}
