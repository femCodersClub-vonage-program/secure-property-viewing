# Peephole

A web platform for remote property visits with anti-fraud verification, built with Vonage APIs. `client/` is the web application and `server/` is the API; each folder has its own `AGENTS.md`.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, [ADR 0001](docs/adr/0001-tech-stack.md) for the stack and [ADR 0002](docs/adr/0002-deployment-railway.md) for the deployment on Railway.

## Language

- Code, identifiers, comments, commit messages, branch names and documentation are in American English
- Files ending in `.es.md` are the Spanish version of their English file. When you change one, change the other in the same change
- `docs/guides/` is written in Spanish only

## Domain

**Visit** is the term for a video visit to a property: `Visit` in the code, *visit* in the interface and the documentation. Never use *viewing*, *showing* or *tour* for the same concept.

## Secrets

- Never read `.env`, `.vonagerc` or `*.key` files, and never ask for their contents
- `.env.example` files only hold placeholder values, such as `your_database_user`. Real values the team needs go in [`docs/setup.md`](docs/setup.md), and passwords are never written in the repository
- Vonage credentials live only in `server/`. The client never receives the API secret or the private key

## Before writing code

- Work from the spec in `specs/` and its technical plan. If something the change needs is not in them, such as a new table or endpoint, stop and ask
- Check anything about Vonage against the official documentation through the Vonage Documentation MCP Server, not from memory
- Commit messages follow Conventional Commits, such as `feat(server): add OTP verification endpoint`
- Format the code before committing: `npm run format` in `client/` and `./mvnw spotless:apply` in `server/`. The CI fails on unformatted code
