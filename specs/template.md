# Feature name

- **Status:** Draft
- **Issue:** #n
- **Journey:** link to the step in [`docs/user-journeys.md`](../docs/user-journeys.md), if it applies

## Problem

Who needs this, what they are trying to do and why it matters for Peephole. Two or three sentences are usually enough.

## User stories

- As a *role*, I want *something* so that *benefit*

## Acceptance criteria

Each criterion is something we can check, and becomes at least one test.

- [ ] ...

## Out of scope

What this spec intentionally leaves for later, so nobody builds it by accident.

## Technical plan

### Data

New tables or columns, as defined in the [data model](data-model-and-api-contract.md). Every schema change goes through a Flyway migration.

### API

Endpoints this feature adds or uses, with their request, response and errors.

### Vonage

Which Vonage API is called, from where, and how tests replace the real calls.

### Client

Pages, features and design system components involved.

## Open questions

Decisions still to settle, with a proposal when we have one.
