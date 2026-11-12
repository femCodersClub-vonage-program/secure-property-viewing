package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySessionResponse;
import com.peephole.server.agency.dto.SignInRequest;
import com.peephole.server.common.ProblemResponse;
import com.peephole.server.config.OpenApiConfig;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfLogoutHandler;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// The session decisions (cookie, CSRF, errors) are in ADR 0004
@RestController
@RequestMapping("/api/agency/session")
@Tag(name = "Agency session", description = "Sign in, get the signed-in user and sign out")
class AgencySessionController {
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy securityContextHolderStrategy =
            SecurityContextHolder.getContextHolderStrategy();
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();
    // The same pieces Spring Security's own login and logout filters use to clear the CSRF token
    private final CsrfAuthenticationStrategy csrfAuthenticationStrategy;
    private final CsrfLogoutHandler csrfLogoutHandler;

    AgencySessionController(AuthenticationManager authenticationManager, CsrfTokenRepository csrfTokenRepository) {
        this.authenticationManager = authenticationManager;
        this.csrfAuthenticationStrategy = new CsrfAuthenticationStrategy(csrfTokenRepository);
        this.csrfLogoutHandler = new CsrfLogoutHandler(csrfTokenRepository);
    }

    @PostMapping
    @Operation(
            summary = "Sign in",
            description = "Checks the email and password and starts a session. Needs the X-XSRF-TOKEN header. The"
                    + " XSRF-TOKEN cookie is then cleared, and a new one comes with the next response.")
    @ApiResponse(responseCode = "200", description = "Signed in: the session cookie is set")
    @ApiResponse(
            responseCode = "400",
            description = "VALIDATION_FAILED: the email or the password is missing, or the email is not valid",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    @ApiResponse(
            responseCode = "401",
            description = "INVALID_CREDENTIALS: the email or the password is wrong",
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
    AgencySessionResponse signIn(
            @Valid @RequestBody SignInRequest signInRequest, HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = authenticate(signInRequest);

        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = securityContextHolderStrategy.createEmptyContext();
        context.setAuthentication(authentication);
        securityContextHolderStrategy.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        csrfAuthenticationStrategy.onAuthentication(authentication, request, response);

        return toResponse((AgencyUserDetails) authentication.getPrincipal());
    }

    @GetMapping
    @Operation(summary = "Get the signed-in user")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "200", description = "The signed-in user")
    @ApiResponse(
            responseCode = "401",
            description = "AUTHENTICATION_REQUIRED: there is no session",
            content =
                    @Content(
                            mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
                            schema = @Schema(implementation = ProblemResponse.class)))
    AgencySessionResponse currentUser(@AuthenticationPrincipal AgencyUserDetails user) {
        return toResponse(user);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(
            summary = "Sign out",
            description = "Ends the session. Needs the X-XSRF-TOKEN header. The XSRF-TOKEN cookie is then cleared.")
    @SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)
    @ApiResponse(responseCode = "204", description = "Signed out")
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
    void signOut(Authentication authentication, HttpServletRequest request, HttpServletResponse response) {
        csrfLogoutHandler.logout(request, response, authentication);
        logoutHandler.logout(request, response, authentication);
    }

    private Authentication authenticate(SignInRequest signInRequest) {
        try {
            return authenticationManager.authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                    signInRequest.email(), signInRequest.password()));
        } catch (InternalAuthenticationServiceException exception) {
            // A system failure, such as the database being down, must stay a 500 and not look like a wrong password
            throw exception;
        } catch (AuthenticationException exception) {
            throw new InvalidCredentialsException();
        }
    }

    private AgencySessionResponse toResponse(AgencyUserDetails user) {
        return new AgencySessionResponse(user.getFullName(), user.getRole().name());
    }
}
