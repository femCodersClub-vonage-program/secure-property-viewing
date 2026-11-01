# 0003. Accessibility target and dependency policy

- **Status:** Accepted
- **Date:** 2026-11-01
- **Issue:** [#9](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/9)

## Context

Two rules shape every pull request from now on, and both need a clear reason behind them:

- **Accessibility.** The first pull request template asked for a 7:1 contrast, which is WCAG level AAA. The team is about to build its design system, with colors proposed by each participant, and needs a target it can meet on every screen within a program of about five weeks
- **Dependencies.** Every library is code someone has to keep secure, licensed and up to date. With several people adding features at the same time, it is easy to end up with two libraries that solve the same problem

## Decision

**Accessibility: WCAG 2.1 AA.** Text contrast of at least 4.5:1 (3:1 for large text), 3:1 for interface components and the focus indicator, full keyboard use, visible focus, labeled forms, meaningful alternative text, and layouts that work at 200% zoom and on a phone in landscape. The concrete rules are in the root [`AGENTS.md`](../../AGENTS.md#accessibility) and take precedence over any personal instruction that asks for AAA.

**Dependencies: justified or rejected.** A new dependency is added only when the stack in [ADR 0001](0001-tech-stack.md) cannot solve the problem. The pull request explains why it is needed, its license and how actively it is maintained. If something we already use, or something similar, solves the problem, the pull request is rejected. AI assistants never add a dependency without asking first.

**How they are checked:**

- The `accessibility-reviewer` and `design-system-reviewer` agents, run through `ui-reviewer`, check every client change before its pull request, and list what has to be verified by hand, such as a screen reader or 200% zoom
- The `docs-reviewer` agent checks that a new dependency is justified in the pull request
- The tech lead reviews both in the pull request

## Alternatives considered

- **WCAG 2.1 AAA.** The strongest target. Discarded because 7:1 contrast on every element would heavily limit the palette the team is about to choose, and several AAA criteria, such as sign language for video, are out of reach for this project. AA is the level that most accessibility laws require
- **Checking styles and accessibility in the CI.** A script could reject arbitrary Tailwind values or `style` attributes automatically. Discarded for now because most of what matters, such as a duplicated component, a missing label or a confusing heading order, needs judgment that a script cannot apply, while the agents can explain each finding
- **No dependency policy.** Each person adds what they need. Discarded because it leads to overlapping libraries and to code nobody chose on purpose

## Consequences

- **Easier:** the team has one clear accessibility target, the design system can use a wider palette, and the stack stays small and known
- **Harder:** AA still needs manual checks with a screen reader and at 200% zoom, which no agent can do. A participant who needs a library has to argue for it first
- **Accepted trade-off:** the agents do not block a merge on their own. A finding is only fixed if someone reads the report, which is why the tech lead also checks it in the review
