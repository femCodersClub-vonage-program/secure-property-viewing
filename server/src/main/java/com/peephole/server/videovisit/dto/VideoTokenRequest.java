package com.peephole.server.videovisit.dto;

import jakarta.validation.constraints.NotBlank;

public record VideoTokenRequest(
        @NotBlank(message = "must be the token from the room link")
        String token) {

    @Override
    public String toString() {
        return "VideoTokenRequest[token=<hidden>]";
    }
}
