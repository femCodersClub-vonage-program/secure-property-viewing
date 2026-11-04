# 0002. Deployment on Railway

- **Status:** Accepted
- **Date:** 2026-11-01
- **Issue:** [#5](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/5)

## Context

The project needs a public URL for two reasons: the demo at the end of the program, and the Vonage Messages webhooks, which can only notify a server that is reachable from the internet. The repository holds two applications, `client/` and `server/`, and the server needs a PostgreSQL 17 database.

## Decision

We deploy on [Railway](https://railway.com), in one project with three services:

| Service | Source | What it runs |
| :---- | :---- | :---- |
| `client` | Root directory `/client` | The static build of the client (`npm run build`) |
| `server` | Root directory `/server` | The Spring Boot server, built with the Maven Wrapper |
| `Postgres` | Railway PostgreSQL | The database |

- Each service sets **Watch Paths** to its own folder, such as `/client/**`, so a change in one folder does not redeploy the other
- The server reads its configuration from Railway variables, with the same names as in `server/.env`. The database values come from the PostgreSQL service through reference variables:

  | Variable | Value |
  | :---- | :---- |
  | `DB_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` |
  | `DB_USERNAME` | `${{Postgres.PGUSER}}` |
  | `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
  | `CORS_ALLOWED_ORIGINS` | `https://${{client.RAILWAY_PUBLIC_DOMAIN}}` |

- The server listens on `PORT` when it is set and on `8080` otherwise (`server.port=${PORT:8080}`)
- Vonage credentials are Railway variables of the server service only, never of the client
- Server endpoints live under `/api`. In development, Vite proxies `/api` to the local server

## Alternatives considered

- **A single service where Spring Boot serves the client build.** One origin, so no CORS and no separate static hosting. Discarded because one build would need both Node.js and Java, and every client change would redeploy the server. Railway's monorepo setup, with one service per folder, matches how the repository is organized

## Consequences

- **Easier:**
  - The Vonage webhooks get a stable public URL, with no local tunnel for the deployed environment
  - Each folder deploys on its own
- **Harder:**
  - The client and the server run on different domains. The server already allows `http://localhost:5173` through CORS, and on Railway `CORS_ALLOWED_ORIGINS` must be set to the client domain. The client needs the server URL at build time (a `VITE_` variable, which is public and never holds a secret), which is set up with the first deployment
  - The client service must answer every unknown path with `index.html`, so React Router can handle routes such as `/visits/12` on reload. This is configured on the first deployment
  - Railway charges by usage once the trial credit is spent, so someone has to own the account and its billing
- **Checked on the first deployment:**
  - PostgreSQL: Railway's template created version 18, so the service uses the image `ghcr.io/railwayapp-templates/postgres-ssl:17` to match the local setup and the CI
  - Java: Railway builds and runs the server with Java 21 by default
  - `PORT`: Railway does not set it for the server, which listens on `8080` and is reachable through its public domain
  - Client routes: Railway detects Vite and answers unknown paths with `index.html`, with no extra configuration
  - Server URL in the client: the `VITE_API_URL` variable is set on the `client` service, and the API client has to use it in production
