# Visit booking

- **Status:** Approved
- **Issue:** [#60](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/60)
- **Journey:** journey A steps 4 and 6 in [`docs/user-journeys.md`](../docs/user-journeys.md). Step 5, phone verification, has [its own spec](phone-verification.md)

## Problem

A visitor who likes a property picks a date and time for a video visit, confirms access to her phone and gets the visit confirmed. Booking is what connects the catalog, phone verification and the video visit: it guarantees that two people never get the same slot and that only someone with a verified phone can book.

## User stories

- As a visitor, I want to see the free times for a property, so that I can pick one that suits me
- As a visitor, I want to confirm my visit with my name and a verified phone, without creating an account
- As a visitor, I want to see the full address and the time once my visit is confirmed, so that I know what I booked
- As the agency, I want each slot booked by one person only, and every visit tied to a verified phone, so that I don't get double bookings or anonymous visits

## Acceptance criteria

Calendar (A4):

- [ ] It shows the free 30-minute slots of the property within the next 14 days, from `GET /api/properties/{id}/slots`, in the `Europe/Madrid` time zone
- [ ] Slots that have started, slots already booked and slots beyond 14 days are not shown
- [ ] A property that does not exist or is not active shows a not found page with a way back to the catalog
- [ ] The visitor picks a day, then a time, and enters her name. "Continue" stays disabled until both are done, with a sentence next to it that says what is missing

Booking:

- [ ] Once her phone is verified (A5), the booking is sent with the chosen slot and her name, and the visit is created as `CONFIRMED` and its slot becomes `BOOKED`
- [ ] Two visitors who book the same slot at the same moment never both succeed: the second one is told to pick another time
- [ ] A visitor who loses her slot to someone else picks another time and books it directly, without a new SMS, while her verification is still valid
- [ ] A booking is rejected if its phone verification is not from the same browser, is not `VERIFIED`, is for another purpose, belongs to another phone, was verified more than 30 minutes ago or has already been used
- [ ] After a successful booking, the visit id is saved in the browser's session

Confirmation (A6):

- [ ] It shows the property title and neighborhood, the full address, the day and the time
- [ ] It says that an SMS confirmation is on its way, once the [messages](messages.md) feature sends it

All screens:

- [ ] They use only design system components and tokens
- [ ] They work with the keyboard alone, at 320 px wide and at 200% zoom

## Out of scope

- Agencies creating, moving or deleting slots: in the MVP, slots come from the demo data in [#35](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/35)
- Canceling or changing a visit
- Asking for an email or any data other than the name and the phone
- Holding a slot while the visitor verifies her phone
- "Add to calendar" on the confirmation screen, although the screen map shows it
- The confirmation SMS, the visitor's room link and the link she shares with her guests, which belong to the [messages](messages.md) and [video visit](video-visit.md) specs

## Decisions

Agreed on 2026-11-15 in [#60](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/60):

- **Slots come from the demo data.** They last 30 minutes, as the screen map shows, and the agency does not edit them in the MVP. The endpoint shows only the next 14 days, so the calendar stays short and readable
- **Name and phone only.** The name is asked on A4, next to the chosen time, so the verification screen (A5), which journey B shares, stays as its spec describes. The phone is the one the visitor verified, and the server checks it by comparing hashes, as the [phone verification spec](phone-verification.md#technical-plan) describes. The name has at most 100 characters
- **No slot is held during verification.** Holding one would need a timeout and a cleanup job. Instead, the slot is taken only when the booking is saved. If someone else gets it first, the visitor gets `409 SLOT_UNAVAILABLE`, and her verification is still valid, because a rejected booking never uses it
- **The database has the last word on double bookings.** The server books a slot only if it is still `AVAILABLE`, and the `UNIQUE` constraint on `visit_slot_id` in `visit` rejects a second visit for the same slot even when two requests arrive at the same moment
- **A slot that has started, or that belongs to a property that is no longer active, answers `409`, not `404`.** The slot exists, but it can no longer be booked, and the client handles it like a slot someone else took: it asks for another time
- **Booking checks that the verification is less than 30 minutes old.** It measures from the moment the phone was verified. It's long enough to pick another time after a `409`, and short enough that an old verification can't be reused later. Booking applies this rule itself, so it doesn't change the shared verification rules that the owner listing also uses
- **One error code for every verification rule.** `422 PHONE_VERIFICATION_INVALID`, the same code as the owner listing spec, because the client does the same in every case: it sends the visitor back to verify her phone
- **The session only bridges the moment right after booking.** The visit id is saved in the session so A6 can ask the video visit feature for the visitor's own room link and the link she shares with her guests. Entering the room later uses that link, not the session, so it still works the next day, in another browser and after a redeploy, as the [video visit spec](video-visit.md) describes
- **Known limit:** a canceled visit keeps its slot, because `visit_slot_id` is unique in `visit`. It doesn't affect the MVP, which has no cancellation

## Technical plan

### Data

No new tables or columns. The `visit_slot` and `visit` tables from the [data model](data-model-and-api-contract.md) already cover booking:

- `visit_slot`: `property_id`, `starts_at`, `ends_at` and `status` (`AVAILABLE`, `BOOKED`)
- `visit`: `property_id`, `visit_slot_id` (unique), `phone_verification_id` (unique), `visitor_name`, `visitor_phone` in E.164, `status` and `created_at`

The visitor's phone is personal data: it is stored only in `visit`, used only to contact her, and never written to logs.

### API

`GET /api/properties/{id}/slots?from=2026-11-23&to=2026-11-27`

`from` and `to` are optional dates in `YYYY-MM-DD` format, in `Europe/Madrid`, and both days are included. Without them, the range goes from today to 14 days ahead. A `from` in the past starts today, and a `to` beyond 14 days stops there.

Response `200`, ordered by `startsAt`:

```json
[
  { "id": 301, "startsAt": "2026-11-23T11:00:00+01:00", "endsAt": "2026-11-23T11:30:00+01:00" },
  { "id": 302, "startsAt": "2026-11-23T11:30:00+01:00", "endsAt": "2026-11-23T12:00:00+01:00" }
]
```

Only slots that are `AVAILABLE` and start after now are returned. An empty list is a valid answer.

`POST /api/visits`

```json
{
  "slotId": 301,
  "visitorName": "Laura Gómez",
  "phone": "+34600000000",
  "phoneVerificationId": 42
}
```

Response `201`:

```json
{
  "visitId": 18,
  "startsAt": "2026-11-23T11:00:00+01:00",
  "endsAt": "2026-11-23T11:30:00+01:00",
  "visitorName": "Laura Gómez",
  "property": { "title": "Bright apartment in Gràcia", "area": "Gràcia", "address": "Fictional demo address 01, Barcelona" }
}
```

In one transaction, the server:

1. Checks the phone verification: saved in this browser's session, `VERIFIED` less than 30 minutes ago, with the `VISIT` purpose, for the same phone, and not used before. Phone verification exposes its own rules as a public method of its service, so booking never reads its tables directly, and booking adds the 30-minute check on top
2. Marks the slot as `BOOKED` only if it belongs to an active property, is still `AVAILABLE` and starts after now. If no row changes, the answer is `409 SLOT_UNAVAILABLE`
3. Saves the visit as `CONFIRMED`. If the database rejects it because of either `UNIQUE` constraint, the server maps the slot one to `409 SLOT_UNAVAILABLE` and the verification one to `422 PHONE_VERIFICATION_INVALID`, never to a `500`
4. Saves the visit's messages through the messages feature, as the [messages spec](messages.md) describes, so they are sent after the transaction and a failure in Vonage never undoes the booking. Until the messages feature is merged, this step does nothing, and A6 doesn't mention the SMS

After the commit, the controller adds the visit id to the set of visit ids in the HTTP session. A rolled-back booking never reaches the session.

Errors, following the [error format](data-model-and-api-contract.md#errors):

| Status | `code` | When |
| :---- | :---- | :---- |
| 400 | `VALIDATION_FAILED` | A field is missing, the name is empty or longer than 100 characters, the phone is not E.164, a date is not `YYYY-MM-DD`, or `from` is after `to` |
| 404 | `NOT_FOUND` | The property of `GET /slots` does not exist or is not active, or the slot of `POST /visits` does not exist |
| 409 | `SLOT_UNAVAILABLE` | The slot has just been booked, has started or belongs to a property that is no longer active |
| 422 | `PHONE_VERIFICATION_INVALID` | The verification breaks one of the rules in step 1 |

Both endpoints are public, with no agency sign-in, and are documented for springdoc as `server/AGENTS.md` asks. `POST /api/visits` needs the CSRF token, like every other `POST`.

### Vonage

None directly. Phone verification calls Verify, and the confirmation SMS goes through Messages, each in its own spec.

### Client

- A4 and A6 as pages in `src/pages/`, registered in `routes.tsx`, with A4 at `/properties/:id/visit`, where "Request a video visit" on the property details leads. They use a `visit-booking` feature that holds its `api.ts`, types and components, following `client/AGENTS.md`
- A4 shows the property summary at the top, the days of the next 14 days that have free slots, the free times of the selected day and the name field. The design system has no calendar component, so the days and times are `Button`s with `aria-pressed` inside the feature, with an accessible name that includes the day and the time. No date picker library is added
- A4 keeps the chosen slot and the name while the visitor goes through A5. When A5 ends with `VERIFIED`, the booking flow sends `POST /api/visits`
- A `409` takes the visitor back to A4 with a message that says the time has just been taken. When she picks another time, the booking is sent again with the same verification, without going through A5. A `422` takes her back to A5
- A6 shows the confirmation from the `201` response, plus the visitor's room link and the "Get a link to share" button from the [video visit spec](video-visit.md)
- A6 is a page at `/visits/:id/confirmation`. The calendar passes the `201` visit to it through the router's history state, so the confirmation survives a reload. The room links never go in that state: the history only records that the visitor link was created, so a reload offers "Get a new link" instead of replacing the one the visitor saved
- Opened with no visit in the history, such as from a copied address, A6 says the confirmation is no longer available and links to the catalog
- Loading, empty ("no free times in the next 14 days") and error states use the API client and the design system
