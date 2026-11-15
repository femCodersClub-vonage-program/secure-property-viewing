package com.peephole.server.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * The general information of the API documentation that springdoc generates from the controllers, and the agency
 * session cookie that agency endpoints require, as decided in ADR 0004.
 */
@Configuration
@OpenAPIDefinition(
        info =
                @Info(
                        title = "Peephole API",
                        version = "0.0.1",
                        description =
                                "Every endpoint lives under /api. Errors are ProblemDetail responses with a stable code,"
                                        + " and an unexpected error returns 500 INTERNAL_ERROR."))
@SecurityScheme(
        name = OpenApiConfig.AGENCY_SESSION,
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.COOKIE,
        paramName = "JSESSIONID",
        description = "The session cookie that POST /api/agency/session sets after a successful sign-in")
public class OpenApiConfig {

    /** The name that agency endpoints use in @SecurityRequirement. */
    public static final String AGENCY_SESSION = "agencySession";
}
