# Vonage integration

How Peephole uses each Vonage API, and the Vonage tools we rely on during development.

## Vonage APIs

### Verify API

Phone verification for visitors and owners using a one-time passcode (OTP) sent by SMS. It is built in `server/` and decided in [`specs/phone-verification.md`](../specs/phone-verification.md):

- Each request uses the brand `Peephole`, one `sms` step, a 6-digit code and a `channel_timeout` of 300 seconds
- A new code cancels the previous request first, which Verify allows from 30 seconds after the start
- A `410` on a check means Verify has ended the request: the server marks it `EXPIRED` when the 5 minutes are up and `FAILED` otherwise
- The Verify application needs no capability, so locally each person uses her own. With `SILENT_AUTH_ENABLED=true`, everyone uses Mayleth's Silent Authentication application instead, for every verification
- The server reaches Verify only through the `PhoneVerifier` interface in `vonage/`, and the tests use a test double

Silent Authentication, with the SMS code as the fallback, is specified in [`specs/silent-authentication.md`](../specs/silent-authentication.md). It is tested with Vonage's Virtual Operator, which answers for `+990` numbers. The Virtual Operator only accepts `silent_auth` as the single step, so `+990` numbers get no SMS fallback. Live checks, such as the one for the demo, need mobile data, a supported operator, such as Orange, Telefónica or Vodafone in Spain, and either a registration in the Network Registry or one of up to 5 numbers allowlisted in the Playground.

In `server/`, for Silent Authentication:

- **Start:** a workflow with a `silent_auth` step, with the `redirect_url`, followed by an `sms` step to the same number. For a `+990` number, only the `silent_auth` step. Without a `check_url` in the answer, Verify has already moved on to the SMS by itself. A `412` means the operator has not accepted Peephole's profile, and the server starts an SMS-only verification instead
- **Moving on to SMS:** the next workflow call, `nextWorkflow` in the SDK. A `409` means it is too early, and the server tries again up to 3 times, 1 second apart. A `404` or `410` means Verify has already ended the request, so the verification is marked `EXPIRED`. The documentation says nothing about other answers, so they become a `500`
- **Checking the silent code:** the same check call as an SMS code, with a single attempt
- **Status webhook:** `POST /api/webhooks/verify/status`, with a JWT signed with the signature secret of the Vonage account that owns the application. The server checks the signature with `Jwt.verifySignature` and, when the token carries a `payload_hash`, that the body matches it. It reads the body with Jackson, not with the SDK's `VerificationCallback`, which has no value for `blocked`, `cancelled` or `rejected`
- `VonagePhoneVerifier` and `VerifyWebhookReader` in `vonage/` are the only classes that talk to Verify or read its webhook, and the tests use a test double of `PhoneVerifier`

In `client/`, for Silent Authentication:

- The screen asks for the silent check from a phone's browser, told by `navigator.userAgentData.mobile` or the `(pointer: coarse)` media query, and for a `+990` number from any browser
- Before leaving, the page saves its form in `sessionStorage` under `peephole.silent-check`, never with the SMS code. It opens the `checkUrl` in the same tab, and only if it starts with `https://`
- The operator sends the person back to `/verification/return`, the value of `SILENT_AUTH_REDIRECT_URL`, with `request_id` and `code`, or `error_description`, in the URL fragment. That route sends them on to the page they left, which reads the fragment and removes it from the address bar with `replace`, so the single-use code is never sent twice
- Coming back without a result, with the back button or from the back/forward cache, asks the server for the SMS step

### Video API

Every video visit uses one routed session, because the visitor can share a link with as many guests as she wants, who join her and the agent. With Adaptive Media Routing, a routed session still behaves like a direct one when only two people are in the call. The details are in the [video visit spec](../specs/video-visit.md). In `server/`:

- The session is created the first time someone enters the room, under a lock on the visit row, so everyone gets the same one
- Tokens are `PUBLISHER` tokens generated on the server without calling Vonage. Their only `data` is the role, such as `role=GUEST`, and they expire when the room closes
- If Vonage fails or times out while creating the session, the server answers `500 INTERNAL_ERROR`
- Locally, everyone uses Viviana's application, unlike Verify
- The server reaches Video only through the `VideoProvider` interface in `vonage/`, and the tests use a test double

In `client/`:

- Only `features/video-visit/videoClient.ts` imports `@vonage/client-sdk-video`, and the tests mock that file. It joins with `initSession`, `connect` and the token, then publishes with `initPublisher`
- The SDK is about 3 MB, so it is loaded with a dynamic `import()` when someone enters the room, not with the rest of the app
- Each video is labeled from the role in its `stream.connection.data`, and `showControls: false` hides Vonage's own buttons and names, so the room uses its own accessible ones
- The status line follows `accessDenied` on the publisher and the session's `sessionReconnecting`, `sessionReconnected` and `sessionDisconnected` events

Planned for later: the video call between the owner and the agency (journey B), and signing or ratification with the property manager and all parties.

#### A working reference: OffLoad

[OffLoad](https://github.com/ctrl-Ella/OffLoad) is a public project that Irina's team built for the Vonage challenge at HackBarna 2026. It ran a multi-party video room with `@vonage/client-sdk-video` 2.35.2, and a person who received a link joined the same call from outside, with no account. That is what the video visit needs, so it is the first place to look before writing video code:

| What | Where in OffLoad | How Peephole differs |
| :---- | :---- | :---- |
| Joining a room from React: loading the SDK, `initSession`, `connect`, publishing and subscribing, and cleaning up | `src/components/useRoom.ts`, `Room.tsx` and `GuestRoom.tsx` | The same approach. The SDK touches `window` when it loads, which is why OffLoad imports it with a dynamic `import()` |
| Entering with a link and no account, where the token is the credential | `src/app/api/room/guest/[token]/route.ts` | Peephole stores only a hash of the token and sends it in the request body, not in the path. See the [video visit spec](../specs/video-visit.md) |
| Creating the session and the tokens | `src/lib/video.ts` and `src/lib/room.ts` | OffLoad uses the Node SDK (`@vonage/jwt`). Peephole uses the Java Server SDK in `server/` |
| Sending the guest link | The invite by SMS in `docs/specs/0009-inviting-the-support-network-by-sms.md` | Peephole never sends links by SMS, as the [messages spec](../specs/messages.md) says. The link is copied from the confirmation screen |

OffLoad shows what worked in practice. The Vonage Documentation MCP Server is still the source for every detail, and the Peephole specs decide how it is built here.

### Messages API

Visit confirmations, reminders and request status updates, always sent from the platform's official channel, as the [messages spec](../specs/messages.md) decides. The visit confirmation by SMS (#87) is built. Reminders, request status updates and WhatsApp Business are planned for later.

In `server/`:

- **Saved with the booking.** `MessageService` saves the confirmation as `SCHEDULED` in the same transaction as the booking, so there is never a booking without its message. Booking a visit never calls Vonage
- **Sent every minute.** With `MESSAGES_SENDING_ENABLED=true`, `MessageScheduler` asks `MessageDispatcher` to send the due confirmations every 60 seconds. The dispatcher calls Vonage outside any transaction, so a slow answer never holds a database lock
- **The text.** `MessageTexts` builds it in English, with the property's title and the visit's date and time in Madrid time. It never carries a link
- **The SMS.** `VonageMessageSender` sends it with the SDK's `SmsTextRequest`, to the number in E.164 without the `+`, and with the message's ID as the `client_ref`
- **Failures.** A `429`, a `5xx` or a network error is temporary: the message stays `SCHEDULED` and is tried again for up to 10 minutes (`Message.RETRY_WINDOW`). Any other error is permanent, and the message becomes `FAILED`
- **Status webhook:** `POST /api/webhooks/messages/status`, with a JWT signed with the signature secret of the Vonage account that owns the application. As with Verify, the server checks the signature and, when the token carries a `payload_hash`, that the body matches it. `submitted` and `delivered` move the message forward, and `rejected` or `undeliverable` send it back to `SCHEDULED` while the 10 minutes last, or to `FAILED` after them. `DELIVERED` and `FAILED` are final. A status whose `client_ref` or `message_uuid` doesn't match the message is ignored
- **Inbound webhook:** `POST /api/webhooks/messages/inbound` answers `200` so Vonage stops retrying. Replies are not handled yet, and the body is never logged
- **Never logged:** the phone numbers, in the sender, the dispatcher or the webhooks
- On Railway, Messages uses Damaris's application. Locally, each person tries it with her own, so the status webhooks can reach her tunnel
- `VonageMessageSender` and `MessagesWebhookReader` in `vonage/` are the only classes that talk to Messages or read its webhooks, and the tests use a test double of `MessageSender`

The signature and `payload_hash` checks are shared by the three webhook readers in `BodyHash`, which compares the hashes with `MessageDigest.isEqual`.

### Voice API

The [post-visit call](../specs/post-visit-call.md): after a video visit, the server calls the visitor's verified phone, asks in Spanish whether anyone asked for money before signing, and waits for one key. A "yes" becomes an alert on the agency dashboard.

- **One Spanish Vonage number** in Irina's account, in its own application with the Voice capability
- **No answer URL.** The NCCO goes inside the create-call request: a `talk` action in `es-ES` and an `input` action for one DTMF digit, with its own webhook for the key
- **Voicemail never hears the question.** The call uses `machine_detection: hangup`, which hangs up before the first action
- **Signed webhooks.** Vonage signs the key and status webhooks with the account's signature secret, and the server rejects any webhook without a valid signature. It also checks that the body matches the token's `payload_hash`, and rejects a token without it
- **Off by default.** With `VOICE_CALLS_ENABLED=false`, local development and the tests need no number and place no call

## Vonage developer tools

| Tool | What we use it for | Where |
| :---- | :---- | :---- |
| **Java Server SDK** (`com.vonage:server-sdk`) | Calling Verify, Video, Messages and Voice from the server, and generating video session tokens | `server/` |
| **Video Client SDK** (`@vonage/client-sdk-video`) | Embedding the video room in the browser | `client/` |
| **Vonage CLI** | Creating and configuring the Vonage application, its keys and test numbers from the terminal, and checking that configuration, such as webhook URLs, before an end-to-end test | Project setup and manual checks |
| **Documentation MCP Server** | Querying Vonage documentation, SDKs and sample code from the AI assistant without leaving the editor, so answers are checked against the official source. It is read-only | AI assistants |
| **MCP Tooling Server** | Letting an agent perform real actions on the Vonage account, such as sending messages or checking the balance | AI assistants, with restrictions |

The Server SDK, the Video Client SDK, the Vonage CLI and the Documentation MCP Server are confirmed. The MCP Tooling Server is optional, and the team will decide whether to use it once the project is set up.

The MCP Tooling Server acts on the real account: it sends messages and consumes credits. That is why it is only used with the team's test account and with explicit confirmation of every action. The decision on whether to use it is still pending.

### Enabling the Documentation MCP Server

The server is already in the project, in [`.mcp.json`](../.mcp.json), and it needs no credentials and nothing to install. Whichever AI assistant you use, make sure it can reach the server:

- If your assistant reads `.mcp.json`, such as Claude Code, approve the server the first time it asks
- If it does not, add this address to its MCP settings, following its own documentation: `https://documentation-mcp.vonage.dev/mcp`

Then check that `vonage-documentation` appears among your assistant's MCP servers. If you cannot use it, check anything about Vonage directly in the [official documentation](https://developer.vonage.com/en/tools).

The Vonage CLI is not part of the automated tests. They use test doubles instead of real calls, so they neither consume credits nor depend on the network. The CLI includes a mock server (`vonage mock`), but it currently covers only the SMS API, not the Messages API we use.

By default, the CLI stores its configuration, including credentials, in `~/.vonage/config.json`. With `--local`, it stores it in a `.vonagerc` file in the working directory instead. `.vonagerc` and `*.key` are listed in `.gitignore`, and none of these files may ever be committed. How to install and set up the CLI is in the [Vonage CLI guide](guides/vonage-cli.md).
