# User journeys

The application has three journeys: one for visitors, one for property owners and the agency dashboard.

The screen map below is an initial mock. Screens may change during development; the specs in `specs/` are the reference for what gets built.

![Screen map mock: journey A for visitors with 7 screens, journey B for property owners with 6 screens, and the agency dashboard with 5 screens, as listed below.](images/screen-map.webp)

## Journey A · Visitor

Wants to visit a property. No sign-up needed: verifying their phone number is enough.

1. Home  
2. Property catalog + map  
3. Property details  
4. Select date and time  
5. Phone verification  
6. Confirmation  
7. Video visit

After the visit, Peephole calls the visitor with one safety question. It is a phone call, not a screen, and it is described in the [post-visit call spec](../specs/post-visit-call.md).

## Journey B · Property owner

Wants to list their property. Verifies their phone number and validates the request in a video call with the agency.

1. List my property  
2. Owner information  
3. Property details  
4. Phone verification  
5. Request submitted  
6. Video call with the agency

## Agency dashboard

Manages properties, requests and visits.

Every agency screen needs a signed-in agent; a signed-out agent goes to the sign-in page first.

1. Dashboard  
2. Listing requests  
3. Request details  
4. Visits calendar  
5. Messages and notifications

## Build status

What works in `dev` on November 26, 2026. Each spec in `specs/` describes the full feature; this table says how much of it is built.

| Journey | Built | Not built yet |
| :---- | :---- | :---- |
| A · Visitor | Screens 1 to 7: catalog with map, details, calendar, phone verification, confirmation and video visit. The confirmation SMS (#87). Silent Authentication, on in Railway with the SMS code as its fallback; with real Spanish numbers on Orange's network, the silent step fails in Vonage's Test access and the visitor gets the SMS code. The post-visit call and its alerts on the dashboard, tested with a real call | The rear camera for the agency in the video visit (#121) |
| B · Property owner | Screens 1 to 5: list my property, owner information, property details, phone verification, and the confirmation. Silent Authentication as in journey A, with the SMS code as its fallback. The server receives the listing requests (`POST /api/listing-requests`) | Step 6, the video call with the agency, has no spec yet |
| Agency dashboard | Sign-in, screen 1 (the dashboard) and screen 4 (the visits calendar) | Screens 2 and 3 (#58) and their server (#57). Screen 5 (#119), whose server is built |
