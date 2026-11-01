# Client

React 19 with TypeScript 7, Vite 8, React Router 8 and Tailwind CSS 4. Linted with oxlint, formatted with Prettier and tested with Vitest and Testing Library. Requires Node.js 22.22.2 or later.

## Commands

Run them from `client/`.

- Install the pinned dependencies: `npm ci`
- Start the development server: `npm run dev`
- Run the tests: `npm test`
- Lint: `npm run lint`
- Format: `npm run format`
- Type-check and build: `npm run build`

## Rules

- A page lives in `src/pages/` and is registered in `src/routes.tsx`
- Style with Tailwind utility classes. Tailwind is loaded in `src/index.css`, with no `tailwind.config` file
- Call the server under `/api`. In development, Vite proxies `/api` to `http://localhost:8080`
- Every variable prefixed with `VITE_` ends up in the browser, so a secret never goes in the client environment. Calls that need credentials go through `server/`
- For video, the client only uses the session token that the server generates
