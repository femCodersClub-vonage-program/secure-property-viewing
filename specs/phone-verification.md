# Phone verification

- **Status:** Approved
- **Issue:** [#12](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/12)
- **Journey:** journey A step 5 and journey B step 4 in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

Before Peephole accepts a visit or a listing request, the person confirms access to the phone number with a one-time code sent by SMS. This helps reduce anonymous requests and gives the agency a verified contact number. The same flow serves visitors and owners; it does not establish their identity or ownership of a property. Silent Authentication is proposed as a later first step, with SMS as the fallback.

## User stories

- As a visitor, I want to verify my phone number quickly, so that I can confirm my visit without creating an account
- As an owner, I want to verify my phone number, so that the agency has a verified contact number for my listing request
- As the agency, I want every visit and listing request to include a verified phone number, so that I can follow up through that contact

## Acceptance criteria

- [ ] A person enters a phone number and receives a code by SMS
- [ ] Entering the right code marks the verification as `VERIFIED`, and the visit or listing request can continue
- [ ] Entering a wrong code shows a message that says so and lets the person try again
- [ ] After 3 wrong codes, the verification becomes `FAILED` and the person can start a new one
- [ ] A verification expires 5 minutes after the code is sent. It becomes `EXPIRED`, with a message that offers to send a new code
- [ ] The person can ask for a new code after 30 seconds, as the screen map shows. The new code replaces the previous one
- [ ] A phone number can start at most 3 verifications per hour
- [ ] Only the browser that started a verification can use it, and each verification is used by one visit or listing request at most
- [ ] A visit or a listing request is rejected if its verification is not `VERIFIED` or has already been used
- [ ] The code is never stored, and phone numbers and codes never appear in logs
- [ ] The server reaches Vonage only through an interface in `vonage/`, and the tests use a test double, so they never send real SMS or use credits
- [ ] The screen meets the accessibility rules: labeled fields, error messages that say how to fix the problem, and full keyboard use

## Out of scope

- Silent Authentication: planned for week 4, as its own spec and feature
- Voice, WhatsApp or email as channels
- Remembering a verified phone between visits

## Decisions

The open questions were resolved on 2026-11-12, checked against the [Verify API reference](https://developer.vonage.com/en/api/verify.v2) through the Vonage Documentation MCP Server:

- **3 wrong codes at most.** Verify ends a request on its own after too many wrong codes and answers `410`, without saying how many in its documentation. Our server counts the attempts and stops at 3, and it also treats a `410` from Verify as `FAILED`, so both sides always agree
- **5 minutes to expire.** The workflow sets `channel_timeout` to 300 seconds. Verify's default is 180 and the maximum is 900. Our server also checks the time before calling Verify, so an expired code never costs a call
- **A new code means a new verification.** The workflow has a single `sms` step, so Verify has no next step to move to, and it rejects a second request to the same number while one is in progress (`409 concurrent`). So asking for a new code cancels the pending request in Verify, which it allows from 30 seconds after the start, marks it `EXPIRED` and starts a new one. The 30-second wait in the screen map matches that rule
- **3 verifications per phone number per hour.** It avoids abuse and wasted credits. The server counts them with the phone hash and the index that already exists on `phone_verification`
- **Bound to the browser through the session.** When a verification starts, the server saves its id in the visitor's HTTP session, the same session mechanism the agency sign-in uses. `POST /api/visits` and `POST /api/listing-requests` only accept an id saved in the session of the same browser, so knowing an id and a phone number is not enough. Each verification is used once: the `UNIQUE` constraint on `phone_verification_id` in `visit` and `listing_request` makes the database reject a second use, even when two requests arrive at the same time. It needs no new column. The accepted trade-off: the session lives in the server's memory, so a redeploy in the middle of a verification asks the person to verify again

## Technical plan

### Data

The `phone_verification` table from the [data model](data-model-and-api-contract.md): purpose, a hash of the phone number, Vonage request id, status, number of check attempts and dates. The phone number itself is stored in the visit or listing request it verifies, and the code is never stored anywhere.

The hash lets the server check two things without keeping the number in this table: that the visit or listing request uses the same phone that was verified, and how many verifications a phone number has started in the last hour. It is a keyed hash (HMAC) with a secret from the server configuration, so it cannot be reversed by trying every number.

### API

`POST /api/phone-verifications`

```json
{ "phone": "+34600000000", "purpose": "VISIT" }
```

Response `201`:

```json
{ "id": 42, "status": "PENDING", "resendAvailableAt": "2026-11-10T11:00:30+01:00" }
```

`POST /api/phone-verifications/{id}/check`

```json
{ "code": "482931" }
```

Response `200`:

```json
{ "id": 42, "status": "VERIFIED" }
```

Errors, following the [error format](data-model-and-api-contract.md#errors):

| Status | `code` | When |
| :---- | :---- | :---- |
| 400 | `VALIDATION_FAILED` | The phone is not a valid E.164 number, or the code is empty |
| 422 | `VERIFICATION_CODE_INVALID` | The code does not match |
| 422 | `VERIFICATION_EXPIRED` | The verification has expired |
| 429 | `VERIFICATION_TOO_MANY_ATTEMPTS` | The maximum number of wrong codes has been reached |
| 429 | `VERIFICATION_RESEND_TOO_SOON` | A new code is requested before 30 seconds |
| 429 | `VERIFICATION_LIMIT_REACHED` | The phone number has started 3 verifications in the last hour |

To ask for a new code, the client calls `POST /api/phone-verifications` again with the same phone. The server cancels the pending verification and answers with a new `id`.

`POST /api/visits` and `POST /api/listing-requests` receive the `phoneVerificationId` and check that it is saved in the session of the same browser, is `VERIFIED`, matches the purpose, belongs to the same phone number (by comparing hashes) and has not been used before.

### Vonage

The Verify API, called from the server only:

- **Start:** a request with the brand `Peephole`, a workflow with one `sms` step, a code of 6 digits, as the screen map shows, and a `channel_timeout` of 300 seconds. Verify returns a `request_id`, which we keep as `vonage_request_id`
- **Check:** the code is sent to Verify with that `request_id`, and Verify answers whether it matches. A `410` means the request has ended, because of too many wrong codes or because it expired
- **Cancel:** a new code cancels the pending request first, which Verify allows from 30 seconds after the start
- The code length (4 to 10 digits) and the timeout of each step (up to 900 seconds) are configurable in Verify, according to the [Verify workflow guide](https://developer.vonage.com/en/verify/concepts/workflow)

In code, the feature talks to a `PhoneVerifier` interface in `vonage/`. Its implementation uses the Java Server SDK, which is added to `pom.xml` with this feature, with its exact version recorded in [ADR 0001](../docs/adr/0001-tech-stack.md). Tests use a test double of `PhoneVerifier`.

Credentials will come from the Verify group of variables in `server/.env`, documented in `docs/setup.md` and `docs/setup.es.md` when this feature adds them.

### Adding Silent Authentication later

Silent Authentication is planned for week 4. The following integration outline is a proposal to validate through the Vonage Documentation MCP Server before its own spec is approved:

- **Server:** the Verify workflow gets `silent_auth` as its first step and keeps `sms` as the fallback. Verify then returns a `check_url` along with the `request_id`, and our start endpoint passes it to the client
- **Client:** the browser opens the `check_url` over mobile data, shows a "verifying with your carrier" state and, if Verify falls back to SMS, moves to the code screen described here
- **Data:** a `channel` field in `phone_verification` records which step verified the phone
- **Tests:** Vonage test numbers make it possible to try it without a real mobile network

The details belong in their own spec, written in week 3.

### Client

- Verification screen for journey A (A5) and journey B (B4), built with the form field of the design system
- Six-digit code entry with a label, keyboard support and paste support
- The resend button is disabled with a visible countdown until `resendAvailableAt`
- Loading, error and success states, using the API client
