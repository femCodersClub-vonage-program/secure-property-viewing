# Phone verification

- **Status:** In review
- **Issue:** #12
- **Journey:** journey A step 5 and journey B step 4 in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

Rental scams rely on anonymity. Before Peephole accepts a visit or a listing request, the person proves that the phone number is really theirs with a one-time code sent by SMS. It is the core of the anti-scam promise, and the same flow serves visitors and owners. Silent Authentication will later become the first step of this same flow, with the SMS as the fallback.

## User stories

- As a visitor, I want to verify my phone number quickly, so that I can confirm my visit without creating an account
- As an owner, I want to verify my phone number, so that the agency knows the listing request comes from a real person
- As the agency, I want every visit and listing request to come from a verified phone, so that I can trust who I am talking to

## Acceptance criteria

- [ ] A person enters a phone number and receives a code by SMS
- [ ] Entering the right code marks the verification as `VERIFIED`, and the visit or listing request can continue
- [ ] Entering a wrong code shows a message that says so and lets the person try again
- [ ] After the maximum number of wrong codes, the verification becomes `FAILED` and the person can start a new one
- [ ] An expired verification becomes `EXPIRED`, with a message that offers to send a new code
- [ ] The person can ask for a new code after 30 seconds, as the screen map shows
- [ ] A visit or a listing request is rejected if its verification is not `VERIFIED` or has already been used
- [ ] The code is never stored, and phone numbers and codes never appear in logs
- [ ] The server reaches Vonage only through an interface in `vonage/`, and the tests use a test double, so they never send real SMS or use credits
- [ ] The screen meets the accessibility rules: labeled fields, error messages that say how to fix the problem, and full keyboard use

## Out of scope

- Silent Authentication: planned for week 4, as its own spec and feature
- Voice, WhatsApp or email as channels
- Remembering a verified phone between visits

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

`POST /api/visits` and `POST /api/listing-requests` receive the `phoneVerificationId` and check that it is `VERIFIED`, matches the purpose, belongs to the same phone number (by comparing hashes) and has not been used before.

### Vonage

The Verify API, called from the server only:

- **Start:** a request with the brand `Peephole`, a workflow with one `sms` step and a code of 6 digits, as the screen map shows. Verify returns a `request_id`, which we keep as `vonage_request_id`
- **Check:** the code is sent to Verify with that `request_id`, and Verify answers whether it matches
- The code length (4 to 10 digits) and the timeout of each step (up to 900 seconds) are configurable in Verify, according to the [Verify workflow guide](https://developer.vonage.com/en/verify/concepts/workflow)

In code, the feature talks to a `PhoneVerifier` interface in `vonage/`. Its implementation uses the Java Server SDK, which is added to `pom.xml` with this feature, with its exact version recorded in [ADR 0001](../docs/adr/0001-tech-stack.md). Tests use a test double of `PhoneVerifier`.

Credentials will come from the Verify group of variables in `server/.env`, documented in `docs/setup.md` and `docs/setup.es.md` when this feature adds them.

### Adding Silent Authentication later

Silent Authentication is planned for week 4 and changes little of this design:

- **Server:** the Verify workflow gets `silent_auth` as its first step and keeps `sms` as the fallback. Verify then returns a `check_url` along with the `request_id`, and our start endpoint passes it to the client
- **Client:** the browser opens the `check_url` over mobile data, shows a "verifying with your carrier" state and, if Verify falls back to SMS, moves to the code screen described here
- **Data:** a `channel` field in `phone_verification` records which step verified the phone
- **Tests:** Vonage test numbers make it possible to try it without a real mobile network

The details belong in their own spec, written in week 3.

### Client

- Verification screen for journey A (A5) and journey B (B4), built with the form field of the design system
- Six-digit code entry that works with the keyboard, pasting and screen readers
- The resend link is disabled with a visible countdown until `resendAvailableAt`
- Loading, error and success states, using the API client

## Open questions

- **Maximum wrong codes per verification.** Proposal: 5, enforced by our server whatever Verify allows. We still need to check in the Vonage Documentation MCP Server what Verify does after several wrong codes
- **Expiry time.** Proposal: 5 minutes. To confirm: how it relates to the step timeout in Verify
- **Resend.** Whether a new code starts a new Verify request or moves the current one forward. We will look at the options in the Vonage Documentation MCP Server
- **Limit per phone number.** Proposal: at most 3 verifications per phone number per hour, to avoid abuse and wasted credits
