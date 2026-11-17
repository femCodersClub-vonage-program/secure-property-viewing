# Vonage integration

How Peephole uses each Vonage API, and the Vonage tools we rely on during development.

## Vonage APIs

### Verify API

Phone verification for visitors and owners using a one-time passcode (OTP) sent by SMS. It is built in `server/` and decided in [`specs/phone-verification.md`](../specs/phone-verification.md):

- Each request uses the brand `Peephole`, one `sms` step, a 6-digit code and a `channel_timeout` of 300 seconds
- A new code cancels the previous request first, which Verify allows from 30 seconds after the start
- A `410` on a check means Verify has ended the request: the server marks it `EXPIRED` when the 5 minutes are up and `FAILED` otherwise
- The Verify application needs no capability, so locally each person uses her own
- The server reaches Verify only through the `PhoneVerifier` interface in `vonage/`, and the tests use a test double

Silent Authentication, with the SMS code as the fallback, is specified in [`specs/silent-authentication.md`](../specs/silent-authentication.md). It is tested with Vonage's Virtual Operator, which answers for `+990` numbers. Live checks need mobile data, a supported operator, such as Orange, Telefónica or Vodafone in Spain, and a registration in the Network Registry.

### Video API

Every video visit uses one routed session, because the visitor can invite up to 4 guests to join the agent. With Adaptive Media Routing, a routed session still behaves like a direct one when only two people are in the call. The details are in the [video visit spec](../specs/video-visit.md).

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

Visit confirmations, reminders and request status updates, always sent from the platform's official channel. We start with SMS, and WhatsApp Business is planned for later.

## Vonage developer tools

| Tool | What we use it for | Where |
| :---- | :---- | :---- |
| **Java Server SDK** (`com.vonage:server-sdk`) | Calling Verify, Video and Messages from the server and generating video session tokens | `server/` |
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
