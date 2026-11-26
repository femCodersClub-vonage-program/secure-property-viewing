package com.peephole.server.listing;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import com.peephole.server.listing.dto.ListingRequestSummaryResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agency/listing-requests")
@Tag(name = "Agency listing requests", description = "Review the owners' listing requests, for the agency dashboard")
class AgencyListingRequestController {

    private final ListingRequestService service;

    AgencyListingRequestController(ListingRequestService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(
        summary = "List the listing requests",
        description = "Every request, or only those with the given status, the newest first")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The listing requests")
    @ApiResponse(
        responseCode = "400",
        description = "VALIDATION_FAILED: the status is not PENDING, APPROVED or REJECTED",
        content =
        @Content(
            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
        responseCode = "401",
        description = "AUTHENTICATION_REQUIRED: there is no session",
        content =
        @Content(
            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
            schema = @Schema(implementation = ProblemResponse.class)))
    List<ListingRequestSummaryResponse> list(
        @Parameter(description = "PENDING, APPROVED or REJECTED. Without it, every request")
        @RequestParam(required = false)
        ListingRequestStatus status) {
        return service.list(status);
    }
}
