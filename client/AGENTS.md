# Client

React 19 with TypeScript 7, Vite 8 and Tailwind CSS 4. Linted with oxlint. Requires Node.js 22.12 or later.

## Commands

Run them from `client/`.

- Install the pinned dependencies: `npm ci`
- Start the development server: `npm run dev`
- Type-check and build: `npm run build`
- Lint: `npm run lint`

## Rules

- Style with Tailwind utility classes. Tailwind is loaded in `src/index.css`, with no `tailwind.config` file
- Every variable prefixed with `VITE_` ends up in the browser, so a secret never goes in the client environment. Calls that need credentials go through `server/`
- For video, the client only uses the session token that the server generates
