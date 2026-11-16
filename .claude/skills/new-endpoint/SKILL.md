---
name: new-endpoint
description: Build a new server endpoint the way the project already does it, from its spec to its tests. Use when adding a REST endpoint under /api in server/, such as the catalog, booking or video visit endpoints.
---

The model for every step is phone verification (`server/src/main/java/com/peephole/server/phoneverification/`), the first feature built this way. Open the matching file there when a step is not clear. The rules behind each step are in [`server/AGENTS.md`](../../../server/AGENTS.md); this skill only says how to apply them in order.

1. **Start from the spec.** Read the *Technical plan* of the spec your issue links: the path, the request and response JSON, and the errors table. If you need something the spec doesn't say, such as another field or error, stop and ask before writing code, as the root `AGENTS.md` says.

2. **Create or reuse the feature package**, `com.peephole.server.<feature>`, in English, lowercase and singular, such as `visit` or `listing`, as `server/AGENTS.md` says. Classes are package-private unless another feature needs them. Another feature is used only through its service, never through its repository or entity.

3. **Write the request and response DTOs** as records in `<feature>/dto/`, with the exact field names of the spec's JSON. Put the Bean Validation constraints on the request, with a `message` that says how to fix the value, as in `StartPhoneVerificationRequest`. If a DTO holds personal data, such as a phone number or a name, override `toString()` so it never reaches a log.

4. **Write one exception per error code** of the spec, extending `common/BusinessException` with the HTTP status, the `code` and a message that tells the person what to do, as in `VerificationCodeInvalidException`. `RestExceptionHandler` turns it into a `ProblemDetail`, so the controller never builds error responses. A field error found after validation, such as a number Vonage rejects, uses `common/FieldValidationException`.

5. **Write the service**, `@Service`, with constructor injection and `final` fields. Put `@Transactional` on every method that writes. Map entities to DTOs here, never in the controller. If the feature calls Vonage, do it through an interface in `vonage/`, as `PhoneVerifier` does, so tests can replace it.

6. **Write the controller**: `@RestController` with `@RequestMapping("/api/...")`, `@ResponseStatus` for anything other than 200, and `@Valid` on the request body. Document it for springdoc:
   - `@Tag` on the class, and `@Operation` on each method. For a `POST`, `PUT`, `PATCH` or `DELETE`, say in the description that it needs the `X-XSRF-TOKEN` header
   - One `@ApiResponse` per error in the spec, with its `code` in the description and `ProblemResponse` as the schema. Copy the block from `PhoneVerificationController`
   - On an endpoint under `/api/agency/**`, add `@SecurityRequirement(name = OpenApiConfig.AGENCY_SESSION)`

7. **Check the security rules.** Public endpoints and `/api/agency/**` are already handled in `config/SecurityConfig.java`, and every write needs CSRF. Don't add rules anywhere else. If the endpoint needs something new there, it is a change to discuss in the pull request.

8. **Write the tests from the spec**, against the real PostgreSQL. `PhoneVerificationControllerTest` is the model:
   - `@SpringBootTest`, `@AutoConfigureMockMvc` and `@Transactional`, so each test rolls back
   - `@MockitoBean` for the Vonage interface, so no test ever calls Vonage, and `@TestBean` with a fixed `Clock` when time matters
   - `.with(csrf())` on every write request
   - A **contract test**: the JSON of a successful response matches the spec example field by field, including `null` values
   - One test per error code, checking `$.code`, not only the status
   - If the spec says "at the same moment" or sets a limit, a concurrency test like `PhoneVerificationConcurrencyTest`
   - See each new test fail once before your code makes it pass

9. **Check the logs**: no phone number, name, email, code or token in any log line or exception message. Log an id instead when you need to trace something.

10. **Run and review before the pull request**: `./mvnw spotless:apply`, then `./mvnw verify` from `server/`. Start the server with `API_DOCS_ENABLED=true` and try the endpoint in Swagger UI at `http://localhost:8080/swagger-ui.html`. Then run `server-reviewer`, `test-reviewer` and `docs-reviewer`, and sum up what each one found in the pull request.
