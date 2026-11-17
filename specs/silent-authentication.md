# Silent Authentication

- **Status:** In review
- **Issue:** [#66](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/66)
- **Journey:** journey A step 5 and journey B step 4 in [`docs/user-journeys.md`](../docs/user-journeys.md), the same steps as [phone verification](phone-verification.md)

## Problem

Phone verification by SMS asks the person to type a code, and a code can be intercepted or read out to someone who asks for it. With Silent Authentication, Peephole asks the mobile operator, through the Vonage Verify API, whether the SIM of the number is in the device. When that check succeeds there is nothing to type and no code to give away. The SMS code from the [phone verification spec](phone-verification.md) stays as the fallback whenever the operator, the network or the device cannot do the check. For the demo on December 4, it runs against Vonage's Virtual Operator, which answers like a mobile operator for `+990` numbers.

## User stories

- As a visitor on my phone, I want my number checked without typing a code, so that confirming my visit takes a few seconds
- As a visitor on a computer or on Wi-Fi, I want to get the SMS code as before, so that I can always verify my number
- As the agency, I want verifications that nobody can talk the person into giving away, so that a verified number is harder to fake

## Acceptance criteria

- [ ] When the silent check is tried, the browser opens Vonage's check URL in the same tab and comes back to Peephole with the result, with nothing to type
- [ ] A completed silent check marks the verification `VERIFIED`, as a correct SMS code does, and the visit or listing request continues with everything the person had already filled in
- [ ] The silent check is tried from a phone's browser, and for a `+990` number from any browser while the Virtual Operator is allowed. Otherwise the verification goes straight to the SMS code
- [ ] A `+990` number is rejected with `400 VALIDATION_FAILED` on `phone` while the Virtual Operator is not allowed
- [ ] When the operator's network is not supported, when the check fails or is rejected, or when no answer comes back within 15 seconds, the person gets the SMS code screen of the phone verification spec without starting over
- [ ] With the Virtual Operator, a `+990` number ending in `99` fails, any other ending in an odd digit is rejected, and one ending in an even digit is verified. Both failures fall back to the SMS step
- [ ] The limits, the binding to the browser and the single use from the phone verification spec still apply, with the changes in the decisions below
- [ ] The status webhook from Vonage is only accepted with a valid signature, and neither phone numbers nor codes appear in logs
- [ ] The "checking with your mobile operator" state is in an element with `role="status"`, and on a fallback the focus moves to the SMS code field
- [ ] The tests use a test double of `PhoneVerifier`, so they never call Vonage

## Out of scope

- Silent Authentication Advanced, in alpha, which checks the SIM with GSMA TS.43 on Android and also works over Wi-Fi
- The QR code flow that lets a computer's browser use a phone for the check
- Production access through the Network Registry, which needs a business profile
- Voice, WhatsApp or email as channels

## Decisions

Checked in the Vonage Documentation MCP Server on 2026-11-17:

- **One Vonage application for both steps.** As found in [#66](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/66), the application with Network Registry in Test access also sent a real SMS. The documentation does not say so, so this rests on that test. It does say that one application cannot carry both Playground and production traffic
- **Testing with the Virtual Operator.** Numbers starting with `+990` go to the Virtual Operator with no allowlist, and the last digits decide the result. Up to 5 real numbers can be allowlisted in the Playground for a check with a real phone on mobile data, and each one expires after 30 days or 200 requests
- **`+990` numbers only during the demo.** The Virtual Operator verifies any `+990` number ending in an even digit, so anyone could book a visit with a number that does not exist. The server only accepts them while `SILENT_AUTH_VIRTUAL_OPERATOR=true`. On Railway it is `true` only for the demo period, and the team accepts that risk during that time
- **Coming back from the check.** The workflow's `silent_auth` step has a `redirect_url` that points to the client. On success, the URL fragment brings `request_id` and `code`. On failure, it brings `error_description`, such as `Device MSISDN does not match.`
- **An unsupported network.** With Verify's default coverage check, a start to a number whose operator does not support the check answers `409` with "carrier is not supported", not a response without a check URL. The server tells it apart from the `409` of a code already on its way, which stays `VERIFICATION_IN_PROGRESS`, and starts an SMS-only verification instead. The Virtual Operator always returns a check URL
- **Moving on to SMS.** Verify moves to the SMS step at once on some errors, such as an unsupported operator, a number that does not match or an address that is not on a mobile network, and otherwise only after 60 seconds. So on any failure the server calls Verify's next workflow endpoint. If Verify answers `409` because it is too early, the server tries again up to 3 times, 1 second apart, and otherwise lets Verify move on by itself
- **The silent code.** It is 4 to 10 letters and digits, and Verify checks it only once. The server compares the `request_id` that comes back with the one it stored, and rejects the code if they differ, as Vonage recommends against man-in-the-middle attacks
- **The Java Server SDK.** The 9.15.1 already in `pom.xml` has `SilentAuthWorkflow.builder(to).redirectUrl(…)` and `VerificationResponse.getCheckUrl()`. Its `sandbox` option is retired, and a request with it gets a `422`, so it is never used
- **The status webhook.** Verify signs its callbacks with a JWT in the `Authorization` header, signed with the signature secret of the Vonage account that owns the application. Its states are `action_pending`, `completed`, `user_rejected`, `failed` and `expired`. A `user_rejected` or `failed` on the silent step only moves the verification on to SMS, as the fallback endpoint does, and never marks it `FAILED`. An `expired` marks it `EXPIRED`. The webhook covers the case where the browser never comes back
- **The phone verification rules with two steps.** A start that tries the silent check counts toward the 5-per-hour limit like any other. A new code is only offered once the SMS step has started, and it starts an SMS-only verification. `resendAvailableAt` is still 32 seconds after the start, so by the time the SMS screen appears part of the countdown has already passed

## Open questions

- **How long the SMS step lasts.** When Silent Authentication is in the workflow, Verify fixes `channel_timeout` at 60 seconds instead of the 300 the server uses today. To test with the Virtual Operator: whether the SMS step after it also gets only 60 seconds. Proposal: the expiry of a two-step verification is the one Verify applies, and a `410` on it before 3 wrong codes maps to `EXPIRED`, not `FAILED`
- **Which application sends an SMS-only verification.** Proposal: when Silent Authentication is on, every verification uses the Silent Authentication application, so the server keeps a single Verify client. Candé's Verify group keeps working until the checkpoint on November 23–24 decides whether Silent Authentication goes into the demo. If it does not, `SILENT_AUTH_ENABLED=false` keeps today's SMS-only flow
- **How the client tells a phone's browser.** Proposal: `navigator.userAgentData.mobile` when the browser has it, and the `(pointer: coarse)` media query otherwise
- **Keeping the form across the redirect.** Opening the check URL reloads the page, so the slot and name of a visit, or the owner's details of a listing request, would be lost. Proposal: before leaving, the page that hosts the verification saves its form in `sessionStorage` together with the verification id and the purpose, restores it when the person comes back, and deletes it once used
- **Where the silent code is checked.** The silent code is checked once and is not 6 digits, and wrong SMS codes have their own limit of 3. Proposal: a separate endpoint, `POST /api/phone-verifications/{id}/silent-check`, as described below
- **Recording the channel.** Proposal: a `verified_channel` column in `phone_verification`, `VARCHAR(20)` with `SMS` or `SILENT_AUTH`, empty until the verification is `VERIFIED`, so the agency and the demo can tell them apart
- **Verifying the webhook signature in Java.** The `com.vonage:jwt` library that comes with the SDK has `Jwt.verifySignature(jwt, secret)`, and the SDK has `VerificationCallback.fromJson`, which the documentation does not mention. The first build step tests both

## Technical plan

### Data

If the open question on recording the channel is accepted, a Flyway migration adds `verified_channel` to `phone_verification`. When this spec is approved, the [data model](data-model-and-api-contract.md) gets in the same pull request: that column, the `silentAuth` field and the `checkUrl` field, the `silent-check` and `sms-fallback` endpoints, the status webhook and the `VERIFICATION_SILENT_CHECK_UNAVAILABLE` error.

### API

`POST /api/phone-verifications` accepts an optional `silentAuth` field:

```json
{ "phone": "+990123400", "purpose": "VISIT", "silentAuth": true }
```

When Verify gives a check URL, the response adds it:

```json
{
  "id": 42,
  "status": "PENDING",
  "resendAvailableAt": "2026-11-10T11:00:32+01:00",
  "checkUrl": "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect"
}
```

`POST /api/phone-verifications/{id}/silent-check` receives what the redirect brings back:

```json
{ "requestId": "c11236f4-00bf-4b89-84ba-88b25df97315", "code": "si9sfG" }
```

Response `200`, as in the existing check:

```json
{ "id": 42, "status": "VERIFIED" }
```

| Status | `code` | When |
| :---- | :---- | :---- |
| 400 | `VALIDATION_FAILED` | `requestId` is missing, or `code` is not 4 to 10 letters and digits |
| 404 | `VERIFICATION_NOT_FOUND` | The verification was not started by this browser, or `requestId` is not the one stored |
| 409 | `VERIFICATION_SILENT_CHECK_UNAVAILABLE` | The verification never tried the silent check, or it has already moved on to SMS |
| 422 | `VERIFICATION_CODE_INVALID` | Verify rejects the code. The server moves the request on to SMS, and the client shows the SMS code entry |
| 422 | `VERIFICATION_EXPIRED` | The verification has expired |

A rejected silent code does not count toward the 3 wrong SMS codes.

`POST /api/phone-verifications/{id}/sms-fallback` moves the request on to the SMS step when the redirect brings an `error_description` or the 15 seconds pass. It answers `200` with the verification, and the same `404` and `409` as above.

`POST /api/webhooks/verify/status` receives Vonage's event and summary callbacks. It is under `/api/webhooks/**`, so it needs no CSRF token and is checked with the signed JWT instead, as the [data model spec](data-model-and-api-contract.md#endpoints) describes for every webhook. An invalid signature answers `401 WEBHOOK_SIGNATURE_INVALID`.

### Vonage

The Verify API, called from the server only, with the Silent Authentication application:

- **Start:** the workflow has a `silent_auth` step with the `redirect_url`, and an `sms` step to the same number, with the brand `Peephole` and a 6-digit code as today. Verify answers with a `request_id` and a `check_url`, or with a `409` when the network is not supported
- **Check:** the browser follows the `check_url` over the mobile network, and the last redirect brings it back to the client. The server checks the code with the same Verify call as an SMS code
- **Fallback:** the server calls the next workflow endpoint, and the screen shows the SMS code entry
- **Status webhook:** the application's Verify event status callback points to `/api/webhooks/verify/status` on the server's public domain. Webhooks keep calling the server directly, not through the client's proxy

The credentials come from a new group of variables: `VONAGE_SILENT_AUTH_APPLICATION_ID`, `VONAGE_SILENT_AUTH_PRIVATE_KEY` and `VONAGE_SILENT_AUTH_SIGNATURE_SECRET`, plus `SILENT_AUTH_ENABLED`, `SILENT_AUTH_VIRTUAL_OPERATOR` and `SILENT_AUTH_REDIRECT_URL`, the client page the check comes back to. They are documented in `.env.example`, `docs/setup.md` and `docs/setup.es.md` with the server build. In code, everything goes through the `PhoneVerifier` interface in `vonage/`, and tests use its test double.

### Client

- The verification screen from [#55](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/55) sends `silentAuth: true` when the silent check applies and, when the response has a `checkUrl`, saves the form as the open questions describe, shows a "checking with your mobile operator" state and opens the check URL in the same tab
- A route that the `redirect_url` points to reads the URL fragment, restores the form, and sends the code to `silent-check`, or asks for the SMS fallback on an `error_description`
- After 15 seconds without an answer, or on any failure, the screen moves to the SMS code entry with its countdown, and the focus goes to the code field
