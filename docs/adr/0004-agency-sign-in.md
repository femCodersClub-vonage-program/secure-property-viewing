# 0004. Agency sign-in with a server session

- **Status:** Proposed
- **Date:** 2026-11-10
- **Issue:** [#44](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/44)

## Context

Agency users sign in with the email and password of a preloaded user, and every agency endpoint needs that session. The [agency dashboard spec](../../specs/agency-dashboard.md) defines the API (`POST`, `GET` and `DELETE /api/agency/session`) but not how the server keeps the session safe.

Three facts shape the decision:

- **The server runs Spring Boot 4.1**, which brings Spring Security 7.1. Its configuration changed a lot between versions, so this ADR follows the 7.1 reference documentation.
- **The client is a single-page application.** Locally, it calls `/api` through the Vite proxy, so the browser sees one origin. On Railway, as [ADR 0002](0002-deployment-railway.md) describes, the client calls the server's public domain through `VITE_API_URL`.
- **The two Railway domains are different sites for the browser.** `up.railway.app` is on the [Public Suffix List](https://publicsuffix.org/), so the client and server domains, such as `client-production-xxxx.up.railway.app` and `server-production-xxxx.up.railway.app`, are as separate as two unrelated domains. A session cookie sent from the client to the server would be a third-party cookie: it would need `SameSite=None; Secure`, browsers that block third-party cookies would drop it, and the client's JavaScript could not read a CSRF cookie set by the server's domain.

## Decision

We use **Spring Security** (`spring-boot-starter-security`) with a **server session**, and we make the client and the server **share one origin on Railway**, as they already do locally.

**Signing in and out**

- `POST /api/agency/session` is a controller endpoint. It authenticates the email and password with Spring Security's `AuthenticationManager`, which loads the user from `agency_user` and checks the password against its BCrypt hash with `BCryptPasswordEncoder`.
- After a successful sign-in, the controller changes the session id, to protect against session fixation, and saves the `SecurityContext` explicitly with `HttpSessionSecurityContextRepository`, as the Spring Security 7.1 documentation requires for custom authentication endpoints.
- A wrong password and an unknown email return the same `401 INVALID_CREDENTIALS`, so the response does not reveal which emails exist.
- `DELETE /api/agency/session` invalidates the session and clears the security context, and returns `204`.
- We do not use `formLogin()` or `httpBasic()`: the spec defines a JSON API, not a login page.

**Session cookie**

- The default servlet session, kept in the server's memory, with the `JSESSIONID` cookie.
- `HttpOnly`, so JavaScript cannot read it.
- `SameSite=Lax`, which is enough because the browser sees one origin.
- `Secure` on Railway, through the `SESSION_COOKIE_SECURE` variable, and off locally, where the client runs over `http://localhost`.
- Spring Boot's default timeout of 30 minutes of inactivity.

**One origin on Railway**

- The `client` service keeps serving the static build with Caddy, which Railway uses for Vite sites, and adds a `Caddyfile` in `client/` that proxies `/api/*` to `server.railway.internal:8080` over Railway's private network. Railway documents this setup to keep a single-page application and its API on the same domain. The `Caddyfile` keeps answering every unknown path with `index.html`, as Railway's default does now, so reloading a React Router page still works.
- The client calls the relative path `/api` in every environment, so `VITE_API_URL` is no longer needed.
- The Vonage webhooks keep calling the server's public domain directly.
- This changes two points of [ADR 0002](0002-deployment-railway.md), which stays as it is because it is accepted: the client no longer uses `VITE_API_URL`, and the `client` service proxies `/api` instead of only serving static files. `CORS_ALLOWED_ORIGINS` is no longer needed for the browser, since every call is same-origin. We keep `CorsConfig` until the client uses the proxy, and the implementation decides whether to remove it.

**CSRF**

- CSRF protection stays on, with Spring Security's single-page application support: `csrf((csrf) -> csrf.spa())`, added in Spring Security 7.0. The server sets an `XSRF-TOKEN` cookie that JavaScript can read, and the client sends its value in the `X-XSRF-TOKEN` header with every `POST`, `PUT`, `PATCH` and `DELETE`.
- It applies to every endpoint under `/api`, including signing in and signing out, as the documentation recommends, except `/api/webhooks/**`. Vonage cannot send a CSRF token, and those requests are verified instead with the signed JWT that Vonage sends, as the [data model spec](../../specs/data-model-and-api-contract.md#endpoints) describes.
- A request without a valid token gets `403` as a `ProblemDetail`, with the code `CSRF_TOKEN_INVALID`, from a custom `AccessDeniedHandler` instead of Spring Security's default response.

**Routes and errors**

- `/api/agency/**` requires a signed-in user, except `POST /api/agency/session`. Every other route, including the public endpoints and `/api/webhooks/**`, stays open.
- An agency endpoint without a session returns `401 AUTHENTICATION_REQUIRED` as a `ProblemDetail`, from a custom `AuthenticationEntryPoint`, instead of Spring Security's default response.
- CORS keeps the configuration in `CorsConfig`, connected to Spring Security with `cors(withDefaults())`, and it does not allow credentials: the session never crosses origins.
- Neither the email nor the password is ever written to the logs.

## Alternatives considered

- **A cross-site session cookie (`SameSite=None; Secure`) with CORS credentials.** It keeps the current deployment as it is, but browsers that block third-party cookies would break the sign-in, and the client could not read a CSRF cookie from the server's domain. Discarded.
- **A custom domain for both services**, such as `app.example.com` and `api.example.com`. Both would be the same site, so `SameSite=Lax` would work. Discarded because it needs a domain bought and managed for the MVP. It can come later without changing this decision.
- **A JWT stored in `localStorage`.** No session on the server, but any XSS could read the token, signing out cannot revoke it before it expires, and we would write more security code by hand. Discarded.
- **A JWT in a cookie.** It still needs CSRF protection, so it adds complexity with no benefit over a session for a single server. Discarded.
- **HTTP Basic.** The browser would send the password with every request and show its own dialog. Discarded.
- **Disabling CSRF.** The Spring Security documentation advises against it for applications with a cookie session. Discarded.
- **Spring Session with JDBC.** Sessions would survive restarts and work with several server instances. Discarded for the MVP, which runs one instance. It can be added later without changing the API.

## Consequences

- **Easier:**
  - Signing in works the same locally and on Railway, in every browser
  - Spring Security provides the session, the password check, CSRF and route protection, so we do not write authentication by hand
  - CORS stays simple, without credentials
- **Harder:**
  - The `client` service needs a `Caddyfile`, and the API client has to use the relative `/api` path in production. This changes the client and the Railway setup, beyond the server
  - Sessions live in the server's memory, so a redeploy or a restart signs everyone out. We accept this for the MVP
  - The client's API layer has to send the `X-XSRF-TOKEN` header with every unsafe request
  - Spring Security also applies to the existing `@WebMvcTest` tests, such as `CorsConfigTest`, so they need the security configuration and test support
  - The error table in the [data model spec](../../specs/data-model-and-api-contract.md#errors) gains `403 CSRF_TOKEN_INVALID`
  - `spring-boot-starter-security` is a new dependency. Following [ADR 0003](0003-accessibility-and-dependencies.md), the implementation pull request explains why it is needed, its license (Apache 2.0) and its maintenance, and adds it to the stack table in [ADR 0001](0001-tech-stack.md)
- **To check in the implementation:**
  - That the server is reachable from the `client` service at `server.railway.internal:8080`
  - How `csrf.spa()` renews the `XSRF-TOKEN` cookie after signing in and out, since the documentation says the cookie is cleared on both
