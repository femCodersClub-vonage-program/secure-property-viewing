package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySummaryResponse;
import com.peephole.server.agency.dto.AgencyVisitResponse;
import com.peephole.server.common.FieldValidationException;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/agency")
@Tag(name = "Agency dashboard", description = "The dashboard home and the visits calendar")
class AgencyDashboardController {

    private static final String DATE_EXAMPLE = "2026-11-23";
    // LocalDate.parse also accepts years with a sign and more than four digits, which fail later in the database
    private static final Pattern DATE_FORMAT = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");
    private static final int MAX_DAYS = 31;

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

    // The dates are read as text, so a missing or wrong one returns the same VALIDATION_FAILED as any other field
    @GetMapping("/visits")
    @Operation(
            summary = "List the visits in a range of days",
            description = "Every visit of the agency from `from` to `to`, both included, in Europe/Madrid time,"
                    + " ordered by start time. The range is at most " + MAX_DAYS + " days")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The visits")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: `from` or `to` is missing or is not a date, `to` is before `from`, or"
                    + " the range is longer than " + MAX_DAYS + " days",
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
    List<AgencyVisitResponse> visits(
            @AuthenticationPrincipal AgencyUserDetails user,
            @Parameter(description = "First day, such as " + DATE_EXAMPLE) @RequestParam(required = false) String from,
            @Parameter(description = "Last day, included, such as " + DATE_EXAMPLE) @RequestParam(required = false)
                    String to) {
        LocalDate firstDay = parseDate("from", from);
        LocalDate lastDay = parseDate("to", to);
        if (lastDay.isBefore(firstDay)) {
            throw new FieldValidationException("to", "must be the same day as from or a later one");
        }
        if (lastDay.isAfter(firstDay.plusDays(MAX_DAYS - 1))) {
            throw new FieldValidationException(
                    "to", "must be at most " + MAX_DAYS + " days after the first day, both included");
        }
        return service.visits(user.getAgencyId(), firstDay, lastDay);
    }

    private static LocalDate parseDate(String field, String value) {
        if (value == null || value.isBlank()) {
            throw new FieldValidationException(field, "is required, as a date such as " + DATE_EXAMPLE);
        }
        if (!DATE_FORMAT.matcher(value).matches()) {
            throw new FieldValidationException(field, "must be a date such as " + DATE_EXAMPLE);
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException exception) {
            throw new FieldValidationException(field, "must be a date such as " + DATE_EXAMPLE);
        }
    }
}
