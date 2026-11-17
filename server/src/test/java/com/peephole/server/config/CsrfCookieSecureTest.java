package com.peephole.server.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

/**
 * Runs against the real embedded server over plain HTTP, as the client's Caddy proxy reaches it on Railway, so the
 * Secure flag can only come from the configuration and not from the request.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "server.servlet.session.cookie.secure=true")
class CsrfCookieSecureTest {

    @LocalServerPort
    private int port;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Test
    void marksTheCsrfCookieSecureWhenTheSessionCookieIs() throws Exception {
        HttpResponse<String> response = httpClient.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/health"))
                        .GET()
                        .build(),
                HttpResponse.BodyHandlers.ofString());

        List<String> cookies = response.headers().allValues("Set-Cookie");
        String csrfCookie = cookies.stream()
                .filter(cookie -> cookie.startsWith("XSRF-TOKEN="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No XSRF-TOKEN cookie in " + cookies));
        assertThat(csrfCookie).containsIgnoringCase("Secure").doesNotContainIgnoringCase("HttpOnly");
    }
}
