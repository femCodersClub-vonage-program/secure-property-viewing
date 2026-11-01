# 0001. Tech stack

- **Status:** Proposed
- **Date:** 2026-11-01
- **Issue:** #

## Context

The Vonage APIs were already chosen, but not the languages and frameworks of `client/` and `server/`, and the Vonage Server SDK depends on the server language. The team needs a stack it can learn and finish within a program of about five weeks.

Three constraints shaped the decision:

- The team works on Windows and macOS, and does not want to depend on Docker
- Every machine must run the same versions, so a problem on one computer can be reproduced on another
- Several people will change the database schema at the same time

## Decision

| Layer | Choice | Version |
| :---- | :---- | :---- |
| Frontend | React | 19.3 |
| Frontend language | TypeScript | 7.0 |
| Styles | Tailwind CSS | 4.3 |
| Build tool | Vite | 8.3 |
| Frontend linter | oxlint | 1.x |
| Frontend runtime | Node.js | 22.12 or later |
| Backend language | Java | 21 LTS |
| Backend framework | Spring Boot | 4.1.2 |
| Backend build | Maven, through the Maven Wrapper | Pinned in `server/.mvn/` |
| Database | PostgreSQL | 17 |
| Database migrations | Flyway | Managed by Spring Boot |
| Vonage | Java Server SDK (`com.vonage:server-sdk`) | 9.x, added with the first Vonage feature |
| Server tests | JUnit, Spring Boot Test and Mockito | Managed by Spring Boot |
| Client tests | Vitest | Added with the first client test |

How we keep every machine on the same versions:

- The client pins its dependencies in `package-lock.json`, and `npm install` refuses a Node.js version older than 22.12
- The server pins its dependencies in `pom.xml`, and the Maven Wrapper downloads the same Maven version for everyone
- Nobody needs Docker: everyone installs PostgreSQL 17 and creates the same database and user, following [`docs/setup.md`](../setup.md)
- Secrets are read from `server/.env`, which is never committed
- The schema only changes through Flyway migrations, following the rules in [`CONTRIBUTING.md`](../../CONTRIBUTING.md#database-migrations)

## Alternatives considered

- **Java 25 LTS.** Supported for longer (until 2031, against 2029 for Java 21) and with newer language features. Discarded because Java 21 is already installed, its support covers the whole project, and Spring Boot 4.1 supports both
- **Spring Boot 4.2.** Only a release candidate when we decided, and we do not build on unreleased versions
- **PostgreSQL 18.** The newest version. Discarded because 17 is already installed and supported until 2029, and what matters is that everyone runs the same major version
- **Docker Compose and Testcontainers.** They give everyone an identical, disposable database. Discarded because the team does not want Docker, and with these dependencies the application would not start and the tests would fail on a computer without it
- **H2 as an in-memory database for tests.** Discarded because it behaves differently from PostgreSQL, so tests could pass locally and fail against the real database
- **ESLint with typescript-eslint.** The most widely used option. Discarded because typescript-eslint does not support TypeScript 7 yet, so we would have to stay on TypeScript 6. oxlint comes configured in the official Vite template and supports TypeScript 7
- **A Maven installation on each computer.** Discarded in favor of the Maven Wrapper, which pins the version in the repository and needs no installation

## Consequences

- **Easier:** cloning the repository, installing PostgreSQL 17 and following one guide is enough to run the project, and the versions cannot drift between machines
- **Harder:** everyone installs and starts PostgreSQL by hand, and the integration tests need that local database. The CI workflow will need a PostgreSQL service
- **Accepted trade-offs:**
  - oxlint has fewer plugins and fewer type-aware rules than ESLint
  - TypeScript 7 is recent, so some tools may not support it yet
  - Java 21 reaches the end of its support earlier than Java 25
- **Still open:**
  - The formatter for `client/` and `server/`
  - The exact versions of Vitest and the Vonage SDK, fixed when they are first added
  - The macOS setup steps, not tested yet
