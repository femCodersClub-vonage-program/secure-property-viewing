# Server

Spring Boot 4.1 on Java 21, with PostgreSQL 17 and Flyway. Built with the Maven Wrapper.

The dependency and test rules in the root [`AGENTS.md`](../AGENTS.md) apply here too: a new dependency in `pom.xml` is justified in the pull request, and rejected if Spring Boot or something we already use solves the problem.

## Commands

Run them from `server/`. On Windows, use `.\mvnw.cmd` instead of `./mvnw`.

- Build, check the formatting and run the tests: `./mvnw verify`
- Format the Java code: `./mvnw spotless:apply`
- Start the server: `./mvnw spring-boot:run`

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
