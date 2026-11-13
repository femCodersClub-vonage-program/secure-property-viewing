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
Every interactive element shows the same focus ring: `outline-2 outline-offset-2 outline-brand-primary` (7.38:1 on white). It uses an outline rather than a shadow because Windows high contrast mode keeps outlines and removes shadows.

## Agency dashboard

The agency dashboard (screens D1 to D5 in [`user-journeys.md`](user-journeys.md)) uses the same tokens and components as the rest of Peephole. This section only adds what the dashboard needs on top of the common rules.

### Direction

We chose **Option A: Premium SaaS**. Most of the dashboard is reading and comparing rows: listing requests (D2), visits (D4) and messages (D5) are lists with a status, and D1 has only three indicators and the next five visits. Premium SaaS is built around clear hierarchy and well-resolved tables, so an agent finds what needs attention at a glance. Bento works best with many indicators and charts, which the dashboard does not have, and its grid of cards of different sizes makes the reading order harder to follow on mobile and with the keyboard.

### Layout

- Side navigation on the left and the page content on the right, with the page heading (`h1`) at the top of the content
- Content sections, such as the indicators and the next visits in D1, are cards that follow the common card rules
- On mobile the side navigation collapses into a menu button in a top bar, and the content takes the full width

### Navigation

- The side navigation uses `--color-brand-dark` as its background, like the public navbar
- Each item has a `lucide-react` icon and a text label, never an icon on its own. Items: Dashboard, Properties, Listing requests, Calendar, Messages and Profile, with Sign out at the bottom, separated by a divider
- Item text is white (`#FFFFFF` on `#23122B`, 17.61:1, already in the contrast table)
- The active page has `aria-current="page"`, bold text and a 4px white bar on its left edge, so it does not rely on color alone
- `--color-brand-primary` is not used on the dark navigation: it has 2.39:1 on `--color-brand-dark`, below 3:1
- Focus inside the navigation uses a white outline, with the same width and offset as the common focus ring, because the common `outline-brand-primary` would not be visible on the dark background
- The mobile menu button has an accessible name and `aria-expanded`

### Indicators

- D1 shows its three indicators (new requests, upcoming visits and active properties) in a row of three cards on desktop, stacked on mobile
- Each card has a label in `text-sm` and `--color-text-muted`, the number in `text-3xl`, bold, in `--color-text-default`, and a link to the related screen, such as "View requests" to D2
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

#### Status badges

A badge always shows the status as text, with a `lucide-react` icon when it carries meaning. It uses `text-xs`, `--radius-sm`, a 1px border and text in the same color, on a white background.

| Status | Color | Icon |
| :---- | :---- | :---- |
| Listing request `PENDING` | `--color-warning` | Clock |
| Listing request `APPROVED` | `--color-success` | Check |
| Listing request `REJECTED` | `--color-text-muted` | None |
| Message `SCHEDULED`, `SUBMITTED` | `--color-text-muted` | None |
| Message `DELIVERED` | `--color-success` | Check |
| Message `FAILED` | `--color-error` | Alert |

A rejected request is a decision, not an error, so it is neutral. A failed message is the only status that uses `--color-error`, so it stands out in D5, and its row also shows the text "Failed".

### States

Every section that calls the API shows its own state, so one failing call does not leave the whole screen blank.

- **Loading:** a short sentence in `--color-text-muted` in the place of the content, such as "Loading requests…", with no animation
- **Empty:** one short sentence in the place of the table or list, in `--color-text-muted`, such as "No pending requests". No illustrations
- **Error:** the message in `--color-error` and a "Try again" button. A business error (a ProblemDetail returned by the server) shows its message.
- **Unavailable actions:** in D3, when a request is not pending, the approve and reject buttons are disabled and a sentence next to them says why, such as "This request was already approved"
