# Silent Authentication

- **Status:** Draft
- **Issue:** [#66](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/66)
- **Journey:** journey A step 5 and journey B step 4 in [`docs/user-journeys.md`](../docs/user-journeys.md), the same steps as [phone verification](phone-verification.md)

## Problem

Phone verification by SMS asks the person to type a code, and a code can be intercepted or read out to someone who asks for it. With Silent Authentication, Peephole asks the mobile operator, through the Vonage Verify API, whether the SIM of the number is in the device, so there is nothing to type and no code to give away. The SMS code from the [phone verification spec](phone-verification.md) stays as the fallback whenever the operator, the network or the device cannot do the check. For the demo on December 4, it runs against Vonage's Virtual Operator, which answers like a mobile operator for `+990` numbers.

## User stories

- As a visitor on my phone, I want my number checked without typing a code, so that confirming my visit takes a few seconds
- As a visitor on a computer or on Wi-Fi, I want to get the SMS code as before, so that I can always verify my number
- As the agency, I want a verification that nobody can talk the person into giving away, so that a verified number is harder to fake

## Acceptance criteria

- [ ] On a phone's browser, a new verification tries Silent Authentication first: the browser opens Vonage's check URL and comes back to Peephole with the result, with nothing to type
- [ ] A completed silent check marks the verification `VERIFIED`, as a right SMS code does, and the visit or listing request can continue
- [ ] When the silent check fails, is rejected or takes too long, the person gets the SMS code screen of the phone verification spec without starting over
- [ ] On a computer's browser, the verification goes straight to the SMS code
- [ ] The limits, the expiry, the binding to the browser and the single use from the phone verification spec still apply
- [ ] The status webhook from Vonage is only accepted with a valid signature, and neither phone numbers nor codes appear in logs
- [ ] With the Virtual Operator, a `+990` number ending in an even digit is verified, one ending in an odd digit is rejected, and one ending in `99` fails, and both of the last two fall back to the SMS step
- [ ] The screen says in one sentence that Peephole is checking the number with the mobile operator
- [ ] The tests use a test double of `PhoneVerifier`, so they never call Vonage

## Out of scope

- Silent Authentication Advanced, which works over Wi-Fi with a digital wallet and is in alpha
- The QR code flow that lets a computer's browser use a phone for the check
- Production access through the Network Registry, which needs a business registration
- Voice, WhatsApp or email as channels

## Decisions

- **One Vonage application.** As found in [#66](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/66), the application with Network Registry in Test access also sends real SMS, so the silent check and its SMS fallback use the same application
- **Testing with the Virtual Operator.** Numbers starting with `+990` go to the Virtual Operator with no allowlist, and the last digits decide the result. Up to 5 real numbers can be allowlisted in the Playground for a check with a real phone on mobile data

## Open questions

- **Which application sends an SMS-only verification.** Proposal: when Silent Authentication is on, every verification uses the Silent Authentication application, so the server keeps a single Verify client, and the Verify group from Candé's application stays only until the checkpoint decision
- **Who chooses between the silent check and SMS.** Proposal: the client sends `silentAuth: true` only from a phone's browser, and the server builds the workflow `silent_auth`, then `sms`. Otherwise the workflow is `sms` only, as today
- **How the client learns that the silent check failed.** To check in the Vonage Documentation MCP Server: what the `redirect_url` receives when the check fails or is rejected. Proposal: the client also gives up after a few seconds without an answer, and the server moves the request to the SMS step with Verify's next workflow endpoint instead of waiting for Verify's own timeout
- **Where the silent code is checked.** Vonage's example code is `si9sfG`, so it does not fit the 6-digit rule of `POST /api/phone-verifications/{id}/check`, and wrong SMS codes have their own limit. Proposal: a separate endpoint, `POST /api/phone-verifications/{id}/silent-check`
- **What the status webhook is for.** The redirect already brings the code back, so the webhook mainly records a failure when the browser never comes back. To check: how to verify the signature of a Verify webhook with the Java Server SDK, and whether it uses the signature secret of the account that owns the application
- **The Java Server SDK.** To check in the 9.15.1 already in `pom.xml`: whether `SilentAuthWorkflow` accepts a `redirect_url`, and how the response exposes the `check_url`
- **Recording the channel.** Proposal: a `verified_channel` column in `phone_verification`, `SMS` or `SILENT_AUTH`, so the agency and the demo can tell them apart

## Technical plan

### Data

If the last open question is accepted, a Flyway migration adds `verified_channel` to `phone_verification`, empty until the verification is `VERIFIED`. Nothing else changes in the [data model](data-model-and-api-contract.md).

### API

`POST /api/phone-verifications` accepts an optional `silentAuth` field:

```json
{ "phone": "+990123400", "purpose": "VISIT", "silentAuth": true }
```

When the silent check is started, the response adds the `checkUrl` the browser opens:

```json
{
  "id": 42,
  "status": "PENDING",
  "resendAvailableAt": "2026-11-10T11:00:32+01:00",
  "checkUrl": "https://api.nexmo.com/v2/verify/c11236f4-00bf-4b89-84ba-88b25df97315/silent-auth/redirect"
}
```

`POST /api/phone-verifications/{id}/silent-check` receives the code the redirect brings back and answers like the existing check:

```json
{ "code": "si9sfG" }
```

`POST /api/webhooks/verify` receives Vonage's event and summary callbacks. It is under `/api/webhooks/**`, so it needs no CSRF token and is checked with the signed JWT instead, as the [data model spec](data-model-and-api-contract.md#endpoints) describes for every webhook.

The errors and limits are the ones in the phone verification spec.

### Vonage

The Verify API, called from the server only, with the Silent Authentication application:

- **Start:** the workflow has a `silent_auth` step with a `redirect_url` that points to the client, and an `sms` step to the same number. Verify answers with a `request_id` and a `check_url`
- **Check:** the browser follows the `check_url` over the mobile network, and the last redirect brings it back to the client with `request_id` and `code` in the URL fragment. The client sends the code to the server, which checks it with Verify as it checks an SMS code
- **Fallback:** if the silent step fails, Verify moves to the `sms` step, and the screen shows the SMS code entry
- **Status webhook:** the application's Verify event status callback points to `/api/webhooks/verify` on the server's public domain. Webhooks keep calling the server directly, not through the client's proxy

The credentials come from a new group of variables, `VONAGE_SILENT_AUTH_APPLICATION_ID` and `VONAGE_SILENT_AUTH_PRIVATE_KEY`, plus the signature secret and the client's address for the `redirect_url` if the open questions confirm them. They are documented in `docs/setup.md` and `docs/setup.es.md`. In code, everything goes through the `PhoneVerifier` interface in `vonage/`, and tests use its test double.

### Client

- The verification screen from [#55](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/55) sends `silentAuth: true` from a phone's browser and, when the response has a `checkUrl`, shows a "checking with your mobile operator" state and opens it
- A route that the `redirect_url` points to reads `request_id` and `code` from the URL fragment, sends the code and continues the flow. The verification id and the purpose are kept in `sessionStorage` before leaving the page, because the page reloads
- If the silent check fails or takes too long, the screen moves to the SMS code entry, with its countdown
