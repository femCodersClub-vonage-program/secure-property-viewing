package com.peephole.server.agency;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Runs against the real embedded server, because MockMvc does not write the container's session cookie. The data is
 * committed for the server thread to see, so it is deleted after each test.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "server.servlet.session.cookie.secure=false")
class AgencySessionCookieTest {

    private static final String EMAIL = "marta.cookie-test@peephole.example";
    private static final String PASSWORD = "Cookie-test-password-1";

    @LocalServerPort
    private int port;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private Long agencyId;

    @BeforeEach
    void createAgencyUser() {
        agencyId = jdbcTemplate.queryForObject(
                "INSERT INTO agency (name, email, phone, verified) VALUES (?, ?, ?, true) RETURNING id",
                Long.class,
                "Cookie Test Agency",
                "agency.cookie-test@peephole.example",
                "+34600000001");
        jdbcTemplate.update(
                "INSERT INTO agency_user (agency_id, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                agencyId,
                "Marta Cookie",
                EMAIL,
                passwordEncoder.encode(PASSWORD),
                "ADMIN");
    }

    @AfterEach
    void deleteAgencyUser() {
        jdbcTemplate.update("DELETE FROM agency_user WHERE agency_id = ?", agencyId);
        jdbcTemplate.update("DELETE FROM agency WHERE id = ?", agencyId);
    }

    @Test
    void signsInAndOutWithAnHttpOnlyLaxSessionCookieAndRotatesTheCsrfToken() throws Exception {
        String firstCsrfCookie =
                findCookie(send(HttpRequest.newBuilder(url("/api/health")).GET().build()), "XSRF-TOKEN");
        assertThat(firstCsrfCookie).doesNotContainIgnoringCase("HttpOnly");
        String firstCsrfToken = cookieValue(firstCsrfCookie);

        HttpResponse<String> signedIn = send(signInRequest()
                .header("Cookie", "XSRF-TOKEN=" + firstCsrfToken)
                .header("X-XSRF-TOKEN", firstCsrfToken)
                .build());

        assertThat(signedIn.statusCode()).isEqualTo(200);
        assertThat(signedIn.body()).contains("\"name\":\"Marta Cookie\"").contains("\"role\":\"ADMIN\"");
        String sessionCookie = findCookie(signedIn, "JSESSIONID");
        assertThat(sessionCookie)
                .containsIgnoringCase("HttpOnly")
                .containsIgnoringCase("SameSite=Lax")
                .doesNotContainIgnoringCase("Secure;")
                .doesNotEndWithIgnoringCase("Secure");
        assertThat(cookieValue(findCookie(signedIn, "XSRF-TOKEN"))).isEmpty();
        String sessionId = cookieValue(sessionCookie);

        HttpResponse<String> currentUser = send(HttpRequest.newBuilder(url("/api/agency/session"))
                .header("Cookie", "JSESSIONID=" + sessionId)
                .GET()
                .build());

        assertThat(currentUser.statusCode()).isEqualTo(200);
        String secondCsrfToken = cookieValue(findCookie(currentUser, "XSRF-TOKEN"));
        assertThat(secondCsrfToken).isNotEmpty().isNotEqualTo(firstCsrfToken);

        HttpResponse<String> signedOut = send(HttpRequest.newBuilder(url("/api/agency/session"))
                .header("Cookie", "XSRF-TOKEN=" + secondCsrfToken + "; JSESSIONID=" + sessionId)
                .header("X-XSRF-TOKEN", secondCsrfToken)
                .DELETE()
                .build());

        assertThat(signedOut.statusCode()).isEqualTo(204);
        assertThat(cookieValue(findCookie(signedOut, "XSRF-TOKEN"))).isEmpty();
    }

    private HttpRequest.Builder signInRequest() {
        return HttpRequest.newBuilder(url("/api/agency/session"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}"));
    }

    private URI url(String path) {
        return URI.create("http://localhost:" + port + path);
    }

    private HttpResponse<String> send(HttpRequest request) throws Exception {
        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private static String findCookie(HttpResponse<String> response, String name) {
        List<String> cookies = response.headers().allValues("Set-Cookie");
        return cookies.stream()
                .filter(cookie -> cookie.startsWith(name + "="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("No " + name + " cookie in " + cookies));
    }

    private static String cookieValue(String setCookie) {
        return setCookie.substring(setCookie.indexOf('=') + 1, setCookie.indexOf(';'));
    }
}
