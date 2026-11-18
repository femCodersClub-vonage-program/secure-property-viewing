package com.peephole.server.videovisit;

import com.peephole.server.agency.SignedInAgency;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import com.peephole.server.videovisit.dto.CreateRoomLinkRequest;
import com.peephole.server.videovisit.dto.RoomLinkResponse;
import com.peephole.server.videovisit.dto.VideoTokenRequest;
import com.peephole.server.videovisit.dto.VideoTokenResponse;
import com.peephole.server.visit.SessionVisits;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Room links instead of the HTTP session, so the visitor and her guests can enter the next day from any browser, as
// decided in specs/video-visit.md
@RestController
@RequestMapping("/api")
@Tag(name = "Video visit", description = "Room links and video tokens for the video visit")
class VideoVisitController {

    private final VideoVisitService service;

    VideoVisitController(VideoVisitService service) {
        this.service = service;
    }

    @PostMapping("/visits/{id}/room-links")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Create a room link",
            description = "Creates the visitor's room link or a guest link, only from the browser that booked the"
                    + " visit. Asking for the VISITOR link again replaces the previous one. Needs the X-XSRF-TOKEN"
                    + " header.")
    @ApiResponse(responseCode = "201", description = "The room link was created")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the role is missing or is not VISITOR or GUEST",
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
            description = "NOT_FOUND: the visit doesn't exist or was not booked from this browser",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "VIDEO_VISIT_NOT_OPEN: the visit is not CONFIRMED or its room has closed."
                    + " VIDEO_INVITE_LIMIT_REACHED: the visit already has 4 guest links",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    RoomLinkResponse createRoomLink(
            @PathVariable long id, @Valid @RequestBody CreateRoomLinkRequest request, HttpServletRequest httpRequest) {
        // Knowing a visit id is not enough: it has to be one this browser booked
        if (!SessionVisits.contains(httpRequest, id)) {
            throw new VideoVisitNotFoundException();
        }
        return service.createRoomLink(id, VideoRole.valueOf(request.role()));
    }

    @PostMapping("/room-links/video-token")
    @Operation(
            summary = "Enter with a room link",
            description = "Returns a video token for the visitor or a guest. Public: the room link's token is the"
                    + " access. Needs the X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "200", description = "The token to join the video session")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the token is missing",
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
            description = "NOT_FOUND: the room link doesn't exist or was replaced",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "VIDEO_VISIT_NOT_OPEN: the visit is not CONFIRMED, the room has closed, or it hasn't opened"
                    + " yet, in which case opensAt says when it opens",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "500",
            description = "INTERNAL_ERROR: Vonage failed or timed out while creating the session. Try again",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    VideoTokenResponse videoTokenForRoomLink(@Valid @RequestBody VideoTokenRequest request) {
        return service.videoTokenForRoomLink(request.token());
    }

    @PostMapping("/agency/visits/{id}/video-token")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @Operation(
            summary = "Enter as the agency",
            description = "Returns a video token for a signed-in user of the agency that owns the property. Needs the"
                    + " X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "200", description = "The token to join the video session")
    @ApiResponse(
            responseCode = "401",
            description = "AUTHENTICATION_REQUIRED: no agency user is signed in",
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
            description = "NOT_FOUND: the visit doesn't exist or belongs to another agency",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "VIDEO_VISIT_NOT_OPEN: the visit is not CONFIRMED, the room has closed, or it hasn't opened"
                    + " yet, in which case opensAt says when it opens",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "500",
            description = "INTERNAL_ERROR: Vonage failed or timed out while creating the session. Try again",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    VideoTokenResponse videoTokenForAgency(@PathVariable long id, Authentication authentication) {
        return service.videoTokenForAgency(id, SignedInAgency.idOf(authentication));
    }
}
