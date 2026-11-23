# Post-visit call

- **Status:** Approved
- **Issue:** [#112](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/112) (server) and [#113](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/113) (client)
- **Journey:** after step 7 of journey A in [`docs/user-journeys.md`](../docs/user-journeys.md). It is a phone call, not a screen

## Problem

Rental scams usually ask for money before the contract is signed: a deposit to "hold" the property, or a fee to see it. A visitor who has just seen a property in a video visit is exactly the person a scammer will contact next. After the visit, Peephole calls the visitor's verified phone and asks one question with the Vonage Voice API: has anyone asked you for money before signing? A "yes" reaches the agency on its dashboard while there is still time to act, and the visitor hears a short piece of advice.

## User stories

- As a visitor, I want to be told not to pay before signing, and to be able to report it with one key, so that I don't fall for a scam right after the visit
- As the agency, I want to see which visits ended with someone asking the visitor for money, so that I can check that listing and warn its owner

## Acceptance criteria

- [ ] `POST_VISIT_CALL_DELAY_MINUTES` after a visit ends, 15 by default, which is when its room closes, the server calls the visitor's verified phone
- [ ] Only `CONFIRMED` visits whose visitor entered the room get a call, and each visit gets at most one call, even when the check runs twice at the same time
- [ ] The call plays the question in `es-ES` and waits for one key. 1 records that someone asked for money and 2 that nobody did, and the visitor hears a closing sentence that matches the answer
- [ ] No key or another key records no answer, and the call is never repeated
- [ ] When voicemail answers, the call hangs up before the question plays, and no answer is recorded
- [ ] No call is placed before 09:00 or after 21:00 Madrid time. A visit whose call would fall outside that window is marked `SKIPPED`
- [ ] Both Vonage webhooks are only accepted with a valid signature, and answer `401 WEBHOOK_SIGNATURE_INVALID` otherwise. A repeated webhook never changes an answer that is already recorded, and a late answer is never lost
- [ ] `GET /api/agency/summary` returns the agency's most recent alerts, and D1 shows them in a "Visits to review" card at the top. The card is not shown when there are none
- [ ] The confirmation screen (A6) tells the visitor that Peephole will call after the visit with one safety question
- [ ] The phone number, the visitor's name and the answer never appear in logs
- [ ] With `VOICE_CALLS_ENABLED=false`, the default, no call is placed, so local development and the tests need no Vonage number
- [ ] The tests use a test double of `VoiceCaller`, so they never call Vonage

## Out of scope

- Calling the owner, the guests or the agency
- Recording the call, speech recognition or any AI voice agent. The keypad is deterministic, which suits a recorded demo
- Repeating the call when nobody answers
- Resolving an alert in the dashboard, or showing the visitor's phone to the agency
- An SMS instead of the call, which belongs to the [messages spec](messages.md)

## Decisions

Checked in the Vonage Documentation MCP Server and in the Java Server SDK 9.15.1 on 2026-11-23:

- **One Spanish Vonage number, in its own application.** The number is bought in Irina's Vonage account, which is funded, because a trial account can't buy numbers. A new application with the Voice capability keeps Verify, Video and Messages in their own applications. A program member reported on 2026-11-23, not the documentation, that a Spanish number costs about 5 euros, arrives in 24 to 48 hours, and reaches a Spanish mobile showing that number. The number is on the critical path for the demo, so it is requested first
- **The call is in Spanish.** A voice call to a Spanish mobile has no screen to fall back on, so it speaks the visitor's language. The interface and the SMS stay in English, as the [messages spec](messages.md) decided for written texts
- **Only visitors who joined.** A new `visit.visitor_joined_at` is set the first time the visitor's room link gets a video token. Calling only those visits keeps "the video visit you just had" true, and the sample visits, whose phones are fictional, never get a call, because nobody holds their room links
- **One rule for the moment.** The call goes `POST_VISIT_CALL_DELAY_MINUTES` after the visit ends. The default, 15, is when the room closes. The recorded demo can shorten it, knowing the room may still be open
- **The NCCO goes inside the create-call request.** A `talk` action in `es-ES` with `bargeIn`, followed by an `input` action for one DTMF digit with an 8-second `timeOut` and its own `eventUrl`. No answer URL has to be hosted, and the call hangs up by itself once the NCCO returned for the answer finishes
- **Voicemail is detected for free.** The call uses `machine_detection: hangup`, which is free and finishes before the first action, so a voicemail never hears the question
- **The SDK covers the whole flow.** `Call.builder()`, `TalkAction`, `InputAction`, `DtmfSettings`, `MachineDetection.HANGUP` and `TextToSpeechLanguage.SPANISH` (`es-ES`) build the call. `VoiceClient.verifySignature` checks the webhook JWT, and `EventWebhook.fromJson` reads its body, with `getDtmf().getDigits()`, `getDtmf().isTimedOut()`, `getStatus()` and `getCallUuid()`. No new dependency
- **Signed webhooks.** Vonage signs them with the signature secret of the account that owns the application, here Irina's. The JWT signs a hash of the body, not the query string, so once `vonage_call_uuid` is stored, the body's `uuid` must match it. The signature check is shared with the other webhooks: whichever webhook ships first adds the common verifier and the `401` handling in `common/`, and the others reuse it
- **Repeated and late webhooks.** Vonage retries a webhook that doesn't get a 2xx answer, and the JWT `jti` is not stable across retries, so the server matches repeats on its own call id and on the call's state. An answer always wins: a key that arrives after the call was marked `NOT_REACHED` still records the answer, because losing a "yes" is the worst outcome
- **A table of its own.** The call has its own lifecycle and webhooks, so it gets a `post_visit_call` table instead of more columns on `visit`
- **The check runs every minute.** A Spring scheduled task, enabled with `@EnableScheduling` in `config/`, picks the visits whose call is due and inserts one `CALLING` row per visit with `INSERT … ON CONFLICT (visit_id) DO NOTHING`, committed before calling Vonage, so a collision skips that visit only and the webhooks always find the row. The call to Vonage runs outside that transaction. It only looks back 2 hours, so a redeploy never calls about old visits
- **A row can stay `CALLING`.** If the server stops between the insert and the call, or Vonage never sends a final event, the row stays `CALLING`. That is accepted: it raises no alert and is never retried
- **Transparency.** The visitor gave the phone to book the visit, and A6 tells her about the call before it happens. No audio is recorded and only the answer is stored. The answer raises an alert for a person at the agency, who decides what to do, so no decision about the visitor is taken automatically

## Technical plan

### Data

A Flyway migration adds the `post_visit_call` table and the `visitor_joined_at` column:

| Table | Column | Type | Notes |
| :---- | :---- | :---- | :---- |
| `post_visit_call` | `id` | `BIGINT` identity | |
| | `visit_id` | `BIGINT`, `UNIQUE`, references `visit` | One call per visit |
| | `vonage_call_uuid` | `VARCHAR(64)`, `UNIQUE`, nullable | Filled when Vonage accepts the call |
| | `status` | `VARCHAR(20)` | `CALLING`, `ANSWERED`, `NOT_REACHED`, `FAILED` or `SKIPPED` |
| | `answer` | `VARCHAR(20)`, nullable | `ASKED_FOR_MONEY` (key 1) or `NOT_ASKED` (key 2) |
| | `created_at` | `TIMESTAMP WITH TIME ZONE` | |
| | `answered_at` | `TIMESTAMP WITH TIME ZONE`, nullable | When the key was received |
| `visit` | `visitor_joined_at` | `TIMESTAMP WITH TIME ZONE`, nullable | Set once, by the video visit feature |

What each status means:

| Status | When | Final |
| :---- | :---- | :---- |
| `CALLING` | The row is inserted and the call requested | No |
| `ANSWERED` | The input webhook arrived, with any key or none. `answer` is set only for 1 or 2 | Yes |
| `NOT_REACHED` | Busy, unanswered, rejected, voicemail, or a call that completed with no input | Only an input webhook can still change it to `ANSWERED` |
| `FAILED` | Vonage refused to start the call, or its answer never arrived | Only an input webhook can still change it to `ANSWERED`, because the call may have started anyway |
| `SKIPPED` | The call would fall outside 09:00 to 21:00 | Yes |

The feature lives in a `postvisitcall` package. It reads visits through a new `VisitService` method, never through the visit repository, and the agency summary gets the alerts from this feature's service. The [data model](data-model-and-api-contract.md) gets the table, the column and the two webhooks in the build pull request, as [`specs/README.md`](README.md) describes.

The sample data adds two `ANSWERED` calls with `ASKED_FOR_MONEY` on past sample visits, so D1 shows the card before any real call. They are in the past, so they never trigger a call.

### API

Two Vonage webhooks, under `/api/webhooks/**`, so they need no CSRF token and are checked with the signed JWT instead. `{id}` is our `post_visit_call.id`, and both are documented for springdoc:

- `POST /api/webhooks/voice/input?callId={id}`: the `input` result. The first time, it sets the status to `ANSWERED`, records the answer and `answered_at`, and returns the closing NCCO as a JSON array. A repeat returns the same NCCO and changes nothing. A key on a `NOT_REACHED` or `FAILED` call still records the answer
- `POST /api/webhooks/voice/event?callId={id}`: call status. `busy`, `unanswered`, `rejected`, `failed`, `timeout`, `cancelled`, a `machine` result and a `completed` with no input mark the call `NOT_REACHED`. `started`, `ringing`, `answered`, `human`, `input` and `disconnected` are ignored, and a final status never changes. It answers `204`

| Case | Input webhook | Event webhook |
| :---- | :---- | :---- |
| Invalid or missing signature | `401 WEBHOOK_SIGNATURE_INVALID` | `401 WEBHOOK_SIGNATURE_INVALID` |
| Unknown `callId`, or a body `uuid` that doesn't match | `200` with the "no valid key" NCCO, and the id logged | `204`, and the id logged |
| The database fails | `500`, so Vonage retries | `500`, so Vonage retries |

The texts, in `es-ES`:

| Moment | Text |
| :---- | :---- |
| Question | "Hola, te llamamos de Peephole por la videovisita que acabas de hacer. Si alguien te ha pedido dinero, una señal o cualquier pago antes de firmar el contrato, pulsa 1. Si no, pulsa 2." |
| Key 1 | "Gracias. Hemos avisado a la agencia. No hagas ningún pago antes de firmar el contrato." |
| Key 2 | "Gracias por tu respuesta. Que vaya muy bien la búsqueda." |
| No valid key | "No hemos recibido tu respuesta. Gracias y hasta pronto." |

`GET /api/agency/summary` adds `alerts`: the visits of the signed-in agency whose call recorded `ASKED_FOR_MONEY`, with `answered_at` in the last 14 days, newest first and at most 5. The field is only added, so the current client keeps working, and `startsAt` is named as in `nextVisits`:

```json
{
  "alerts": [
    {
      "visitId": 31,
      "visitorName": "Laura Gómez",
      "propertyTitle": "Apartment in Gràcia",
      "startsAt": "2026-11-10T11:00:00+01:00",
      "reportedAt": "2026-11-10T11:47:12+01:00"
    }
  ]
}
```

### Vonage

The Voice API, called from the server only, through a `VoiceCaller` interface in `vonage/` with its test double. Its implementation uses `VoiceClient.createCall` from the Java Server SDK, with the inline NCCO described above, `machine_detection: hangup`, the call's `event_url` pointing to the event webhook, and the `input` action's `eventUrl` pointing to the input webhook.

New variables, read in `application.properties`, documented in `server/.env.example` with placeholders, and in the Vonage table of `docs/setup.md` and `docs/setup.es.md`, with Irina as the owner of the values:

- `VONAGE_VOICE_APPLICATION_ID`, `VONAGE_VOICE_PRIVATE_KEY`, in base64 on one line like the other keys, and `VONAGE_VOICE_SIGNATURE_SECRET`, the signature secret of Irina's account. The key and the secret are in the team's shared Drive folder
- `VONAGE_VOICE_FROM_NUMBER`, the Spanish Vonage number, in E.164 without `+`
- `SERVER_PUBLIC_URL`, the server's public domain, which the webhook URLs are built from. Locally it is an ngrok tunnel, a new tool for the setup guide
- `VOICE_CALLS_ENABLED`, `false` by default, and `POST_VISIT_CALL_DELAY_MINUTES`, `15` by default

With `VOICE_CALLS_ENABLED=true`, the server refuses to start when a Voice variable is missing or the key can't be read, and names the variable, as the [video visit spec](video-visit.md) does. With calls off, an empty signature secret still rejects every webhook.

### Client

- In D1, a "Visits to review" card at the top, before the next visit card, when `alerts` is not empty. Each row shows the visitor's name, the property, the visit time and when it was reported, in Madrid time, with a warning icon and the text "Asked for money before signing", so it doesn't rely on color. It lives in the `agency-dashboard` feature and uses its existing components
- In A6, one sentence under the confirmation: "After the visit, Peephole will call you with one safety question. Answer with your phone's keypad."
