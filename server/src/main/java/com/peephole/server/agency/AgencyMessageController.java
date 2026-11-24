package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencyMessageResponse;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agency/messages")
@Tag(name = "Agency messages", description = "The messages sent and scheduled, for the agency dashboard")
class AgencyMessageController {

    private final AgencyDashboardService service;

    AgencyMessageController(AgencyDashboardService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
            summary = "List the messages",
            description = "The messages about the agency's visits and about listing requests, the last updated first."
                    + " Each one has either a visitId or a listingRequestId, and the other one is null")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The messages")
    @ApiResponse(
            responseCode = "401",
            description = "AUTHENTICATION_REQUIRED: there is no session",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    List<AgencyMessageResponse> messages(@AuthenticationPrincipal AgencyUserDetails user) {
        return service.messages(user.getAgencyId());
    }
}
