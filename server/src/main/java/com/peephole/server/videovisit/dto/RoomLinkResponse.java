package com.peephole.server.videovisit.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record RoomLinkResponse(
        @Schema(allowableValues = {"VISITOR", "GUEST"}) String role, String token) {

    @Override
    public String toString() {
        return "RoomLinkResponse[role=" + role + ", token=<hidden>]";
    }
}
