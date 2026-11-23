package com.peephole.server.listing;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.listing.dto.ListingRequestResponse;
import com.peephole.server.listing.dto.NewListingRequest;
import com.peephole.server.phoneverification.PhoneVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listing-requests")
@Tag(name = "Owner listing", description = "Send a request to list a property with the agency")
class ListingRequestController {

    private final ListingRequestService service;

    ListingRequestController(ListingRequestService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Send a listing request",
            description = "Saves the owner's request as PENDING for the agency to review, using a phone verified"
                    + " with the LISTING_REQUEST purpose in this browser session. Needs the X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "201", description = "The request was saved as PENDING")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: a required field is missing or not valid",
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
            responseCode = "422",
            description = "PHONE_VERIFICATION_INVALID: the verification is not verified, is for another purpose or"
                    + " phone, belongs to another browser, or has already been used",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    ListingRequestResponse submit(@Valid @RequestBody NewListingRequest request, HttpSession session) {
        Long verificationId =
                session.getAttribute(PhoneVerificationService.SESSION_ATTRIBUTE) instanceof Long id ? id : null;
        return service.submit(request, verificationId);
    }
}
