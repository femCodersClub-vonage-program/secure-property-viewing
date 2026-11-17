package com.peephole.server.videovisit.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateRoomLinkRequest(
        @NotBlank
        @Pattern(regexp = "VISITOR|GUEST", message = "must be VISITOR or GUEST")
        @Schema(allowableValues = {"VISITOR", "GUEST"})
        String role) {}
