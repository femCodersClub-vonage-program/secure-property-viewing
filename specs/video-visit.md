# Video visit

- **Status:** Approved
- **Issue:** [#61](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/61)
- **Journey:** journey A step 7, and the "Join visit" links of screens D1 and D4 of the agency dashboard, in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

The video visit is what gives Peephole its name: the visitor sees the property live with an agent, so she can check that it exists and matches the listing before paying anything. Whoever is going to live there with her can join too. It is also the most demanding part of the project technically, because it is real-time video in the browser for several people.

## User stories

- As a visitor, I want to enter my video visit from a link, so that I can join from any browser when the time comes
- As a visitor, I want to invite the person who will live with me, so that we can see the property together
- As an agent, I want to join the visit from the dashboard, so that I can show the property live
- As anyone in the call, I want to mute myself, turn off my camera and hang up, and to know what is happening when something goes wrong

## Acceptance criteria

Room links (on A6):

- [ ] Right after booking, the confirmation screen shows the visitor's own room link, ready to copy, and says it is her only way into the room
- [ ] "Invite someone" creates a guest link, ready to copy, up to 4 per visit. A fifth one is refused with a message that says the limit has been reached
- [ ] Room links can only be created from the browser that booked the visit, and only while the visit is `CONFIRMED` and its room has not closed
- [ ] Asking again for the visitor link gives a new one, and the previous one stops working
- [ ] Two requests at the same moment never create two visitor links or more than 4 guest links
- [ ] Room links are never sent by SMS

Entering the room (A7):

- [ ] The visitor and her guests enter from their link, with no account and no session, in any browser
- [ ] An agent of the agency that owns the property enters from the dashboard, signed in
- [ ] The room opens 10 minutes before the visit starts and closes 15 minutes after it ends. Outside that window, the screen says when the room opens, and a canceled visit can't be entered
- [ ] The first person who enters creates the Video session, and two people entering at the same moment get the same one
- [ ] Several people can be in the call at once, and each video is labeled "Visitor", "Guest" or "Agency"

In the room:

- [ ] Each person can mute the microphone, turn the camera off and hang up, with buttons that have an accessible name
- [ ] The screen says so while waiting for the others, when the camera or microphone is denied (and how to allow them), while reconnecting after a dropped connection, after hanging up, and when the visit time is over
- [ ] At `closesAt`, the client leaves the call and says the visit time is over
- [ ] The videos form a grid: one column on a phone, two or three on a wider screen

Security and data:

- [ ] Only the hash of each room token is stored, and tokens and session ids never appear in logs
- [ ] After reading the token from the link, the client removes it from the address bar
- [ ] The server reaches Vonage only through the `VideoProvider` interface in `vonage/`, and the tests use a test double, so they never create real sessions
- [ ] The server fails at startup if the Video credentials are missing or the private key can't be read, with a message that names the variable

Accessibility:

- [ ] Full keyboard use and visible focus, and the room works at 320 px wide, at 200% zoom and on a phone in landscape

## Out of scope

- Recording the visit
- Revoking a room link, and recovering a visitor link once she has left the confirmation screen and her session has ended
- Chat, screen sharing and background effects
- Marking the visit `COMPLETED` after the call
- Sending room links by SMS or email
- The video call between the owner and the agency (journey B, step 6), and the owner joining a visit

## Decisions

Agreed on 2026-11-15 in [#61](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/61), and checked in the Vonage Documentation MCP Server. The client SDK calls are confirmed by the try-out in [#63](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/63), and this spec is updated if it shows otherwise:

- **The client library is `@vonage/client-sdk-video`,** the current Vonage Video Client SDK. `@opentok/client` is the legacy package. Irina adds it to `client/` with its version recorded in [ADR 0001](../docs/adr/0001-tech-stack.md), and the pull request explains its license and maintenance, as [ADR 0003](../docs/adr/0003-accessibility-and-dependencies.md) asks
- **The Video session is created when the first person enters the room,** not when the visit is booked. A visit nobody joins never creates a session or costs anything. The server locks the visit row while it creates the session, so two people entering at the same moment get the same one
- **Routed session.** Vonage recommends routed sessions for three or more participants, and with Adaptive Media Routing a routed session still behaves like a direct one when only two people are in the call
- **Room links instead of the HTTP session.** The visitor's session expires after 30 minutes of inactivity and is lost on every redeploy, so a visitor who books for tomorrow would lose her access. Instead, the visitor and her guests each get a room link with a random token. The session is only used for a few seconds, right after booking, so the confirmation screen can create those links, as the [visit booking spec](visit-booking.md) describes
- **Accepted trade-off: a lost visitor link can't be recovered.** The server keeps only the hash, SMS never carries links, and once the session has ended nothing proves she is the visitor. A6 tells her clearly to keep the link. For the MVP and the demo, this is acceptable
- **The limit is on links, not on people in the call.** One visitor link and up to 4 guest links per visit, so the server never has to ask Vonage who is connected
- **The room is open from 10 minutes before to 15 minutes after the visit.** Early enough to check the camera, and late enough for a visit that runs over. Each token expires when the room closes, which only stops new connections, so the client leaves the call itself at `closesAt`
- **Each person's role travels with her connection,** in the token's `data` field, so every browser can label every video
- **Vonage failures are system errors.** If Vonage fails or times out while creating the session, the answer is `500 INTERNAL_ERROR` with the generic message of the [error format](data-model-and-api-contract.md#errors), the same as for the other Vonage APIs. The room screen asks to try again, and the next entry creates the session, because a failed one is never saved
- **No room links in SMS.** The [messages spec](messages.md) keeps every SMS free of links, so people can tell them apart from a scam

## Technical plan

### Data

One migration adds:

- `visit.video_session_id`: nullable, filled the first time someone enters the room
- A new table `video_access`: id, visit_id, role (`VISITOR`, `GUEST`), token_hash (unique), created_at. A partial unique index on `visit_id` where `role = 'VISITOR'` keeps one visitor link per visit, and the server locks the visit row before creating a guest link, so the limit of 4 holds when two requests arrive at once

The token is 32 random bytes, encoded in base64url. Only its SHA-256 hash is stored: the token has enough entropy that a plain hash is safe, and it lets the server find the row by hash. The full link is shown on A6 and is never written to logs.

### API

`POST /api/visits/{id}/room-links`

```json
{ "role": "GUEST" }
```

Response `201`:

```json
{ "role": "GUEST", "token": "<token>" }
```

The client builds the link from its own address, as `<origin>/visits/room#<token>`, so the server needs no setting with the client's URL. The endpoint only accepts a visit id saved in this browser's session by `POST /api/visits`. Asking for the `VISITOR` link again deletes the previous one and creates a new token. Each `GUEST` call creates a new link.

`POST /api/room-links/video-token`

```json
{ "token": "<token>" }
```

Public, with no session: the token is the access. It travels in the body, and in the link it goes after `#`, which browsers never send to a server, so it can't end up in any access log.

`POST /api/agency/visits/{id}/video-token`

For a signed-in agency user of the agency that owns the property, under the agency rules in `config/SecurityConfig.java`.

Both token endpoints return `200`:

```json
{ "applicationId": "…", "sessionId": "…", "token": "…", "role": "VISITOR", "closesAt": "2026-11-23T11:45:00+01:00" }
```

`role` is `VISITOR`, `GUEST` or `AGENCY`. `closesAt` is when the room closes and the client leaves the call.

Errors, following the [error format](data-model-and-api-contract.md#errors):

| Status | `code` | When |
| :---- | :---- | :---- |
| 400 | `VALIDATION_FAILED` | The role is missing or not `VISITOR` or `GUEST`, or the token is missing |
| 401 | `AUTHENTICATION_REQUIRED` | The agency endpoint is called without a signed-in user |
| 404 | `NOT_FOUND` | The visit doesn't exist, isn't in this browser's session, belongs to another agency, or the room link doesn't exist |
| 409 | `VIDEO_VISIT_NOT_OPEN` | The visit is not `CONFIRMED`, the room has closed, or, for the token endpoints, it hasn't opened yet. The `ProblemDetail` includes `opensAt` when it hasn't opened yet |
| 409 | `VIDEO_INVITE_LIMIT_REACHED` | The visit already has 4 guest links |
| 500 | `INTERNAL_ERROR` | Vonage failed or timed out while creating the session |

All endpoints are documented for springdoc as `server/AGENTS.md` asks, and every `POST` needs the CSRF token.

### Vonage

The Video API, through the Java Server SDK that #54 adds to `pom.xml`:

- **Session:** `videoClient.createSession(CreateSessionRequest.builder().mediaMode(MediaMode.ROUTED).build())`, called the first time someone enters the room. Its `sessionId` is saved in `visit.video_session_id`
- **Token:** `videoClient.generateToken(sessionId, TokenOptions.builder().role(Role.PUBLISHER).expiryLength(…).data("role=VISITOR").build())`, generated on the server for each person who enters, with the time left until the room closes. The token is a JWT signed with the private key, so generating it doesn't call Vonage. `data` carries only the role, never personal data
- **Credentials:** the Video group of variables, `VONAGE_VIDEO_APPLICATION_ID` and `VONAGE_VIDEO_PRIVATE_KEY`, with Viviana's application, as `docs/setup.md` describes. Like Verify in #54, the server checks at startup that they are present and that the key can be read, the tests get generated credentials, and locally everyone sets this group with Viviana's application from the team's Drive. The pull request that adds the check updates `docs/setup.md` and `docs/setup.es.md`, and the variables are set on Railway before it is merged

In code, the feature lives in a `videovisit/` package. It talks to Vonage through a `VideoProvider` interface in `vonage/`, and it locks and updates the visit through `VisitService` from the booking feature, never through its repository, as `server/AGENTS.md` asks. Tests use a test double of `VideoProvider`.

### Client

- A7 as a page in `src/pages/`, with a `video-visit` feature that holds its `api.ts`, types and components, following `client/AGENTS.md`. Two routes in `routes.tsx`: `/visits/room` for the visitor and guests, which reads the token from the part of the URL after `#` and then removes it with `history.replaceState`, and `/agency/visits/:id/room` for agents
- The page asks for its video token, then joins the session with `@vonage/client-sdk-video`: `OT.initSession(applicationId, sessionId)`, connects with the token and publishes the camera and microphone
- A grid of videos, each labeled from the role in its `stream.connection.data`, and a control bar with mute, camera and hang up as `<button>`s with accessible names. The state of each control is announced with `aria-pressed`
- A status line for waiting, permissions denied, reconnecting, hung up and time over, in a live region so the change is announced
- On A6, the visitor link is created once, right after the booking response, and kept in memory. If the page is reloaded, it shows a "Get a new link" button that warns the previous link will stop working. "Invite someone" creates a guest link on each click. Each link has a copy button that falls back to selecting the text when the clipboard is not available
- The agency's "Join visit" controls in D1 and D4 are links (`<a>`) to `/agency/visits/:id/room`
