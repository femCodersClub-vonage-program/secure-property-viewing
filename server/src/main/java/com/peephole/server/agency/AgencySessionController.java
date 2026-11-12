package com.peephole.server.agency;

import com.peephole.server.agency.dto.AgencySessionResponse;
import com.peephole.server.agency.dto.SignInRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

@RestController
@RequestMapping("/api/agency/session")
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
    AgencySessionResponse currentUser(@AuthenticationPrincipal AgencyUserDetails user) {
        return toResponse(user);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
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
