package com.peephole.server.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.web.servlet.HandlerExceptionResolver;

@Configuration
public class SecurityConfig {
    private final HandlerExceptionResolver handlerExceptionResolver;

    SecurityConfig(@Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver) {
        this.handlerExceptionResolver = handlerExceptionResolver;
    }

    /**
     * The repository that csrf.spa() uses: the token lives in the XSRF-TOKEN cookie, readable by JavaScript.
     * It is a bean so AgencySessionController can clear the token on sign-in and sign-out, so a new one is issued
     * with the next response.
     * Behind the client's Caddy proxy every request arrives over plain HTTP, so the cookie takes its Secure flag
     * from the same property as the session cookie instead of from the request.
     */
    @Bean
    CsrfTokenRepository csrfTokenRepository(@Value("${server.servlet.session.cookie.secure:false}") boolean secure) {
        CookieCsrfTokenRepository repository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        repository.setCookieCustomizer((cookie) -> cookie.secure(secure));
        return repository;
    }

    // No CORS configuration on purpose: the browser always calls /api from the client's own origin (ADR 0004), so
    // the server sends no CORS headers and other sites cannot read its responses. They can still send requests, so
    // CSRF protects every write, except the Vonage webhooks, which are checked with the JWT that Vonage signs
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository)
            throws Exception {
        http.csrf((csrf) ->
                        csrf.spa().csrfTokenRepository(csrfTokenRepository).ignoringRequestMatchers("/api/webhooks/**"))
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers(HttpMethod.POST, "/api/agency/session")
                        .permitAll()
                        .requestMatchers("/api/agency/**")
                        .authenticated()
                        .anyRequest()
                        .permitAll())
                .exceptionHandling((exceptionHandling) -> exceptionHandling
                        .authenticationEntryPoint(new ProblemDetailAuthenticationEntryPoint(handlerExceptionResolver))
                        .accessDeniedHandler(new ProblemDetailAccessDeniedHandler(handlerExceptionResolver)))
                .requestCache((requestCache) -> requestCache.requestCache(new NullRequestCache()))
                .logout(AbstractHttpConfigurer::disable);
        return http.build();
    }
}
