package com.peephole.server.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.servlet.HandlerExceptionResolver;

/**
 * Security errors happen in the filter chain, before any controller, so they are handed to the MVC exception
 * resolvers to get the same ProblemDetail that RestExceptionHandler writes.
 */
final class ProblemDetailAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final HandlerExceptionResolver handlerExceptionResolver;

    ProblemDetailAuthenticationEntryPoint(HandlerExceptionResolver handlerExceptionResolver) {
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    public void commence(
            HttpServletRequest request, HttpServletResponse response, AuthenticationException authenticationException)
            throws IOException {
        if (handlerExceptionResolver.resolveException(request, response, null, new AuthenticationRequiredException())
                == null) {
            response.sendError(HttpStatus.UNAUTHORIZED.value());
        }
    }
}
