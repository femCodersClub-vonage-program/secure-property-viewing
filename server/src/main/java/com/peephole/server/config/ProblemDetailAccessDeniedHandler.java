package com.peephole.server.config;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.access.AccessDeniedHandlerImpl;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.web.servlet.HandlerExceptionResolver;

final class ProblemDetailAccessDeniedHandler implements AccessDeniedHandler {

    private final HandlerExceptionResolver handlerExceptionResolver;
    private final AccessDeniedHandler defaultHandler = new AccessDeniedHandlerImpl();

    ProblemDetailAccessDeniedHandler(HandlerExceptionResolver handlerExceptionResolver) {
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    @Override
    public void handle(
            HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException)
            throws IOException, ServletException {
        if (!(accessDeniedException instanceof CsrfException)) {
            defaultHandler.handle(request, response, accessDeniedException);
            return;
        }
        if (handlerExceptionResolver.resolveException(request, response, null, new CsrfTokenInvalidException())
                == null) {
            response.sendError(HttpStatus.FORBIDDEN.value());
        }
    }
}
