package com.peephole.server.listing;

import com.peephole.server.agency.SignedInAgency;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import com.peephole.server.listing.dto.ApprovedListingResponse;
import com.peephole.server.listing.dto.ListingRequestDetailsResponse;
import com.peephole.server.listing.dto.ListingRequestResponse;
import com.peephole.server.listing.dto.ListingRequestSummaryResponse;
import com.peephole.server.listing.dto.RejectListingRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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

    @GetMapping("/{id}")
    @Operation(
            summary = "See a listing request",
            description = "The owner's and the property's details, and the review once there is one. The owner's"
                    + " phone is personal data: it is shown here and never logged")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The listing request")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the id is not a number",
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
    @ApiResponse(
            responseCode = "404",
            description = "NOT_FOUND: there is no listing request with this id",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    ListingRequestDetailsResponse details(@PathVariable long id) {
        return service.details(id);
    }

    @PostMapping("/{id}/approve")
    @Operation(
            summary = "Approve a listing request",
            description = "Publishes the request as an active property of the agency, without photos, coordinates"
                    + " or video visits, and marks the request APPROVED. Needs the X-XSRF-TOKEN header.")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The request was approved, with the id of its new property")
    @ApiResponse(
            responseCode = "401",
            description = "AUTHENTICATION_REQUIRED: there is no session",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "403",
            description = "CSRF_TOKEN_INVALID: the X-XSRF-TOKEN header is missing or does not match the cookie",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "NOT_FOUND: there is no listing request with this id",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "LISTING_REQUEST_ALREADY_REVIEWED: the request was already approved or rejected",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    ApprovedListingResponse approve(@PathVariable long id, Authentication authentication) {
        return service.approve(id, SignedInAgency.idOf(authentication), SignedInAgency.userIdOf(authentication));
    }

    @PostMapping("/{id}/reject")
    @Operation(
            summary = "Reject a listing request",
            description = "Marks the request REJECTED with the agency's reason, which the owner can ask for. Needs"
                    + " the X-XSRF-TOKEN header.")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The request was rejected")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the reason is missing, blank or longer than 1000 characters",
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
    @ApiResponse(
            responseCode = "403",
            description = "CSRF_TOKEN_INVALID: the X-XSRF-TOKEN header is missing or does not match the cookie",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "NOT_FOUND: there is no listing request with this id",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "LISTING_REQUEST_ALREADY_REVIEWED: the request was already approved or rejected",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    ListingRequestResponse reject(
            @PathVariable long id, @Valid @RequestBody RejectListingRequest request, Authentication authentication) {
        return service.reject(id, request.reason(), SignedInAgency.userIdOf(authentication));
    }
}
