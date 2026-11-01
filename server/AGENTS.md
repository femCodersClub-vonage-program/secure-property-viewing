# Server

Spring Boot 4.1 on Java 21, with PostgreSQL 17 and Flyway. Built with the Maven Wrapper.

## Commands

Run them from `server/`. On Windows, use `.\mvnw.cmd` instead of `./mvnw`.

- Build, check the formatting and run the tests: `./mvnw verify`
- Format the Java code: `./mvnw spotless:apply`
- Start the server: `./mvnw spring-boot:run`

## API

- Every endpoint lives under `/api`, because that is the path the client proxies in development
- The server listens on `PORT` when it is set, as on Railway, and on `8080` otherwise. Deployment is described in [ADR 0002](../docs/adr/0002-deployment-railway.md)

## Configuration

- Secrets are read from `server/.env`, which is never committed. Never read it
- A new environment variable goes in `application.properties` as `${VARIABLE}`, in `.env.example` with a placeholder value only, and in `docs/setup.md` with the value the team needs

## Database migrations

The schema only changes through Flyway migrations in `src/main/resources/db/migration/`.

- Never let Hibernate create or alter tables: do not set `spring.jpa.hibernate.ddl-auto` to `create`, `create-drop` or `update`
- A new table or a change to an existing one must appear in the technical plan of its spec. If it does not, stop and ask before writing the migration
- Name migrations with the date and time in UTC: `V<yyyyMMdd>_<HHmm>__<description>.sql`, for example `V20261101_1430__create_visits_table.sql`
- Never edit a migration that is already in `dev`. To fix or change something, add a new migration
