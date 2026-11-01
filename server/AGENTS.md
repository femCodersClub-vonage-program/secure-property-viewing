# Server

Spring Boot 4.1 on Java 21, with PostgreSQL 17 and Flyway. Built with the Maven Wrapper.

The dependency and test rules in the root [`AGENTS.md`](../AGENTS.md) apply here too: a new dependency in `pom.xml` is justified in the pull request, and rejected if Spring Boot or something we already use solves the problem.

## Commands

Run them from `server/`. On Windows, use `.\mvnw.cmd` instead of `./mvnw`.

- Build, check the formatting and run the tests: `./mvnw verify`
- Format the Java code: `./mvnw spotless:apply`
- Start the server: `./mvnw spring-boot:run`

## Code structure

- Code is organized by feature, not by layer: `com.peephole.server.visit` holds the visit controller, service, repository, entity and DTOs
- Cross-cutting configuration lives in `com.peephole.server.config`, like `CorsConfig`
- Vonage is reached only through interfaces in `com.peephole.server.vonage`, such as a `PhoneVerifier`, so features never depend on the SDK directly and tests can use test doubles

## Java and Spring

Always:

- Inject dependencies through the constructor, in `final` fields
- Use a `record` for every request and response DTO
- Map entities to DTOs before they leave the service: a JPA entity never goes in or out of the API
- Put `@Transactional` on service methods that write, never on controllers
- Return `Optional` when a value may be missing, and an empty list instead of `null` for collections
- Test controllers with `@WebMvcTest` and repositories with `@DataJpaTest` plus `@AutoConfigureTestDatabase(replace = NONE)`, so they run against the real PostgreSQL instead of looking for an in-memory database

Never:

- Inject with `@Autowired` on a field
- Return `null` from a public method
- Call the Vonage SDK from a controller or from a feature package
- Add Lombok: records and constructors cover what it would generate

## API

- Every endpoint lives under `/api`, because that is the path the client proxies in development
- CORS is configured once in `config/CorsConfig.java` for `/api/**`. The allowed origins come from `CORS_ALLOWED_ORIGINS`, with `http://localhost:5173` by default. Never add `@CrossOrigin` to a controller
- The server listens on `PORT` when it is set, as on Railway, and on `8080` otherwise. Deployment is described in [ADR 0002](../docs/adr/0002-deployment-railway.md)

## Validation and errors

Always:

- Validate every request body at the API boundary with Bean Validation: `@Valid` on the controller parameter and constraints on the request DTO
- Return errors as `ProblemDetail`, from a single `@RestControllerAdvice`
- Tell business errors apart from system errors. A business error is expected, such as a wrong OTP code, and returns a 4xx with a message the client can show. A system error is unexpected, returns a 500 and never exposes internal details

Never:

- Catch an exception and ignore it
- Return a stack trace or a database message to the client

## Logging

- Never log personal data: phone numbers, names, OTP codes or Vonage tokens
- Log what failed, where and with which identifiers, such as a visit id, so a problem can be traced without personal data

## Configuration

- Secrets are read from `server/.env`, which is never committed. Never read it
- A new environment variable goes in `application.properties` as `${VARIABLE}`, in `.env.example` with a placeholder value only, and in `docs/setup.md` and `docs/setup.es.md` with the value the team needs

## Database migrations

The schema only changes through Flyway migrations in `src/main/resources/db/migration/`.

- Never let Hibernate create or alter tables: do not set `spring.jpa.hibernate.ddl-auto` to `create`, `create-drop` or `update`
- A new table or a change to an existing one must appear in the technical plan of its spec. If it does not, stop and ask before writing the migration
- Name migrations with the date and time in UTC: `V<yyyyMMdd>_<HHmm>__<description>.sql`, for example `V20261101_1430__create_visits_table.sql`
- Never edit a migration that is already in `dev`. To fix or change something, add a new migration
