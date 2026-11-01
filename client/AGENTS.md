# Client

React 19 with TypeScript 7, Vite 8, React Router 8 and Tailwind CSS 4. Linted with oxlint, formatted with Prettier and tested with Vitest and Testing Library. Requires Node.js 22.22.2 or later.

The accessibility, dependency and test rules in the root [`AGENTS.md`](../AGENTS.md) apply here too.

## Commands

Run them from `client/`.

- Install the pinned dependencies: `npm ci`
- Start the development server: `npm run dev`
- Run the tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`
- Type-check and build: `npm run build`

## Structure

- A page lives in `src/pages/` and is registered in `src/routes.tsx`
- A shared interface component lives in `src/components/ui/`, such as `Button`, `Link` or `Input`. The folder and the first components are created in the design system issue
- Pages compose components; they do not style elements themselves
- Calls to the server live in `src/api/`, one module per resource. It is created with the first API call

## TypeScript

TypeScript runs in strict mode, and oxlint fails the CI on `any`, `!` and `@ts-ignore`.

Always:

- Type what comes from outside, such as an API response, a URL parameter or `localStorage`, as `unknown` and check its shape before using it
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
- Call the server only through `src/api/`, never with a `fetch` inside a component
- Give every item in a list a stable `key` from the data, never the array index

Never:

- Use `useEffect` to compute a value from props or state: compute it during render
- Disable a hooks lint rule to make a warning go away

## Design system

Every screen uses the same components and the same tokens, so a button looks and behaves the same everywhere and nobody styles it twice.

Always:

- Use the design tokens defined in the `@theme` block of `src/index.css`: colors, typography, radii and shadows come only from there
- Before building an interface element, look for an existing component in `src/components/ui/` and use it
- If a component lacks something you need, add a variant to that component instead of creating a similar one
- Keep `className` in pages for layout only: position, display, flex and grid with their alignment, gap, margin and padding, sizes and text alignment. Typography, radius, shadow and focus styles come from the component
- If a new token or variant is really needed, add it to the design system in the same pull request and explain why in the description

Never:

- Use arbitrary Tailwind values, such as `text-[#1f2937]` or `p-[13px]`
- Use the `style` attribute
- Create a `.css` file or a CSS Module. `src/index.css` is the only stylesheet
- Write hexadecimal or RGB colors in TSX
- Use Tailwind palette colors, such as `bg-indigo-600`, instead of the design tokens
- Copy the classes of an existing component to build a new one

`HomePage` and `NotFoundPage` still use Tailwind palette colors and typography classes because the tokens and components do not exist yet. They move to tokens and components in the design system issue. Until then, the `design-system-reviewer` agent reports palette colors and visual styling in pages as suggestions, not as blocking.

## Other rules

- Call the server under `/api`. In development, Vite proxies `/api` to `http://localhost:8080`
- Every variable prefixed with `VITE_` ends up in the browser, so a secret never goes in the client environment. Calls that need credentials go through `server/`
- For video, the client only uses the session token that the server generates

## Before opening a pull request

Run the `ui-reviewer` agent when the change touches `client/`. It checks the design system and the accessibility rules, and lists what has to be checked by hand.
