# Guides

Short guides on things the whole team runs into. When someone solves a problem that others will face too, such as a Vonage setup step, a tricky test double or a Git situation, they write it down here so nobody has to solve it twice.

## When to add a guide

- You spent time on something that was not obvious and others will need it
- The same question came up more than once in Slack or in a mentoring session
- The `docs-reviewer` agent suggested one for your change

Decisions do not belong here: they go in an ADR in [`docs/adr/`](../adr/). Guides explain *how*, ADRs explain *why*.

## How to write one

- One topic per file, named in kebab-case, such as `vonage-test-numbers.md`
- Start with the problem in one or two sentences, then the steps
- In English, like the rest of `docs/`. A step-by-step guide the whole team must follow can also have a Spanish version ending in `.es.md`, such as [`docs/setup.es.md`](../setup.es.md), kept in sync in the same pull request
- No credentials, keys or real phone numbers: use the Vonage test numbers

Guides go through a pull request like any other change.
