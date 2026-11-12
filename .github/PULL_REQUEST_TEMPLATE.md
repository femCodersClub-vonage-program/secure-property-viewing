<!--
The PR title becomes the squash commit and feeds the CHANGELOG.
Use Conventional Commits: type(scope): summary
Example: feat(server): add OTP verification endpoint
Types: feat, fix, docs, test, refactor, perf, ci, chore
-->

## What and why

<!-- What this PR changes and why. -->

## Out of scope

<!-- What this PR intentionally leaves out, and where it will be handled. -->

## Links

- Closes #
- Spec: <!-- link to specs/..., or "n/a" for chores -->

## How to test

<!-- Steps for the reviewer to verify the change. -->

1.

## Review agents

<!--
What each agent you ran found, and what you did with each finding: fixed, or kept as it is and why.
Run docs-reviewer always, ui-reviewer if client/ changed, and server-reviewer if server/ changed.
Example:
- docs-reviewer: asked to add the new variables to docs/setup.es.md. Done
- server-reviewer: found the phone number in a log line. Removed. It also suggested splitting start() in two; I kept it, because each part is three lines
-->

- **docs-reviewer:**

## Screenshots

<!-- UI changes only. Delete this section otherwise. -->

## Checklist

**Every PR**

- [ ] The *Review agents* section above sums up what each agent found and what I did with it
- [ ] Changes stay within the scope of the linked issue
- [ ] No secrets, Vonage credentials or real personal data (GitHub does not detect Vonage keys)

**If applicable** (delete the items that don't apply)

- [ ] Tests added or updated from the spec's acceptance criteria
- [ ] Docs updated: `docs/` (specs, ADR, diagrams, guides), and both language versions of every file that has a `.es.md` version, such as README, CONTRIBUTING or `docs/setup.md`
- [ ] ADR added for an architecture, dependency or security decision
- [ ] New dependency: the description explains why it is needed, its license and its maintenance, and nothing we already use solves the problem
- [ ] UI: only design system components and tokens; AA code review findings addressed; agent results for Tab/Shift+Tab navigation and visible focus reported, including any checks not verified
- [ ] Vonage: behavior checked against the official docs, and tests use test doubles

## Notes for the reviewer

<!-- Debatable decisions, known limitations or pending decisions. -->
