# Design system

## Visual direction

We chose **Option B: Modern Soft UI**. The catalog is photo-heavy and needs white space to let images breathe. The white background also creates a stronger contrast with our chosen colors. The purple/pink palette includes our chosen shades and supports our visual identity. Forms, such as for phone verification, stay clear and unambiguous in a product-style layout.

## Colors

Each color is used only in the role listed here. Never swap roles or add colors outside this list without a team decision.

| Token | Hex | Role |
| :---- | :---- | :---- |
| `--color-brand-primary` | `#92189E` | Primary buttons, active states, focus ring |
| `--color-brand-secondary` | `#503454` | Supporting UI, secondary text |
| `--color-brand-dark` | `#23122B` | Headings (h1, h2, h3), navbar, dark surfaces |
| `--color-brand-accent` | `#FF0090` | Logo icon, decorative dots on dark backgrounds |
| `--color-text-default` | `#0F0F0F` | Body text |
| `--color-text-muted` | `#666666` | Supporting text, labels, placeholders |
| `--color-text-light` | `#FFFFFF` | Text on dark background, dark mode |
| `--color-surface-page` | `#FFFFFF` | Page background |
| `--color-surface-card` | `#FFFFFF` | Card background |
| `--color-surface-input` | `#F5F5F5` | Input and tag background |
| `--color-border` | `#E0E0E0` | Dividers, card borders |
| `--color-border-input` | `#8A8A8A` | Form field borders (3.45:1 on white, 3.17:1 on `#F5F5F5`) |
| `--color-success` | `#1A7D52` | Success states |
| `--color-error` | `#B91C1C` | Error states |
| `--color-warning` | `#92400E` | Warning states |

### Contrast

Pairs already verified against WCAG 2.1 AA:

| Text color | Background | Ratio | Use |
| :---- | :---- | :---- | :---- |
| `#92189E` | `#FFFFFF` | 7.38:1 | h1, buttons — passes AA for all text |
| `#503454` | `#FFFFFF` | 10.71:1 | h2 — passes AA for all text |
| `#23122B` | `#FFFFFF` | 17.61:1 | Dark surfaces — passes AA for all text |
| `#0F0F0F` | `#FFFFFF` | ~21:1 | Body text — passes AA for all text |
| `#666666` | `#FFFFFF` | 5.74:1 | Muted text — passes AA for normal text |
| `#FFFFFF` | `#92189E` | 7.38:1 | White on primary button — passes AA |
| `#FF0090` | `#FFFFFF` | 3.71:1 | Accent on white — large text and UI components only (3:1 threshold). Not used as body text |
| `#FF0090` | `#23122B` | — | Accent dot on dark nav — decorative only, not text |
| `#1A7D52` | `#FFFFFF` | 4.66:1 | Success — passes AA for normal text |
| `#B91C1C` | `#FFFFFF` | 6.31:1 | Error — passes AA for normal text |
| `#92400E` | `#FFFFFF` | 7.06:1 | Warning — passes AA for normal text |

Pairs that do **not** meet AA and must never be used:

| Pair | Ratio | Why it fails |
| :---- | :---- | :---- |
| `#FF00FF` on any background | ≤ 3.14:1 on white | Below 4.5:1 for normal text. `#FF00FF` excluded from the palette |
| `#92189E` on `#FF00FF` | 2.35:1 | Below 3:1 — not valid for text or UI components. `#FF00FF` excluded from the palette |

## Typography

Fonts are self-hosted in `src/assets/` or use system fonts — no Google Fonts (would send visitor IPs to Google).

| Token | Value | Use |
| :---- | :---- | :---- |
| `--font-display` | `Georgia, 'Times New Roman', serif` | h1, h2 |
| `--font-body` | `'Trebuchet MS', Arial, sans-serif` | All other text |

### Type scale

Font sizes and line height use Tailwind's default classes, so they need no custom tokens:

| Class | Size | Use |
| :---- | :---- | :---- |
| `text-xs` | `0.75rem` (12px) | Small labels, badges |
| `text-sm` | `0.875rem` (14px) | Supporting text, captions |
| `text-base` | `1rem` (16px) | Body text |
| `text-lg` | `1.125rem` (18px) | Lead text, card titles |
| `text-xl` | `1.25rem` (20px) | Section headings (h3) |
| `text-2xl` | `1.5rem` (24px) | Page headings (h2) |
| `text-3xl` | `1.875rem` (30px) | Hero headings (h1 mobile) |
| `text-4xl` | `2.25rem` (36px) | Hero headings (h1 desktop) |

Line height: `leading-normal` (1.5) for body text. Headings use `text-wrap: balance`.

## Spacing

The base unit is `0.25rem` (4px). The scale follows Tailwind's default steps, extended with two named tokens for the most-used gaps:

| Token | Value | Use |
| :---- | :---- | :---- |
| `--spacing-section` | `3rem` (48px) | Gap between page sections |
| `--spacing-card` | `1rem` (16px) | Inner card padding |

## Radii

| Token | Value | Use |
| :---- | :---- | :---- |
| `--radius-sm` | `8px` | Inputs, small badges |
| `--radius-md` | `14px` | Cards, buttons |
| `--radius-lg` | `20px` | Large cards, modals |
| `--radius-pill` | `9999px` | Chips, tags |

## Borders

Dividers and cards use `1px solid var(--color-border)`. Form fields use `1px solid var(--color-border-input)`, so they meet the 3:1 contrast for interface components.

`Card` has a `dark` variant for a card that has to stand out from the page, such as the confirmed visit on A6: `--color-brand-dark` background, no border and white text (17.61:1). Only text in `--color-text-light` and decorative `--color-brand-accent` dots go inside it, and no interactive elements, so the common focus ring is never needed on the dark background.

A field with an error (`aria-invalid`) uses `2px solid var(--color-error)`. The wider border keeps the error visible without relying on color alone, and the message under the field says what went wrong.

## Form fields

- Labels are bold, in `--color-text-default`. Hints go under the label in `--color-text-muted`
- `Input` has a `code` variant for short codes, such as the 6 digits of an SMS: `text-3xl`, bold, centered, with wide letter spacing and tabular numbers
- `Button` has a `link` variant for a secondary action that looks like a link, such as "Change the number". It stays a `<button>`, with a minimum height of 44px
- `Button` has a `shape`, `default` unless set. `pill` rounds it fully and keeps its padding, such as a time in the visit calendar. `circle` makes it round with no padding, so it can shrink to fit a day in a 7-column calendar at 320px. The variant still sets the colors, so a choice uses `primary` when selected and `secondary` otherwise, with `aria-pressed`

## Shadows

| Token | Value | Use |
| :---- | :---- | :---- |
| `--shadow-card` | `0 2px 10px rgba(0, 0, 0, 0.08)` | Cards |
| `--shadow-button` | `0 4px 16px rgba(146, 24, 158, 0.30)` | Primary button hover |

## Focus

Every interactive element shows a focus ring using `outline-2 outline-offset-2`. It uses an outline rather than a shadow because Windows high contrast mode keeps outlines and removes shadows.

| Context | Class | Contrast |
| :---- | :---- | :---- |
| All elements except danger button | `outline-brand-primary` | 7.38:1 on white — passes AA |
| Danger button | `outline-error` | 6.31:1 on white — passes AA |
| Elements on dark navigation (`bg-brand-dark`) | `outline-white` | 17.61:1 on `#23122B` — passes AA |

## Map

The catalog map (`PropertyMap` in the `property-browsing` feature) uses Leaflet with OpenStreetMap tiles.

- **Pin:** a map pin of 28×36 px whose tip marks the place, filled with `--color-brand-primary`, with a `--color-surface-page` border and dot. The purple has about 6:1 on the light background of the tiles, above the 3:1 for interface components, and the white border keeps it visible on darker areas
- **Focus:** pins and the map use the common `outline-brand-primary` focus ring
- **Popup:** the title in `font-display text-lg` and `--color-brand-dark`, the price in `--color-brand-primary`, and a `Link` to the details, whose accessible name includes the title
- **Leaflet's stylesheet** is imported in `src/index.css` inside `layer(components)`, so the design system's utilities win over Leaflet's own colors and sizes. Leaflet's controls (zoom buttons, the popup's close button and the attribution) keep its own look, which is not made of our tokens: it is the one exception to the design system, because restyling them would mean overriding a third-party stylesheet

## Public site on dark surfaces

The header and the footer of the public site, and the four steps of the home page (`SiteHeader`, `SiteFooter` and `HowItWorks` in the `public-site` feature) are on `--color-brand-dark`. `PublicLayout` puts the header and the footer on every public page, except the video room, where the call needs the whole screen.

- The navigation links of the header and the footer (`SiteNavLink`) are white, and `--color-brand-accent` and underlined on hover and on the current page, which also has `aria-current="page"`
- Each person of the team is a `TeamLink` to LinkedIn: the name in `--color-brand-accent`, underlined on hover, and the role under it in white. No photo is loaded from another site, so no visitor's IP is sent there
- `--color-brand-accent` has 4.74:1 on `--color-brand-dark`, so it passes AA for text there. These links are its only use as text. Both components have a white focus outline and are only for dark surfaces. Links on white keep `--color-brand-primary`
- Each of the four steps is a card with a `--color-text-light` border at 20% on `--color-brand-dark` at 70%, with white text. Its number is white, bold and `text-2xl`, on a circle with a gradient from `--color-brand-primary` (7.38:1) to `--color-brand-accent` (3.71:1, enough for large text). The shield icon next to the scam it stops is decorative, in `--color-brand-accent`
- Behind the steps there is a photo under `--color-brand-dark` at 85%. Over pure white, the worst case, the text has at least 9.4:1 without counting the card's own background

## Motion

Two CSS utilities in `src/index.css`, with no JavaScript and no dependency, for any page of the public site.

- `parallax`: a decorative photo moves more slowly than the page. Use it through `ParallaxImage`, never on an image that carries information
- `reveal`: a block fades in and moves up 2.5rem as it enters the screen. Never on the headline of a page, on forms or on messages
- Both only run with `prefers-reduced-motion: no-preference` and where the browser supports scroll-driven animations. Otherwise the content is shown still and complete
- A parent with `overflow-hidden` breaks them, because they would follow it instead of the page. Use `overflow-clip`

## Agency dashboard

The agency dashboard (screens D1 to D5 in [`user-journeys.md`](user-journeys.md)) uses the same components as the rest of Peephole. On top of the common tokens it has its own colors, fonts and shadow, listed below and used only in `features/agency-dashboard`. This section only adds what the dashboard needs on top of the common rules.

### Direction

We chose **Option A: Premium SaaS**. Most of the dashboard is reading and comparing rows: listing requests (D2), visits (D4) and messages (D5) are lists with a status, and D1 has only three indicators and the next five visits. Premium SaaS is built around clear hierarchy and well-resolved tables, so an agent finds what needs attention at a glance. Bento works best with many indicators and charts, which the dashboard does not have, and its grid of cards of different sizes makes the reading order harder to follow on mobile and with the keyboard.

On top of Premium SaaS, the dashboard uses the **Mango on purple** look: a dark purple side navigation with a gradient, a mango (`#FFC93C`) highlight for the current page and the next visit, indicator cards with a gradient icon and a large number, and Space Grotesk and Inter type. The shared components in `src/components/ui/` keep their own look, so links and buttons inside the dashboard still use `--font-body`.

### Tokens

These tokens are in the `@theme` block of `src/index.css`, after the common ones, and are used only in `features/agency-dashboard`.

| Token | Value | Role |
| :---- | :---- | :---- |
| `--color-dashboard-highlight` | `#FFC93C` | Mango: current page in the navigation, the next visit's "Join visit" link and "Next" label, the agent's name in the greeting and a 15% tint on the next visit's row. Only as a background under `--color-brand-dark` text, or as text on dark purple |
| `--color-dashboard-page` | `#FBF8FC` | Page background behind the dashboard's cards |
| `--color-dashboard-nav-end` | `#3B1743` | End of the navigation gradient, from `--color-brand-dark` |
| `--color-dashboard-featured-mid` | `#5A1764` | Middle stop of the next visit card gradient, from `--color-brand-dark` to `--color-brand-primary` |
| `--font-dashboard-display` | `'Space Grotesk', system-ui, sans-serif` | Page heading, section headings, the next visit's name and the indicator numbers |
| `--font-dashboard-body` | `'Inter', system-ui, sans-serif` | All other dashboard text |
| `--shadow-dashboard-highlight` | `0 8px 24px rgba(255, 201, 60, 0.35)` | The mango "Join visit" link |

Gradients have no token of their own: they combine these colors with Tailwind's `bg-linear-*` utilities, such as `bg-linear-to-b from-brand-dark to-dashboard-nav-end`.

### Fonts

Inter and Space Grotesk are variable fonts, self-hosted as `.woff2` files in `src/assets/fonts/` and declared with `@font-face` in `src/index.css` with `font-display: swap`. Both are under the SIL Open Font License 1.1, whose text is kept next to each font (`OFL-Inter.txt` and `OFL-SpaceGrotesk.txt`). No Google Fonts.

### Layout

- Side navigation on the left and the page content on the right, with the page heading (`h1`) at the top of the content
- Content sections, such as the indicators and the next visits in D1, are cards that follow the common card rules. The next visit card is the one exception, described in [Next visit card](#next-visit-card)
- On mobile the side navigation collapses into a menu button in a top bar, and the content takes the full width
- Screens without the navigation, signing in and checking the session, show one centered card on `--color-dashboard-page` with the dashboard fonts (`CenteredScreen`). The card heading is `DashboardHeading`

### Navigation

- The side navigation has a vertical gradient from `--color-brand-dark` to `--color-dashboard-nav-end`. On desktop it starts with the name Peephole in `--font-dashboard-display` next to a decorative `--color-brand-accent` dot; on mobile the name is in the top bar
- Each item has a `lucide-react` icon and a text label, never an icon on its own. Items: Dashboard, Properties, Listing requests, Calendar, Messages and Profile, with Sign out at the bottom, separated by a divider
- The active page has `aria-current="page"`, a `--color-dashboard-highlight` background and bold `--color-brand-dark` text (11.46:1), so it does not rely on color alone. The other items get a 10% white background on hover
- Item text is white (`#FFFFFF` on `#23122B`, 17.61:1, and on `#3B1743`, 15.11:1)
- `--color-brand-primary` is not used on the dark navigation: it has 2.39:1 on `--color-brand-dark`, below 3:1
- Focus inside the navigation uses a white outline, with the same width and offset as the common focus ring, because the common `outline-brand-primary` would not be visible on the dark background
- The mobile menu button has an accessible name and `aria-expanded`

### Indicators

- D1 shows its three indicators (new requests, upcoming visits and active properties) in a row of three cards on desktop, stacked on mobile
- Each card is a default `Card` with, in order: a decorative 44px icon (the same `lucide-react` icon as its navigation item, white on a `--color-brand-primary` to `--color-brand-accent` gradient, hidden from assistive technology), the label in `text-sm`, semibold, in `--color-text-muted`, the number in `text-5xl`, bold, in `--font-dashboard-display` and `--color-brand-dark`, and a link to the related screen, such as "View requests" to D2
- No trend percentages and no charts: the API does not return that data
- Numbers use `tabular-nums`, so they line up

### Tables

D2 and D5 are tables, and the next visits in D1 follow the same rules.

- Header row in `text-sm`, bold, in `--color-text-muted`, with a bottom border in `--color-border`
- Rows separated by a `--color-border` line, with no zebra stripes and no shadow on each row
- Dates and amounts right-aligned with `tabular-nums`
- The row links to its details through a real link on its main text, such as the property title in D2, not by making the whole row clickable
- In D2 the status filters (pending, approved, rejected) use the design system tabs
- On mobile each row becomes a stacked item with its label and value, instead of a table with horizontal scroll
- In D1 the next visit's row has a 15% `--color-dashboard-highlight` tint and a "Next" label (`NextLabel`, bold `--color-brand-dark` text on mango) next to its time, so it does not rely on color alone. Other tables have no tinted rows

#### Status badges

A badge always shows the status as text, with a `lucide-react` icon when it carries meaning. It uses `text-xs`, `--radius-sm`, a 1px border and text in the same color, on a 10% tint of that color, which helps when scanning a table row quickly.

| Status | Color | Icon |
| :---- | :---- | :---- |
| Listing request `PENDING` | `--color-warning` | Clock |
| Listing request `APPROVED` | `--color-success` | Check |
| Listing request `REJECTED` | `--color-text-muted` | None |
| Message `SCHEDULED`, `SUBMITTED` | `--color-text-muted` | None |
| Message `DELIVERED` | `--color-success` | Check |
| Message `FAILED` | `--color-error` | Alert |
| Post-visit call alert, "Asked for money before signing" | `--color-warning` | TriangleAlert |

A rejected request is a decision, not an error, so it is neutral. A failed message is the only status that uses `--color-error`, so it stands out in D5, and its row also shows the text "Failed".

### Visits to review card

D1 shows the visits where the [post-visit call](../specs/post-visit-call.md) recorded that someone asked the visitor for money, in a "Visits to review" card (`VisitsToReviewCard`) at the top, above the next visit card. It is not shown when `alerts` is empty.

- A `Card` with an `h2` styled like "Next visits", and a `DataTable` with the visitor, the property, the visit time and when it was reported, both in Madrid time
- Each row ends with a warning badge, "Asked for money before signing" with a TriangleAlert icon, so the alert never relies on color. The rows have no tint

### Next visit card

D1 shows the next visit, the earliest in `nextVisits`, in its own card (`NextVisitCard`) above the indicators. It is not shown when there are no upcoming visits.

- A `section` named by its heading "Next video visit", with `--radius-lg` and a diagonal gradient from `--color-brand-dark` through `--color-dashboard-featured-mid` to `--color-brand-primary`, and white text
- The heading in `text-sm`, bold and uppercase in `--color-dashboard-highlight`, the visitor's name in `text-3xl` and `--font-dashboard-display`, and the property and time in white at 85%
- A decorative `--color-brand-accent` glow in one corner. Text never goes on top of it
- "Join visit" is a `HighlightLink`: a pill with a `--color-dashboard-highlight` background, bold `--color-brand-dark` text and a white focus outline. It is only for the dashboard's dark surfaces, because mango on white has 1.54:1 and a white outline would not show. Its accessible name says which visit, like the links in the table

### Password field

The sign-in password uses `PasswordInput`, a dashboard component that wraps the shared `Input` with a button to show the password.

- An eye icon button inside the field, on the right, 44 px wide. The field gets `pr-12`, so the text never runs under the icon
- A fixed accessible name, "Show password", with `aria-pressed` saying whether the password is shown. The icon is `aria-hidden`
- The icon in `--color-text-muted` (5.3:1 on `--color-surface-input`), `--color-brand-dark` on hover, and the common focus ring
- It is a plain `button` because `Button` has no icon-only variant yet

### Dashboard contrast

Pairs used only in the dashboard, checked against WCAG 2.1 AA:

| Text color | Background | Ratio | Use |
| :---- | :---- | :---- | :---- |
| `#23122B` | `#FFC93C` | 11.46:1 | Active navigation item, "Join visit" link, "Next" label |
| `#FFC93C` | `#23122B` | 11.46:1 | Next visit heading, darkest part of the card |
| `#FFC93C` | `#92189E` | 4.80:1 | Next visit heading, lightest part of the card. Passes AA for all text |
| `#FFFFFF` | `#3B1743` | 15.11:1 | Navigation text at the end of the gradient |
| `#FFFFFF` | `#5A1764` | 12.06:1 | Next visit card text |
| `#0F0F0F` | `#FFF7E2` | 17.94:1 | Text on the tinted next visit row |
| `#666666` | `#FFF7E2` | 5.37:1 | Mobile labels on the tinted row |
| `#666666` | `#FBF8FC` | 5.45:1 | Muted text on the dashboard page background |
| `#B91C1C` | `#FBF8FC` | 6.14:1 | Error message of a section that could not load, such as D1 |

Pairs that must never be used:

| Pair | Ratio | Why it fails |
| :---- | :---- | :---- |
| `#FFC93C` text on `#FFFFFF` | 1.54:1 | Far below 3:1. Mango is never text on white |
| `#FFFFFF` text on `#FF0090` | 3.71:1 | Below 4.5:1. The pink glow is decorative only |

### Calendar

D4 shows the visits of one week, from Monday to Sunday in `Europe/Madrid`, and opens on the current week.

- Under the page heading, the week is an `h2` in `--font-dashboard-display`, such as "23 November – 29 November 2026", next to "Previous week" and "Next week" `secondary` buttons. Each button has a text label, and its chevron icon is decorative. The buttons stay on screen while the week loads or fails, so the agent can always change week
- The whole week is one default `Card`. Visits are split by `--color-border` lines, as table rows are, with no card or shadow per visit
- Each day starts with a header band: an `h3` on `--color-dashboard-page` with a `--color-border` line under it, with the weekday in `text-sm` and `--color-text-muted` (5.45:1) and the day number in `text-2xl`, bold, in `--font-dashboard-display` and `--color-brand-dark`. Its accessible name is always the full date, such as "Tuesday 24 November"
- Below `xl`, the days are stacked, and each band shows the date first ("1 December") with the weekday on the right, so the dates line up from day to day. Each visit has its details on the left and "Join visit" always on the right, so long details wrap instead of moving the button. The reason for a disabled button goes on its own line under the visit. From `xl` up, the days are seven columns split by vertical lines, so the bands make one header row with the weekday above the number, and the month is visually hidden because the week heading already says it. The columns start at `xl` because below it, with the side navigation, a column is too narrow for a visit
- Every day is shown, and a day with no visits says "No visits"
- Each visit (`CalendarEvent`) shows the start and end times in `tabular-nums`, the visitor in semibold, the property in `--color-text-muted`, and "Join visit" as described in [States](#states). Its accessible name says which visit and on which day, as in D1
- While loading, the sentence names the week, such as "Loading the visits of 23 November – 29 November 2026…". An empty week says "No visits this week"

### States

Every section that calls the API shows its own state, so one failing call does not leave the whole screen blank.

- **Loading:** a short sentence in `--color-text-muted` in the place of the content, such as "Loading requests…", with no animation. When the whole screen comes from one call, as D1 does with `GET /api/agency/summary`, the page heading is the screen's name ("Dashboard") while it loads or fails, and the greeting replaces it when the data arrives, so the page always has an `h1`
- **Empty:** one short sentence in the place of the table or list, in `--color-text-muted`, such as "No pending requests". No illustrations
- **Error:** the message in `--color-error` and a "Try again" button. A business error (a ProblemDetail returned by the server) shows its message.
- **Unavailable actions:** in D3, when a request is not pending, the approve and reject buttons are disabled and a sentence next to them says why, such as "This request was already approved"
- **Join visit:** in D1 and D4, only `CONFIRMED` visits get the "Join visit" link. Any other visit shows a disabled "Join visit" button at 40% opacity, like other unavailable buttons, with a sentence saying why, such as "This visit was canceled"
- **Signed out:** an agency call that answers `401 AUTHENTICATION_REQUIRED` never shows an error. It sends the agent to the sign-in page, which brings her back to the same page after she signs in

### Tabs

D2 filters its requests by status with tabs, and other screens can reuse them.

- The tab list has a bottom border in `--color-border`
- The selected tab has bold text in `--color-text-default` and a 4px `--color-brand-primary` bar under it. The other tabs use `--color-text-muted`, so the selection does not rely on color alone
- Only the selected tab is in the Tab order. The left and right arrow keys move between tabs and wrap around, and Home and End go to the first and last tab
- Focus uses the common focus ring
