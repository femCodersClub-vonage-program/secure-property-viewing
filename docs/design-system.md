# Design system

## Visual direction

We chose **Option B: Modern Soft UI**. The catalog is photo-heavy and needs white space to let images breathe. The white background also creates a stronger contrast with our chosen colors. The purple/pink palette includes our chosen shades and supports our visual identity. Forms, such as for phone verification, stay clear and unambiguous in a product-style layout.

## Colors

Each color is used only in the role listed here. Never swap roles or add colors outside this list without a team decision.

| Token | Hex | Role |
| :---- | :---- | :---- |
| `--color-brand-primary` | `#92189E` | h1, primary buttons, active states, focus ring |
| `--color-brand-secondary` | `#503454` | h2, h3 |
| `--color-brand-dark` | `#23122B` | Navbar, dark surfaces |
| `--color-brand-accent` | `#FF0090` | Logo icon, decorative dots on dark backgrounds |
| `--color-text-default` | `#0F0F0F` | Body text |
| `--color-text-muted` | `#666666` | Supporting text, labels, placeholders |
| `--color-surface-page` | `#FFFFFF` | Page background |
| `--color-surface-card` | `#FFFFFF` | Card background |
| `--color-surface-input` | `#F5F5F5` | Input and tag background |
| `--color-border` | `#E0E0E0` | Borders, dividers |

| `--color-success` | `#1A7D52` | Success states (proposed — confirm with team) |
| `--color-error` | `#B91C1C` | Error states (proposed — confirm with team) |
| `--color-warning` | `#92400E` | Warning states (proposed — confirm with team) |

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

Both body fonts use a **single-storey a**, which is easier to read for people with dyslexia or low vision.

### Type scale

| Token | Size | Use |
| :---- | :---- | :---- |
| `--font-size-xs` | `0.75rem` (12px) | Small labels, badges |
| `--font-size-sm` | `0.875rem` (14px) | Supporting text, captions |
| `--font-size-base` | `1rem` (16px) | Body text |
| `--font-size-lg` | `1.125rem` (18px) | Lead text, card titles |
| `--font-size-xl` | `1.25rem` (20px) | Section headings (h3) |
| `--font-size-2xl` | `1.5rem` (24px) | Page headings (h2) |
| `--font-size-3xl` | `1.875rem` (30px) | Hero headings (h1 mobile) |
| `--font-size-4xl` | `2.25rem` (36px) | Hero headings (h1 desktop) |

Line height: **1.5** for all body text. Headings use `text-wrap: balance`.

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
| `--radius-md` | `14px` | Cards |
| `--radius-lg` | `20px` | Large cards, modals |
| `--radius-pill` | `9999px` | Buttons, chips, tags |

## Borders

One border style throughout: `1px solid var(--color-border)` (`#E0E0E0`). Inputs in focus state use `1.5px solid var(--color-brand-primary)` to meet the 3:1 UI component contrast threshold.

## Shadows

| Token | Value | Use |
| :---- | :---- | :---- |
| `--shadow-card` | `0 2px 10px rgba(0, 0, 0, 0.08)` | Cards |
| `--shadow-button` | `0 4px 16px rgba(146, 24, 158, 0.30)` | Primary button hover/focus |
| `--shadow-focus` | `0 0 0 3px rgba(146, 24, 158, 0.35)` | Keyboard focus ring |

The focus ring uses `--color-brand-primary` at 35% opacity, which meets the 3:1 contrast requirement for focus indicators against a white background.
