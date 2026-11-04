# Property browsing

- **Status:** Approved
- **Issue:** [#13](https://github.com/femCodersClub-vonage-program/secure-property-viewing/issues/13)
- **Journey:** journey A, steps 1 to 3 in [`docs/user-journeys.md`](../docs/user-journeys.md)

## Problem

People looking for an apartment arrive at Peephole wary of scams. The home page, the catalog and the property details are the first screens they see, and the first thing anyone sees in the demo. They have to make it easy to find a property and, at a glance, show why Peephole is safer: verified agencies, video visits and secure communication.

## User stories

- As a visitor, I want to understand what Peephole offers as soon as I arrive, so that I can decide whether to trust it
- As a visitor, I want to filter by rent or sale and see the properties on a map of Barcelona, so that I only see what interests me and know where it is
- As a visitor, I want to see the details and photos of a property, so that I can decide whether to request a visit
- As an owner, I want a clear way to list my property from the home page, so that I can start journey B

## Acceptance criteria

Home page (A1):

- [ ] It shows the headline, a link to the catalog, an entry point to "List my property" and the three trust points: verified agencies, video visits and secure communication

Catalog (A2):

- [ ] It lists the active properties from `GET /api/properties`, each card with photo, title, neighborhood, price, bedrooms and size
- [ ] The visitor can filter by all, rent or sale, and the filter is kept in the URL so a filtered catalog can be shared
- [ ] A map of Barcelona next to the list shows one pin per property with coordinates. Selecting a pin shows the title and price, with a link to the details
- [ ] It shows a loading state, an empty state with a way to clear the filters, and an error state with a way to try again

Property details (A3):

- [ ] It shows the photo gallery, title, price, neighborhood, bedrooms, size, floor, description, the verified agency badge and whether video visits are available
- [ ] "Request a video visit" leads to journey A step 4
- [ ] A property that does not exist shows a not found page with a way back to the catalog

All three screens:

- [ ] They use only design system components and tokens
- [ ] They work with the keyboard alone, at 320 px wide and at 200% zoom
- [ ] Every photo has the alternative text from the API, and gallery controls have accessible names and support keyboard use with visible focus
- [ ] Prices and sizes are formatted for Spain, such as `950 €/month` and `70 m²`
- [ ] Tests find elements by role and accessible name

## Out of scope

- Cities other than Barcelona, and searching by location
- Favorites and sharing buttons
- Sorting the catalog

## Technical plan

### Data

No new tables: `property` and `property_image` from the [data model](data-model-and-api-contract.md).

### API

`GET /api/properties?operation=RENT`

```json
[
  {
    "id": 7,
    "title": "Apartment in Gràcia",
    "operation": "RENT",
    "priceEuros": 950,
    "area": "Gràcia",
    "bedrooms": 2,
    "sizeM2": 70,
    "latitude": 41.4036,
    "longitude": 2.1566,
    "coverImage": { "url": "https://...", "altText": "Bright living room with a balcony" }
  }
]
```

The filter is optional. `videoVisitAvailable` and `agency.verified` come from the `property` and `agency` tables in the data model. An unknown `operation` returns `400 VALIDATION_FAILED`. A property approved from a listing request has no coordinates or photos: `latitude` and `longitude` are `null`, so it has no pin, and `coverImage` is `null`, so the client shows a generic image.

`GET /api/properties/{id}`

```json
{
  "id": 7,
  "title": "Apartment in Gràcia",
  "operation": "RENT",
  "propertyType": "APARTMENT",
  "priceEuros": 950,
  "area": "Gràcia",
  "bedrooms": 2,
  "sizeM2": 70,
  "floor": 2,
  "description": "...",
  "videoVisitAvailable": true,
  "agency": { "name": "...", "verified": true },
  "images": [{ "url": "https://...", "altText": "..." }]
}
```

A property that does not exist or is not active returns `404 NOT_FOUND`.

### Vonage

None.

### Client

- Pages in `src/pages/` for the home page, the catalog and the details, registered in `routes.tsx`
- A `property-browsing` feature with its `api.ts`, types and components, following the folder rules in `client/AGENTS.md`
- The map uses `leaflet` with OpenStreetMap tiles, in issue #30. Coordinates are approximate, at neighborhood level, because the full address is only shown after booking a visit
- Sample data in the shape above while the endpoints are not in `dev`
