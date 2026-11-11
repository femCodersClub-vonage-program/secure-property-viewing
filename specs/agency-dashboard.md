# Agency dashboard

- **Status:** Approved
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

Sign-in:

- [ ] Agents sign in with the email and password of a preloaded user. Every other agency page sends a signed-out visitor to the sign-in page
- [ ] "Sign out" ends the session

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

- [ ] It shows the owner information, the property information and when the request was received and reviewed
- [ ] "Approve and publish" turns the request into an active property in the catalog, using the title, description and neighborhood from the request and a generic image
- [ ] "Reject" asks for a reason before rejecting
- [ ] Only pending requests can be approved or rejected, and the buttons say so when they are not available
- [ ] In the MVP, both roles (`ADMIN` and `AGENT`) can approve and reject

Visits calendar (D4):

- [ ] It shows the visits of the week on desktop and as a list on mobile, with the option to move to the previous and next weeks
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
- Sign-up and password reset: the users are preloaded with the sample data
- Sending messages by hand from the dashboard

## Technical plan

### Data

No new tables: `listing_request`, `property`, `visit` and `message` from the [data model](data-model-and-api-contract.md). Approving a request creates a `property` with `listing_request_id` set and status `ACTIVE`, in the same transaction.

### API

`POST /api/agency/session` receives `{ "email": "...", "password": "..." }` and returns `200` with `{ "name": "Marta", "role": "AGENT" }`, or `401 INVALID_CREDENTIALS`. `GET /api/agency/session` returns the same user, and `DELETE /api/agency/session` signs out and returns `204`.

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

`GET /api/agency/listing-requests?status=PENDING`, with an optional status of `PENDING`, `APPROVED` or `REJECTED`:

```json
[
  {
    "id": 18,
    "ownerName": "Ana Torres",
    "title": "Apartment in Gràcia",
    "operation": "RENT",
    "priceEuros": 1200,
    "createdAt": "2026-11-10T11:00:00+01:00",
    "status": "PENDING"
  }
]
```

`GET /api/agency/listing-requests/{id}`, where `floor`, `reviewedAt` and `rejectionReason` can be `null`:

```json
{
  "id": 18,
  "status": "REJECTED",
  "ownerName": "Ana Torres",
  "ownerPhone": "+34600000000",
  "title": "Apartment in Gràcia",
  "description": "...",
  "propertyType": "APARTMENT",
  "operation": "RENT",
  "area": "Gràcia",
  "address": "...",
  "priceEuros": 1200,
  "bedrooms": 3,
  "sizeM2": 85,
  "floor": 2,
  "createdAt": "2026-11-10T11:00:00+01:00",
  "reviewedAt": "2026-11-11T09:30:00+01:00",
  "rejectionReason": "..."
}
```

`POST /api/agency/listing-requests/{id}/approve` returns `200` with `{ "propertyId": 13 }`. `POST /api/agency/listing-requests/{id}/reject` receives `{ "reason": "..." }` and returns `200` with `{ "id": 18, "status": "REJECTED" }`. Both return `409 LISTING_REQUEST_ALREADY_REVIEWED` if the request was already approved or rejected.

`GET /api/agency/visits?from=&to=`:

```json
[
  {
    "visitId": 31,
    "startsAt": "2026-11-10T11:00:00+01:00",
    "endsAt": "2026-11-10T11:30:00+01:00",
    "visitorName": "...",
    "propertyTitle": "Apartment in Gràcia",
    "status": "CONFIRMED"
  }
]
```

`GET /api/agency/messages`, newest first, with the status stored by the messages feature. Each message has either `visitId` or `listingRequestId`, and the other one is `null`:

```json
[
  {
    "id": 7,
    "type": "CONFIRMATION",
    "channel": "SMS",
    "recipientName": "...",
    "visitId": 31,
    "listingRequestId": null,
    "scheduledAt": "2026-11-10T10:00:00+01:00",
    "updatedAt": "2026-11-10T10:00:05+01:00",
    "status": "DELIVERED"
  }
]
```

Every agency endpoint except `POST /api/agency/session` returns `401 AUTHENTICATION_REQUIRED` without a signed-in user.

### Security

The agency signs in with a server session managed by Spring Security, as decided in [ADR 0004](../docs/adr/0004-agency-sign-in.md):

- The session cookie is `HttpOnly` and `SameSite=Lax`, and `Secure` on Railway. On Railway, the client proxies `/api` to the server, so the browser sees one origin, as with the Vite proxy locally
- Every `POST`, `PUT`, `PATCH` and `DELETE` under `/api`, including signing in and out, sends the `X-XSRF-TOKEN` header with the value of the `XSRF-TOKEN` cookie, except the Vonage webhooks under `/api/webhooks`. Without a valid token, the server returns `403 CSRF_TOKEN_INVALID`
- A wrong password and an unknown email return the same `401 INVALID_CREDENTIALS`
- Passwords are checked against the BCrypt hash in `agency_user`, and neither the email nor the password is ever written to the logs

### Vonage

None directly. The dashboard shows what Messages and Video produce: message statuses from the messages feature and the "Join visit" link from the video feature.

### Client

- Pages under `/agency` in `routes.tsx`, composed from an `agency-dashboard` feature with its `api.ts`, types and components, following the folder rules in `client/AGENTS.md`
- The dashboard components are built in issue #27. The layout and D1 are built first, in issue #16, and D2 to D5 follow in the next weeks
- The shared API client uses relative `/api` paths in every environment and sends the `X-XSRF-TOKEN` header with every `POST`, `PUT`, `PATCH` and `DELETE`, as decided in [ADR 0004](../docs/adr/0004-agency-sign-in.md). On the first load and after signing in or out, it makes a `GET` before the next of those requests, because the server clears the `XSRF-TOKEN` cookie on sign-in and sign-out and issues a new one with the next response
