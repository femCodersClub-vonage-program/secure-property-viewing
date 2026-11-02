# Client

React 19 with TypeScript 7, Vite 8, React Router 8 and Tailwind CSS 4. Linted with oxlint, formatted with Prettier and tested with Vitest and Testing Library. Requires Node.js 22.22.2 or later.

Every rule in the root [`AGENTS.md`](../AGENTS.md) applies here too.

## Commands

Run them from `client/`.

- Install the pinned dependencies: `npm ci`
- Start the development server: `npm run dev`
- Run the tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`
- Type-check and build: `npm run build`

## Folder structure

The client is organized by feature: everything one feature needs lives in one folder, so two people working on different features do not touch the same files.

```text
src/
├── main.tsx              Entry point
├── routes.tsx            Every route, in one place
├── routes.test.tsx       Its test, next to it
├── index.css             The only stylesheet: the design tokens
├── test-setup.ts         Test configuration
├── pages/                One page per route. It only composes features and components
│   └── VisitPage.tsx
├── features/             One folder per business feature
│   └── visits/
│       ├── components/   Components used only by this feature
│       ├── hooks/        Hooks used only by this feature, such as useVisit.ts
│       ├── api.ts        This feature's calls to /api
│       ├── types.ts      This feature's types, such as Visit
│       └── index.ts      What this feature shares with other features, if anything
├── components/
│   └── ui/               The design system: Button, Link, Input. No business logic
├── lib/                  Generic helpers with no business logic, such as the HTTP client
└── assets/               Images and fonts
```

Folders are created when the first file needs them: `features/`, `components/ui/`, `lib/` and `assets/` do not exist yet. `components/ui/` is created in the design system issue.

Always:

- Name folders in English, lowercase and with hyphens, such as `agency-dashboard`
- Name components and pages in PascalCase, one per file, such as `VisitCard.tsx`, and hooks with `use`, such as `useVisit.ts`
- Put a test next to the file it tests: `VisitCard.test.tsx` beside `VisitCard.tsx`
- Register every page in `routes.tsx`
- Make the HTTP calls of a feature in its `api.ts`, using the shared HTTP client in `lib/`
- Move something to `components/ui/` or `lib/` when a second feature needs it and it has no business logic. If it has business logic, such as a `ListingCard` used by two features, it stays in its feature and is exported from that feature's `index.ts`

Never:

- Add files to the root of `src/` other than the ones above
- Import from inside another feature's folders, such as `features/listings/components/`. Import only what that feature exports from its `index.ts`
- Create folders by file type at the root of `src/`, such as `src/hooks/`, `src/types/` or `src/utils/`
- Put business logic or calls to the server in `components/ui/`

## TypeScript

TypeScript runs in strict mode, and oxlint fails the CI on `any`, `!` and `@ts-ignore`.

Always:

- Validate what comes from outside before using it, such as an API response, a URL parameter or `localStorage`
- Assign `await response.json()` and `JSON.parse()` to a variable typed `unknown`: both return `any`, and neither TypeScript nor oxlint catches it
- Model states that exclude each other as a discriminated union, such as `{ status: 'loading' } | { status: 'error'; message: string } | { status: 'success'; data: Visit }`
- Handle `null` and `undefined` explicitly, with an early return or a clear error

Never:

- Use `any`, explicit or implicit
- Force a type with `as`, or with `as unknown as`. Only `as const` is allowed; to check a value against a type, use `satisfies`
- Use the non-null assertion `!`
- Silence the compiler with `@ts-ignore`. If an error cannot be fixed, use `@ts-expect-error` with the reason on the same line

## React

Always:

- Function components and hooks
- Derive values during render instead of copying them into state
- Keep state in the closest component that needs it
- Call the server only through the `api.ts` of a feature, never with a `fetch` inside a component
- Show an explicit loading state and an explicit error state for every call to the server, so the screen never stays blank
- Give every item in a list a stable `key` from the data, never the array index

Never:

- Use `useEffect` to compute a value from props or state: compute it during render
- Disable a hooks lint rule to make a warning go away

## Design system

Every screen uses the same components and the same tokens, so a button looks and behaves the same everywhere. Reuse what exists, adjust it only where you need it, and never change shared styles for a single case.

Always:

- Before building an interface element, look for a component in `src/components/ui/` and use it. Colors, typography, radii and shadows come from the tokens in the `@theme` block of `src/index.css`
- To fit a component into one place, such as the width of an input or the space around it, pass layout classes through `className` where you use it: size, margin, padding, position, flex and grid. The change stays in that place
- If the change is visual, such as color, typography, radius, shadow or focus, or several places need it, add a variant to the component instead
- Explain in the pull request any new token or variant, and any change to an existing component or token, because it changes every screen that uses it

Never:

- Restyle a component from outside, or copy its classes to build a similar one
- Use colors or values outside the design system: Tailwind palette colors such as `bg-indigo-600`, hexadecimal or RGB colors, or arbitrary values such as `text-[#1f2937]` or `p-[13px]`
- Create a `.css` file or a CSS Module. `src/index.css` is the only stylesheet
- Use the `style` attribute, except for a value calculated while the app runs, such as the size of a video, with a comment that says why

`HomePage` and `NotFoundPage` still use Tailwind palette colors and typography classes because the tokens and components do not exist yet. They move to tokens and components in the design system issue. Until then, the `design-system-reviewer` agent reports palette colors and visual styling in pages as suggestions, not as blocking.

## Other rules

- Call the server under `/api`. In development, Vite proxies `/api` to `http://localhost:8080`
- Every variable prefixed with `VITE_` ends up in the browser, so a secret never goes in the client environment. Calls that need credentials go through `server/`
- For video, the client only uses the session token that the server generates

## Before opening a pull request

Run the `ui-reviewer` agent when the change touches `client/`. It reviews the design system and the AA rules in the code. Interaction checks are limited to Tab and Shift+Tab navigation and visible focus, with any checks it could not run reported as not verified. It does not require screen reader tests or additional manual accessibility checks.
