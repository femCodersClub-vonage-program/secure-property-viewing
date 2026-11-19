package com.peephole.server.visit;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.phoneverification.PhoneVerificationService;
import com.peephole.server.visit.dto.VisitBookingRequest;
import com.peephole.server.visit.dto.VisitBookingResponse;
import com.peephole.server.visit.dto.VisitSlotResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@Tag(name = "Visit booking", description = "Find available visit times and book a property visit")
class VisitBookingController {

    private final VisitService service;

    VisitBookingController(VisitService service) {
        this.service = service;
    }

    @GetMapping("/properties/{propertyId}/slots")
    @Operation(
            summary = "List available visit times",
            description = "Lists available visit slots in Europe/Madrid. The default range is today through 14 days"
                    + " from today, inclusive; earlier start dates and later end dates are clamped to that range.")
    @ApiResponse(responseCode = "200", description = "Available visit slots")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: from is after to or a date is not valid",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "404",
            description = "NOT_FOUND: the property does not exist or is inactive",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    List<VisitSlotResponse> availableSlots(
            @PathVariable long propertyId,
            @Parameter(description = "First day, YYYY-MM-DD")
                    @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate from,
            @Parameter(description = "Last day, YYYY-MM-DD")
                    @RequestParam(required = false)
                    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                    LocalDate to) {
        return service.availableSlots(propertyId, from, to);
    }

    @PostMapping("/visits")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Book a visit",
            description = "Books an available slot using a verified phone number from this browser session."
                    + " Needs the X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "201", description = "The visit was booked")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the request fields are invalid",
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
            description = "NOT_FOUND: the visit slot does not exist",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "409",
            description = "SLOT_UNAVAILABLE: the slot has been booked, started, or its property is inactive",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "422",
            description = "PHONE_VERIFICATION_INVALID: the verification is invalid, expired, belongs to another"
                    + " browser, or has already been used",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    VisitBookingResponse book(@Valid @RequestBody VisitBookingRequest request, HttpSession session) {
        Long verificationId =
                session.getAttribute(PhoneVerificationService.SESSION_ATTRIBUTE) instanceof Long id ? id : null;
        VisitBookingResponse response = service.book(request, verificationId);
        SessionVisits.add(session, response.visitId());
        return response;
    }
}
