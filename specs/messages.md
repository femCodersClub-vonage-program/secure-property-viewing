# Messages

- **Status:** Draft
- **Issue:** [#62](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/62)
- **Journey:** journey A step 6, journey B step 5 and screen 5 of the agency dashboard in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

Visitors and owners need to hear from Peephole after they leave the page: the confirmation of a visit, a reminder shortly before it and the outcome of a listing request. Every message comes from the same sender and never includes a link, so people can tell it apart from a scam. The agency sees in D5 whether each message reached the person, so it can call when one fails.

## User stories

- As a visitor, I want an SMS that confirms my visit and another one shortly before it, so that I do not miss it
- As an owner, I want an SMS when my listing request is received and when the agency decides, so that I know where it stands without calling
- As the agency, I want to see every message and whether it was delivered, so that I can contact the person when one fails

## Acceptance criteria

- [ ] Booking a visit creates its confirmation, to be sent at once, and its reminder, scheduled 1 hour before the visit starts
- [ ] A visit booked less than 1 hour before it starts gets the confirmation only
- [ ] Sending a listing request creates the "request received" message, and approving or rejecting it creates the "request approved" or "request rejected" message
- [ ] Each message is saved in the same transaction as the booking or review that triggers it, and sent afterwards, so a failure in Vonage never undoes a booking or a review
- [ ] A scheduled task sends every `SCHEDULED` message whose `scheduledAt` has passed, once a minute. Messages that were due while the server was down are sent when it starts again, within the retry window
- [ ] A reminder is not sent if its visit is no longer `CONFIRMED` or has already started
- [ ] When Vonage accepts a message, the message becomes `SUBMITTED` and keeps its `message_uuid` as `vonage_message_id`
- [ ] The status webhook moves a message to `DELIVERED` or `FAILED`, and a message never leaves those final statuses
- [ ] If Vonage cannot be reached or answers with a temporary error, the message stays `SCHEDULED` and is tried again on the next runs, up to 10 minutes after its `scheduledAt`. After that, or after a permanent error, it becomes `FAILED`
- [ ] A message that Vonage reports as `undeliverable` goes back to `SCHEDULED` and is tried again within its retry window
- [ ] Both webhooks answer `401` with the code `WEBHOOK_SIGNATURE_INVALID` and change nothing when the request has no valid Vonage signature
- [ ] Failed messages appear in D5 as described in the [agency dashboard spec](agency-dashboard.md)
- [ ] Local servers and tests never send real messages: sending is off unless `MESSAGES_SENDING_ENABLED=true`
- [ ] Phone numbers, message texts and webhook bodies never appear in logs. Logs use the message id
- [ ] The server reaches Vonage only through an interface in `vonage/`, and the tests use a test double, so they never send real SMS or use credits

## Out of scope

- WhatsApp and other channels. A first WhatsApp message to someone who has not written to us needs an approved template, so it is left for later
- Processing replies: the inbound webhook only answers `200`
- Sending or resending a message by hand from the dashboard
- A message when a visit is changed or canceled
- The link to the video room: the video spec decides whether the visitor receives it, and how
- Messages to the agency, and messages in more than one language

## Open questions

- **The texts.** Proposal, in English like the interface, short enough for one SMS segment with a usual title, and without links:
  - Visit confirmation: "Peephole: your video visit for {title} is confirmed for {day} at {time}. We will text you 1 hour before."
  - Reminder: "Peephole: your video visit for {title} starts in 1 hour, at {time}."
  - Request received: "Peephole: we have received your request for {title}. The agency will review it and text you with its decision."
  - Request approved: "Peephole: your property {title} has been approved and is now published."
  - Request rejected: "Peephole: your request for {title} has not been approved." The reason is not sent: the agency writes it for the dashboard, and the owner can ask for it
  - Times in `Europe/Madrid`. A character outside the GSM alphabet in the title, such as `ï`, turns the SMS into Unicode, with 70 characters per segment, so it may cost two
- **Five messages and three types, with no schema change.** Proposal: `CONFIRMATION` for the visit confirmation and for "request received", `REMINDER` for the reminder and `STATUS_UPDATE` for approved or rejected. A request is reviewed only once, so its `STATUS_UPDATE` means whatever its final status is
- **The sender and the demo account.** Spain requires every alphanumeric sender, such as `Peephole`, to be registered with the CNMC since September 15, 2026, and blocks messages from senders that are not registered. Only companies with a legal presence in Spain can register themselves, Vonage can register it on our behalf, and the documentation gives no time frame. A trial account can only send to its own number and up to 4 verified test numbers, adds "[FREE SMS DEMO, TEST MESSAGE]" to every SMS, which may take a message over one segment, and cannot buy virtual numbers. Proposal: the MVP demo sends only to the team's verified test numbers, and the sender is registered only if the project moves to a paid account. The sender goes in a new variable, `VONAGE_MESSAGES_FROM`
- **A reminder that will not be sent.** Proposal: if its visit is no longer `CONFIRMED` or has already started, the scheduled task deletes the row instead of marking it `FAILED`, so D5 never shows a failure that nobody needs to act on
- **No retries after `FAILED`.** Proposal: once a message is `FAILED`, the server does not try again. The agency sees it in D5 and calls the person
- **Sample data that must never be sent.** The sample data includes `SCHEDULED` messages with fictional phone numbers, and it is also loaded on Railway, where sending is on. A trial account rejects them because they are not verified test numbers, but they would turn `FAILED` in D5, and a paid account would send them to whoever owns those numbers. Proposal: their `scheduled_at` is in 2027, after the demo, and `MESSAGES_SENDING_ENABLED` is only `true` on Railway
- **`undeliverable`.** Vonage sends it when the Messages API could not reach the provider, such as during an outage, so the message never left Vonage. Proposal: the message goes back to `SCHEDULED` and is sent again within its retry window, and becomes `FAILED` after that

## Technical plan

### Data

No new tables or columns: the `message` table from the [data model](data-model-and-api-contract.md).

- The recipient is read when the message is sent: `visit.visitor_phone` or `listing_request.owner_phone`. The text is built at that moment and never stored
- `scheduled_at` is the time the message is due: the booking or review time for immediate messages, and the visit start minus 1 hour for the reminder
- `updated_at` changes with every status change

Statuses:

| When | `message.status` |
| :---- | :---- |
| Created, waiting for its time | `SCHEDULED` |
| Vonage accepted it, or sends `submitted` | `SUBMITTED` |
| Vonage sends `delivered` | `DELIVERED` |
| Vonage sends `undeliverable`, within the retry window | `SCHEDULED` again |
| Vonage sends `rejected`, a permanent error when sending, or the retry window has passed | `FAILED` |

Delivery receipts depend on the operator, and some never arrive, so a message can stay `SUBMITTED`. D5 shows it as sent, not as delivered.

### API

No new endpoints for the client. `GET /api/agency/messages` is defined in the [agency dashboard spec](agency-dashboard.md), and `recipientName` comes from `visit.visitor_name` or `listing_request.owner_full_name`.

`POST /api/webhooks/messages/status` receives the status from Vonage. The server uses `client_ref`, `message_uuid`, `status` and `timestamp`:

- It finds the message by `client_ref`, which is our message id, so it works even if the status arrives before the server has saved the `message_uuid`
- It updates the status following the table above, and ignores a status that would move a message out of `DELIVERED` or `FAILED`
- It answers `200` to every request with a valid signature, even when the message is unknown, so Vonage does not retry it. That case is logged with the `client_ref`

`POST /api/webhooks/messages/inbound` checks the signature and answers `200`. The body is ignored and never logged.

Both webhooks:

- Answer `401` with the code `WEBHOOK_SIGNATURE_INVALID` when the request has no valid signature, returned as a `ProblemDetail` by the `@RestControllerAdvice`. Vonage does not retry a `4xx`
- Answer `500` when the server cannot save what it received, such as when the database is down, so Vonage tries again. Vonage retries a webhook that answers `429` or `5xx` at growing intervals, from 5 seconds up to every 15 minutes, for up to 24 hours. The Vonage support documentation describes this for inbound messages, and it is not confirmed for status callbacks
- Need no session and no CSRF token: `SecurityConfig` already excludes `/api/webhooks/**`, as [ADR 0004](../docs/adr/0004-agency-sign-in.md) says
- Are documented for springdoc like the other endpoints

### Vonage

The Messages API, called from the server only, with the Messages group of variables: `VONAGE_MESSAGES_APPLICATION_ID`, `VONAGE_MESSAGES_PRIVATE_KEY` and `VONAGE_MESSAGES_SIGNATURE_SECRET`.

- **Send:** `POST /v1/messages` with `channel` `sms`, `message_type` `text`, `to`, `from`, `text` and `client_ref` set to our message id. Reminders also set `ttl` to 3600 seconds, so a reminder that has not arrived by the start of the visit expires and is reported as `rejected` with the error `1360`. Vonage answers with a `message_uuid`
- **Temporary and permanent errors:** a network error, a `5xx` or "throttled" (`1000`) keeps the message `SCHEDULED` for the next run. Invalid parameters, recipient or sender (`1020`, `1170`, `1420`) make it `FAILED`
- **Signed webhooks:** Vonage sends a JWT in `Authorization: Bearer`, signed with our signature secret. The Vonage documentation says Messages always signs with SHA-256, and the first end-to-end test confirms it. The server checks the signature
- **Webhook URLs:** the Messages application already points to the server on Railway, as set up in #19

In code, the feature talks to a `MessageSender` interface in `vonage/` and to a `WebhookSignatureVerifier` for the JWT. Both use the Java Server SDK, added to `pom.xml` by whichever of phone verification and messages is built first, at version 7.11.0 or later. From that version, `MessagesClient.verifySignature(jwt, secret)` checks the signature of a webhook, so `WebhookSignatureVerifier` wraps it and the feature needs no new dependency.

The scheduled task uses Spring's `@Scheduled`, which needs no new dependency, and runs in the `message` package. Its logic is a service method that receives the current time, so tests control the clock. Railway runs a single server instance. The accepted trade-off: if the server stops right after Vonage accepts a message and before it is saved as `SUBMITTED`, that message may be sent twice.

Tests use a test double of `MessageSender`, and the webhook tests sign their own JWT with a test secret.

### Client

No new screens:

- The visit confirmation (A6) and the request submitted screen (B5) say that an SMS is on its way
- D5 shows the status of each message, with the labels and badges in the [design system](../docs/design-system.md): Scheduled, Sent, Delivered and Failed
