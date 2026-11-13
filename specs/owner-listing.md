# Owner listing

- **Status:** In review
- **Issue:** [#28](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/28)
- **Journey:** journey B, steps 1, 2, 3 and 5 in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

A property owner in Barcelona wants Peephole to list their home for sale or rent. Owners have no account, so they need a short form where they give their contact details and the property's, and send a request that the agency reviews before anything is published. This is the entry point for every new property, and the agency dashboard already expects these requests to arrive.

## User stories

- As an owner, I want to start a listing request without creating an account, so that listing my property takes only a few minutes
- As an owner, I want the form split into short steps, my details first and then the property's, so that it does not feel overwhelming
- As an owner, I want to know what happens after I send the request, so that I know the agency will contact me
- As an agent, I want every listing request to arrive complete and with a verified phone number, so that I can review it without chasing missing data

## Acceptance criteria

List my property (B1):

- [ ] It shows the headline, the three trust points (verified agency, professional support and secure video visits) and a "List my property" button that starts the form
- [ ] The home page entry point from journey A leads here

Owner information (B2):

- [ ] It asks for full name and phone number, both required
- [ ] The phone number is checked as a Spanish or international number and sent in E.164 format, such as `+34612987654`
- [ ] A progress indicator shows three steps: Details, Property and Verification, with the current one marked

Property details (B3):

- [ ] It asks for title, description, property type (apartment, house or studio), operation (rent or sale), neighborhood, address, price, bedrooms, size and floor. Only floor is optional
- [ ] Price and size must be greater than 0, and bedrooms 0 or more, so a studio can have 0
- [ ] Price shows `€/month` for rent and `€` for sale
- [ ] "Back" returns to B2 with the data already entered, and the same happens from B4 to B3
- [ ] "Continue" leads to phone verification (journey B step 4) with the phone number from B2

Sending the request:

- [ ] Once the phone is verified, the client sends `POST /api/listing-requests` with all the data and the `phoneVerificationId`
- [ ] The request is saved as `PENDING` and appears in the agency's listing requests (D2)
- [ ] If the server rejects a field, the form shows the message next to that field and keeps the rest of the data

Request submitted (B5):

- [ ] It confirms the request was sent and lists the next steps: information review, agency contact and video call with the agency
- [ ] It has no "View request details" button: owners have no account, so the agency keeps them informed by SMS
- [ ] It offers a way back to the home page

All screens:

- [ ] Every field has a visible label, and required fields are marked
- [ ] Error messages say how to fix the problem and are linked to their field
- [ ] They use only design system components and tokens
- [ ] They work with the keyboard alone, at 320 px wide and at 200% zoom
- [ ] Tests find elements by role and accessible name

## Out of scope

- Phone verification (step 4): covered by the [phone verification spec](phone-verification.md). This spec only sends its `phoneVerificationId`
- The video call with the agency (step 6): it will have its own spec
- Sending the SMS that keeps the owner informed: part of the messages feature, which fills in the `message` table
- Photo upload: an approved property shows a generic image
- A municipality field: Peephole covers Barcelona only
- Owner accounts, and a page where the owner can follow the request
- Editing or canceling a request once it is sent

## Open questions

None left. The questions from the issue were settled as follows:

- **Fields per step.** B2 asks only for the owner's details. Property type and operation move from B2 to B3, because they describe the property. Every field is required except floor
- **JSON names.** They match the ones the agency dashboard already reads, such as `ownerName` and `priceEuros`, so the client uses the same names to send and to read a request
- **"View request details" on B5.** Removed from the MVP. Owners have no account, so the agency keeps them informed by SMS

## Technical plan

### Data

No new tables: `listing_request` from the [data model](data-model-and-api-contract.md). The request is saved as `PENDING`, with `reviewed_by`, `rejection_reason` and `reviewed_at` empty until the agency reviews it.

### API

`POST /api/listing-requests`, with the same field names the agency dashboard reads, and `floor` as the only optional field:

```json
{
  "ownerName": "Ana Torres",
  "ownerPhone": "+34612987654",
  "title": "Apartment in Gràcia",
  "description": "...",
  "propertyType": "APARTMENT",
  "operation": "RENT",
  "area": "Gràcia",
  "address": "Carrer de Verdi, 123",
  "priceEuros": 1200,
  "bedrooms": 3,
  "sizeM2": 85,
  "floor": 2,
  "phoneVerificationId": 42
}
```

Response `201`:

```json
{ "id": 18, "status": "PENDING" }
```

The `phoneVerificationId` follows the rules in the [phone verification spec](phone-verification.md#api): saved in the session of the same browser, `VERIFIED`, with the `LISTING_REQUEST` purpose, for the same phone as `ownerPhone` and not used before.

Errors, following the [error format](data-model-and-api-contract.md#errors):

| Status | `code` | When |
| :---- | :---- | :---- |
| 400 | `VALIDATION_FAILED` | A required field is missing or not valid, with the invalid fields in `errors` |
| 422 | `PHONE_VERIFICATION_INVALID` | The verification breaks one of the rules above |

One code covers every verification rule because the client does the same in all cases: it sends the owner back to verify the phone again. `POST /api/visits` can reuse it.

### Vonage

None directly. Phone verification calls the Verify API, as described in its own spec.

### Client

- Pages in `src/pages/` for B1, the form and B5, registered in `routes.tsx`
- An `owner-listing` feature with its `api.ts`, types and components, following the folder rules in `client/AGENTS.md`
- The form keeps its data in memory while the owner moves between B2, B3 and B4, so "Back" never loses what was entered
- Fields use `FormField`, `Select`, `Textarea` and `Radio` from the design system, and errors use `Alert`
- B4 is the verification screen from the phone verification feature, opened with the `LISTING_REQUEST` purpose and the phone from B2
