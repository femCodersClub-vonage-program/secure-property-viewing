# Vonage integration

How Peephole uses each Vonage API, and the Vonage tools we rely on during development.

## Vonage APIs

### Verify API

Phone verification for visitors and owners using a one-time passcode (OTP) sent by SMS.

Silent Authentication is planned for later. In Spain it is available in the sandbox environment with Orange, Telefónica and Vodafone and requires mobile data, so SMS OTP would remain as a fallback even once it is added.

### Video API

We distinguish two session types, because each one meets a different need:

| Session type | Where it is used |
| :---- | :---- |
| **One-to-one** | Guided visit between the agent and the visitor (journey A), and video call between the owner and the agency (journey B) |
| **Multi-party** | Visit joined by a second interested person or by the owner. Later on, signing or ratification with the property manager and all parties |

### Messages API

Visit confirmations, reminders and request status updates, always sent from the platform's official channel. We start with SMS, and WhatsApp Business is planned for later.

## Vonage developer tools

| Tool | What we use it for | Where |
| :---- | :---- | :---- |
| **Java Server SDK** (`com.vonage:server-sdk`) | Calling Verify, Video and Messages from the server and generating video session tokens | `server/` |
| **Video Client SDK** | Embedding the video room in the browser | `client/` |
| **Vonage CLI** | Creating and configuring the Vonage application, its keys and test numbers from the terminal, and checking that configuration, such as webhook URLs, before an end-to-end test | Project setup and manual checks |
| **Documentation MCP Server** | Querying Vonage documentation, SDKs and sample code from the AI assistant without leaving the editor, so answers are checked against the official source. It is read-only | AI assistants |
| **MCP Tooling Server** | Letting an agent perform real actions on the Vonage account, such as sending messages or checking the balance | AI assistants, with restrictions |

The Server SDK, the Video Client SDK, the Vonage CLI and the Documentation MCP Server are confirmed. The MCP Tooling Server is optional, and the team will decide whether to use it once the project is set up.

The MCP Tooling Server acts on the real account: it sends messages and consumes credits. That is why it is only used with the team's test account and with explicit confirmation of every action.

The Vonage CLI is not part of the automated tests. They use test doubles instead of real calls, so they neither consume credits nor depend on the network. The CLI includes a mock server (`vonage mock`), but it currently covers only the SMS API, not the Messages API we use.

The CLI stores its local configuration, including credentials, in a `.vonagerc` file in the working directory. That file is listed in `.gitignore` and must never be committed.
