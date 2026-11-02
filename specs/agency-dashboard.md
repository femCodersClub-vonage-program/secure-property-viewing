# Agency dashboard

- **Status:** In review
- **Issue:** [#14](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/14)
- **Journey:** agency dashboard, screens 1 to 5 in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

The agency is the other half of Peephole: it reviews who wants to list a property, approves what gets published, runs the video visits and keeps track of what has been sent to each person. The dashboard brings all of that into five screens, so an agent can see at a glance what needs attention and act on it.

## User stories

- As an agent, I want to see today's pending work as soon as I sign in, so that nothing slips through
- As an agent, I want to review a listing request and approve or reject it, so that only verified properties are published
- As an agent, I want to see my visits in a calendar and join them from there, so that I arrive on time
- As an agent, I want to see which confirmations and reminders were sent and whether they arrived, so that I can follow up when something fails

## Acceptance criteria

Layout:

- [ ] Every screen shares one layout with side navigation: Dashboard, Properties, Listing requests, Calendar, Messages, Profile and Sign out
- [ ] On mobile the navigation collapses into a menu, and the active page is marked with `aria-current="page"`

Dashboard (D1):

- [ ] It greets the agent by name and shows three indicators: new requests (listing requests in `PENDING`), upcoming visits (confirmed visits in the next 7 days) and active properties (properties in `ACTIVE`)
- [ ] It lists the next five visits with time, visitor, property and a "Join visit" button that leads to the video visit once that feature exists

Listing requests (D2):

- [ ] It lists the requests with tabs by status (pending, approved, rejected), each with owner, property summary, date and a status badge
- [ ] Each request opens its details

Request details (D3):

- [ ] It shows the owner information, the property information and the request timeline: when it was received, when it went into review and when it was reviewed
- [ ] "Approve and publish" turns the request into an active property in the catalog
- [ ] "Reject" asks for a reason before rejecting
- [ ] Only pending or in review requests can be approved or rejected, and the buttons say so when they are not available
- [ ] In the MVP, both roles (`ADMIN` and `AGENT`) can approve and reject

Visits calendar (D4):

- [ ] It shows the visits of the week, with the option to move to the previous and next weeks
- [ ] Each visit shows time, visitor and property, and has the same "Join visit" link as the dashboard
- [ ] The calendar controls have accessible names and support keyboard use with visible focus

Messages and notifications (D5):

- [ ] It lists the messages sent and scheduled, with recipient, type, related visit or request, time and status
- [ ] Failed messages stand out with text, not only with color

All screens:

- [ ] Loading, empty and error states, using the API client
- [ ] Design system components and tokens only, and the accessibility rules in the root `AGENTS.md`
- [ ] Sample data in one file per screen while its endpoint is not in `dev`

## Out of scope

- Editing or deleting published properties, and the Properties and Profile screens beyond a placeholder
- Several agencies, user management and roles beyond the demo users
- Sending messages by hand from the dashboard

## Open questions

- **Sign-in.** Depends on the decision in the [data model](data-model-and-api-contract.md#open-questions)
- **In review status.** Whether a request moves to `IN_REVIEW` when an agent opens it or when the video call with the owner is scheduled. Proposal: when the video call is scheduled, since that is the step in journey B
- **Calendar view.** Week view only, or also a day view on mobile. Proposal: week view on desktop and a list of the day on mobile
- **Publication data.** A listing request currently lacks the title, description, area and photos used by the catalog. Agree with the owner listing spec on who supplies them and when, and update the data model and approval contract before implementing "Approve and publish"
- **Response contracts.** Define the exact JSON fields and nullability for request lists and details, the approval and rejection responses, calendar visits and messages before those endpoints are implemented

## Technical plan

### Data

No new tables: `listing_request`, `property`, `visit` and `message` from the [data model](data-model-and-api-contract.md). Approving a request creates a `property` with `listing_request_id` set and status `ACTIVE`, in the same transaction.

### API

`GET /api/agency/summary`

```json
{
  "agentName": "Marta",
  "newRequests": 12,
  "upcomingVisits": 8,
  "activeProperties": 5,
  "nextVisits": [
    { "visitId": 31, "startsAt": "2026-11-10T11:00:00+01:00", "visitorName": "...", "propertyTitle": "Apartment in Gràcia" }
  ]
}
```

`GET /api/agency/listing-requests?status=PENDING` returns a list with id, owner name, property summary, created date and status. `GET /api/agency/listing-requests/{id}` returns the full request.

`POST /api/agency/listing-requests/{id}/approve` returns `200` with the new property id. `POST /api/agency/listing-requests/{id}/reject` receives `{ "reason": "..." }`. Both return `409 LISTING_REQUEST_ALREADY_REVIEWED` if the request was already approved or rejected.

`GET /api/agency/visits?from=&to=` returns the visits in that range. `GET /api/agency/messages` returns the messages, newest first, with the status stored by the messages feature.

Every agency endpoint returns `401 AUTHENTICATION_REQUIRED` without a signed-in user, depending on the sign-in decision in the [data model](data-model-and-api-contract.md#open-questions).

### Vonage

None directly. The dashboard shows what Messages and Video produce: message statuses from the messages feature and the "Join visit" link from the video feature.

### Client

- Pages under `/agency` in `routes.tsx`, composed from an `agency-dashboard` feature with its `api.ts`, types and components, following the folder rules in `client/AGENTS.md`
- The layout and D1 are built first, in issue #16, and D2 to D5 follow in the next weeks
