# Peephole

A web platform for remote property visits with anti-fraud verification, built with Vonage APIs. `client/` is the web application and `server/` is the API; each folder has its own `AGENTS.md` with the rules for that part. Before working in `client/` or `server/`, read its `AGENTS.md` too, because not every AI assistant loads it on its own.

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, [ADR 0001](docs/adr/0001-tech-stack.md) for the stack and [ADR 0002](docs/adr/0002-deployment-railway.md) for the deployment on Railway.

## Where files go

Every file has a fixed place, so nothing is left lying around. The folder structure of each application is in [`client/AGENTS.md`](client/AGENTS.md#folder-structure) and [`server/AGENTS.md`](server/AGENTS.md#folder-structure).

| What | Where |
| :---- | :---- |
| Specification of a feature, with its technical plan | `specs/`, named after the feature in English and in kebab-case, such as `specs/visit-request.md` |
| Architecture decision | `docs/adr/`, numbered from `docs/adr/template.md` |
| Design system (colours, typography, tokens, spacing) | `docs/design-system.md` |
| Diagram | `docs/architecture/` |
| Team guide, in Spanish | `docs/guides/` |
| Image used in the documentation | `docs/images/` |
| Project presentation | `docs/presentations/` |
| End-to-end test | `e2e/` |
| AI agent | `.claude/agents/`, with a pointer in `.github/agents/` so Copilot in IntelliJ finds it |

Never:

- Add a file to the root of the repository. The root only holds `AGENTS.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CONTRIBUTING.es.md`, `LICENSE`, `README.md`, `README.es.md`, `SECURITY.md` and the configuration files that start with a dot
- Leave notes, drafts, exports or screenshots in the repository. If a document is worth keeping, it goes in its folder from the table above

## Language

- Code, identifiers, comments, commit messages, branch names and documentation are in American English
- Files ending in `.es.md` are the Spanish version of their English file. When you change one, change the other in the same change
- `docs/guides/` is written in Spanish only

## Domain

**Visit** is the term for a video visit to a property: `Visit` in the code, *visit* in the interface and the documentation. Never use *viewing*, *showing* or *tour* for the same concept.

## Secrets

- Never read `.env` files, `.env.*` files other than `.env.example`, `.vonagerc` or `*.key` files, and never ask for their contents
- `.env.example` files only hold placeholder values, such as `your_database_user`. Values the team shares that are not secret, such as the database name, go in [`docs/setup.md`](docs/setup.md) and [`docs/setup.es.md`](docs/setup.es.md). Any secret, whether a password, an API key or a token, goes in the team's shared Drive folder and is never written in the repository
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

Review the code against these AA rules. Interaction checks are limited to logical navigation with Tab and Shift+Tab and a visible focus indicator. Agents run those checks when the running client and existing browser tools are available; otherwise, they report them as not verified. Do not require screen reader tests or additional manual accessibility checks. These checks do not establish full WCAG conformance.

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

- A feature starts from its spec in `specs/`, which ends with a *Technical plan* section on how it is built. A bug or a task starts from its issue. If the change needs something they do not cover, such as a new table or endpoint, stop and ask
- Check anything about Vonage against the official documentation through the Vonage Documentation MCP Server, not from memory
- Commit messages follow Conventional Commits, such as `feat(server): add OTP verification endpoint`
- Write a code comment only when it is really necessary, to explain something the code cannot say by itself, and never longer than 2 or 3 lines
- Format the code before committing: `npm run format` in `client/` and `./mvnw spotless:apply` in `server/`. The CI fails on unformatted code
- After adding an image, run `npm run images` in `client/`: it converts the image to WebP, reduces it and updates the files that mention it. The CI fails on images that are not optimized

## Working with the team

- Check `git status` before editing. Never discard or overwrite changes you did not make
- Change only what the spec or the issue asks for, with no refactors outside its scope
- If a tool you need is not available, such as the Vonage Documentation MCP Server or a review agent, say so and say what is left unchecked. Never claim a check you did not run
- When you finish, say what changed, which tests you ran and their result, and what needs checking by hand
- Explain the reasons behind the decisions that matter: the team is learning, and everyone has to be able to explain their own code
- As an AI assistant, never merge a pull request unless you are asked to
