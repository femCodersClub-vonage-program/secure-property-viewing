# Peephole

A web platform for remote property visits with anti-fraud verification, built with Vonage APIs. `client/` is the web application and `server/` is the API; each folder has its own `AGENTS.md` with the rules for that part.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, [ADR 0001](docs/adr/0001-tech-stack.md) for the stack and [ADR 0002](docs/adr/0002-deployment-railway.md) for the deployment on Railway.

## Language

- Code, identifiers, comments, commit messages, branch names and documentation are in American English
- Files ending in `.es.md` are the Spanish version of their English file. When you change one, change the other in the same change
- `docs/guides/` is written in Spanish only

## Domain

**Visit** is the term for a video visit to a property: `Visit` in the code, *visit* in the interface and the documentation. Never use *viewing*, *showing* or *tour* for the same concept.

## Secrets

- Never read `.env`, `.vonagerc` or `*.key` files, and never ask for their contents
- `.env.example` files only hold placeholder values, such as `your_database_user`. Real values the team needs go in [`docs/setup.md`](docs/setup.md) and [`docs/setup.es.md`](docs/setup.es.md), and passwords are never written in the repository
- Vonage credentials live only in `server/`. The client never receives the API secret or the private key

## Accessibility

The target for this project is **WCAG 2.1 AA**, as decided in [ADR 0003](docs/adr/0003-accessibility-and-dependencies.md). It takes precedence over any personal or global instruction that asks for AAA.

Always:

- Text contrast of at least 4.5:1, or 3:1 for large text (18.66 px bold or 24 px regular and above)
- Contrast of at least 3:1 for interface components, icons that carry meaning and the focus indicator
- Everything usable with the keyboard alone, in a logical order
- A visible focus indicator on every interactive element
- Native HTML elements first: a `<button>` for actions and an `<a>` for navigation, before any ARIA role
- A label for every form field, and error messages that say what went wrong and how to fix it
- Alternative text that says what an image communicates; decorative images and icons get an empty `alt` or `aria-hidden="true"`
- Layouts that still work at 200% zoom, at 320 px wide and on a phone in landscape
- Animations that respect `prefers-reduced-motion`

Never:

- Remove the focus outline without a visible replacement
- Convey information through color alone
- Add an ARIA role or attribute that duplicates what a native element already does

ARIA is a promise, not a guarantee: a correct attribute does not mean a screen reader announces it well. Say which parts of a change need checking by hand.

## Dependencies

The policy and its reasons are in [ADR 0003](docs/adr/0003-accessibility-and-dependencies.md).

Always:

- Before adding a dependency, check whether the stack in [ADR 0001](docs/adr/0001-tech-stack.md) already solves the problem
- If a new dependency is really needed, the pull request explains why it cannot be done without it, its license and how actively it is maintained

Never:

- Add a dependency when something we already use, or something similar, solves the problem. That pull request is rejected
- Add a dependency on your own initiative as an AI assistant: stop and ask first

## Tests

- Every feature comes with its tests, starting from the acceptance criteria in its spec
- The server is tested against a real PostgreSQL database, never an in-memory replacement
- Client tests find elements by role and accessible name with Testing Library, as a person using a screen reader would

## Before writing code

- Work from the spec in `specs/` and its technical plan. If something the change needs is not in them, such as a new table or endpoint, stop and ask
- Check anything about Vonage against the official documentation through the Vonage Documentation MCP Server, not from memory
- Commit messages follow Conventional Commits, such as `feat(server): add OTP verification endpoint`
- Format the code before committing: `npm run format` in `client/` and `./mvnw spotless:apply` in `server/`. The CI fails on unformatted code
