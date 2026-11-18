package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySummaryResponse;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agency")
@Tag(name = "Agency dashboard", description = "The dashboard home and the visits calendar")
class AgencyDashboardController {

    private final AgencyDashboardService service;

    AgencyDashboardController(AgencyDashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    @Operation(
            summary = "Get the dashboard summary",
            description = "The agent's name, the pending listing requests, the confirmed visits in the next 7 days,"
                    + " the active properties and the next five confirmed visits")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The summary")
    @ApiResponse(
            responseCode = "401",
            description = "AUTHENTICATION_REQUIRED: there is no session",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    AgencySummaryResponse summary(@AuthenticationPrincipal AgencyUserDetails user) {
        return service.summary(user.getAgencyId(), user.getFullName());
    }
}
