package com.peephole.server.phoneverification;

import com.peephole.server.common.ProblemResponse;
import com.peephole.server.phoneverification.dto.CheckPhoneVerificationRequest;
import com.peephole.server.phoneverification.dto.PhoneVerificationResponse;
import com.peephole.server.phoneverification.dto.StartPhoneVerificationRequest;
import com.peephole.server.phoneverification.dto.StartPhoneVerificationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Each verification is bound to the browser that started it through the session, as decided in
// specs/phone-verification.md
@RestController
@RequestMapping("/api/phone-verifications")
@Tag(name = "Phone verification", description = "Send a code by SMS and check it")
class PhoneVerificationController {

    static final String SESSION_ATTRIBUTE = "phoneVerificationId";

    private final PhoneVerificationService service;

    PhoneVerificationController(PhoneVerificationService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(
            summary = "Send a code",
            description = "Sends a 6-digit code by SMS. If this browser has a verification that is not verified, it is"
                    + " canceled and replaced by a new one. Needs the X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "201", description = "The code was sent")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the phone is not in international format, Vonage cannot send an SMS to"
                    + " it, or the purpose is not valid",
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
            responseCode = "409",
            description = "VERIFICATION_IN_PROGRESS: a code is already on its way to this number from another session",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "429",
            description = "VERIFICATION_RESEND_TOO_SOON: a new code was asked for before resendAvailableAt."
                    + " VERIFICATION_LIMIT_REACHED: 5 verifications for this phone or 30 in total in the last hour",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    StartPhoneVerificationResponse start(
            @Valid @RequestBody StartPhoneVerificationRequest request, HttpSession session) {
        Long pendingId = session.getAttribute(SESSION_ATTRIBUTE) instanceof Long pending ? pending : null;

        StartPhoneVerificationResponse response =
                service.start(request.phone(), PhoneVerificationPurpose.valueOf(request.purpose()), pendingId);
        session.setAttribute(SESSION_ATTRIBUTE, response.id());
        return response;
    }

    @PostMapping("/{id}/check")
    @Operation(
            summary = "Check a code",
            description = "Checks the code sent by SMS. Only the browser that started the verification can check it."
                    + " Needs the X-XSRF-TOKEN header.")
    @ApiResponse(responseCode = "200", description = "The code matches: the verification is VERIFIED")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the code is not 6 digits",
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
            description = "VERIFICATION_NOT_FOUND: this browser did not start this verification",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "422",
            description = "VERIFICATION_CODE_INVALID: the code does not match. VERIFICATION_EXPIRED: 5 minutes have"
                    + " passed",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "429",
            description = "VERIFICATION_TOO_MANY_ATTEMPTS: 3 wrong codes have been entered",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    PhoneVerificationResponse check(
            @PathVariable long id, @Valid @RequestBody CheckPhoneVerificationRequest request, HttpSession session) {
        // Knowing an id is not enough: it has to be the one this browser started
        if (!Long.valueOf(id).equals(session.getAttribute(SESSION_ATTRIBUTE))) {
            throw new VerificationNotFoundException();
        }

        return service.check(id, request.code());
    }
}
