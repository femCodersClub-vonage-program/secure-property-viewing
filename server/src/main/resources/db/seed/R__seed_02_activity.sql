-- Demo activity: visit slots, visits, listing requests, their phone verifications and their messages.
-- Everything is invented. Phone numbers use the 07700 900xxx range, which Ofcom reserves for fiction,
-- so no real person can ever receive a message. Activity rows use ids from 900001, so they never collide
-- with rows the application created before this file was first loaded, such as on Railway.

-- Phone verifications that the seeded visits and requests have already used. Their phone_hash is a
-- placeholder, not a real HMAC: nothing compares it, because each verification can only be used once.
INSERT INTO phone_verification (id, purpose, phone_hash, vonage_request_id, status, check_attempts, created_at, verified_at)
OVERRIDING SYSTEM VALUE
VALUES
    (900001, 'VISIT', 'demo-seed-not-an-hmac-01', 'demo-seed-01', 'VERIFIED', 1, '2026-11-06 10:00+01', '2026-11-06 10:01+01'),
    (900002, 'VISIT', 'demo-seed-not-an-hmac-02', 'demo-seed-02', 'VERIFIED', 1, '2026-11-07 16:20+01', '2026-11-07 16:21+01'),
    (900003, 'VISIT', 'demo-seed-not-an-hmac-03', 'demo-seed-03', 'VERIFIED', 2, '2026-11-09 09:15+01', '2026-11-09 09:17+01'),
    (900004, 'VISIT', 'demo-seed-not-an-hmac-04', 'demo-seed-04', 'VERIFIED', 1, '2026-11-12 19:40+01', '2026-11-12 19:41+01'),
    (900005, 'VISIT', 'demo-seed-not-an-hmac-05', 'demo-seed-05', 'VERIFIED', 1, '2026-11-14 11:05+01', '2026-11-14 11:06+01'),
    (900006, 'VISIT', 'demo-seed-not-an-hmac-06', 'demo-seed-06', 'VERIFIED', 1, '2026-11-13 08:50+01', '2026-11-13 08:51+01'),
    (900007, 'VISIT', 'demo-seed-not-an-hmac-07', 'demo-seed-07', 'VERIFIED', 1, '2026-11-14 21:10+01', '2026-11-14 21:11+01'),
    (900008, 'VISIT', 'demo-seed-not-an-hmac-08', 'demo-seed-08', 'VERIFIED', 1, '2026-11-15 12:30+01', '2026-11-15 12:31+01'),
    (900009, 'VISIT', 'demo-seed-not-an-hmac-09', 'demo-seed-09', 'VERIFIED', 1, '2026-11-15 18:45+01', '2026-11-15 18:46+01'),
    (900010, 'VISIT', 'demo-seed-not-an-hmac-10', 'demo-seed-10', 'VERIFIED', 1, '2026-11-16 09:20+01', '2026-11-16 09:21+01'),
    (900011, 'VISIT', 'demo-seed-not-an-hmac-11', 'demo-seed-11', 'VERIFIED', 1, '2026-11-16 10:05+01', '2026-11-16 10:06+01'),
    (900012, 'VISIT', 'demo-seed-not-an-hmac-12', 'demo-seed-12', 'VERIFIED', 2, '2026-11-16 11:40+01', '2026-11-16 11:42+01'),
    (900013, 'VISIT', 'demo-seed-not-an-hmac-13', 'demo-seed-13', 'VERIFIED', 1, '2026-11-16 12:15+01', '2026-11-16 12:16+01'),
    (900014, 'LISTING_REQUEST', 'demo-seed-not-an-hmac-14', 'demo-seed-14', 'VERIFIED', 1, '2026-11-14 17:00+01', '2026-11-14 17:01+01'),
    (900015, 'LISTING_REQUEST', 'demo-seed-not-an-hmac-15', 'demo-seed-15', 'VERIFIED', 1, '2026-11-15 10:30+01', '2026-11-15 10:31+01'),
    (900016, 'LISTING_REQUEST', 'demo-seed-not-an-hmac-16', 'demo-seed-16', 'VERIFIED', 1, '2026-11-08 12:00+01', '2026-11-08 12:01+01'),
    (900017, 'LISTING_REQUEST', 'demo-seed-not-an-hmac-17', 'demo-seed-17', 'VERIFIED', 1, '2026-11-10 22:40+01', '2026-11-10 22:41+01'),
    (900018, 'LISTING_REQUEST', 'demo-seed-not-an-hmac-18', 'demo-seed-18', 'VERIFIED', 3, '2026-11-11 23:55+01', '2026-11-11 23:58+01')
ON CONFLICT (id) DO UPDATE
SET purpose = EXCLUDED.purpose,
    phone_hash = EXCLUDED.phone_hash,
    vonage_request_id = EXCLUDED.vonage_request_id,
    status = EXCLUDED.status,
    check_attempts = EXCLUDED.check_attempts,
    created_at = EXCLUDED.created_at,
    verified_at = EXCLUDED.verified_at;

-- Visit slots of 30 minutes, from 09:00 to 20:00 in Barcelona time, every day from 2026-11-09 to 2026-12-31,
-- for every active property. The id is derived from the property, the day and the time, so a reload finds the
-- same rows. Existing slots are left as they are, so a slot booked through the application stays booked.
INSERT INTO visit_slot (id, property_id, starts_at, ends_at, status)
OVERRIDING SYSTEM VALUE
SELECT p.id * 100000 + (d.day - DATE '2026-11-09') * 100 + s.n,
       p.id,
       (d.day + TIME '09:00' + s.n * INTERVAL '30 minutes') AT TIME ZONE 'Europe/Madrid',
       (d.day + TIME '09:30' + s.n * INTERVAL '30 minutes') AT TIME ZONE 'Europe/Madrid',
       'AVAILABLE'
FROM property p
CROSS JOIN generate_series(DATE '2026-11-09', DATE '2026-12-31', INTERVAL '1 day') AS g(day_ts)
CROSS JOIN LATERAL (SELECT g.day_ts::date AS day) AS d
CROSS JOIN generate_series(0, 21) AS s(n)
WHERE p.status = 'ACTIVE'
ON CONFLICT (id) DO NOTHING;

-- Visits in every status: completed ones in the past, two canceled, and confirmed ones over the coming weeks,
-- including the days of the demo recording (December 1 to 3), so the agency dashboard always has visits.
INSERT INTO visit (id, property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone, status, created_at)
OVERRIDING SYSTEM VALUE
SELECT v.id, v.property_id, slot.id, v.phone_verification_id, v.visitor_name, v.visitor_phone, v.status, v.created_at
FROM (VALUES
    (900001, 1, TIMESTAMPTZ '2026-11-10 11:00 Europe/Madrid', 900001, 'Laura Gómez', '+447700900101', 'COMPLETED', TIMESTAMPTZ '2026-11-06 10:02+01'),
    (900002, 4, TIMESTAMPTZ '2026-11-11 17:30 Europe/Madrid', 900002, 'Carlos Ruiz', '+447700900102', 'COMPLETED', TIMESTAMPTZ '2026-11-07 16:22+01'),
    (900003, 7, TIMESTAMPTZ '2026-11-13 10:00 Europe/Madrid', 900003, 'Marta Vidal', '+447700900103', 'COMPLETED', TIMESTAMPTZ '2026-11-09 09:18+01'),
    (900004, 2, TIMESTAMPTZ '2026-11-18 12:00 Europe/Madrid', 900004, 'Jordi Pons', '+447700900104', 'CANCELED', TIMESTAMPTZ '2026-11-12 19:42+01'),
    (900005, 11, TIMESTAMPTZ '2026-11-25 16:00 Europe/Madrid', 900005, 'Aisha Benali', '+447700900105', 'CANCELED', TIMESTAMPTZ '2026-11-14 11:07+01'),
    (900006, 1, TIMESTAMPTZ '2026-11-17 11:00 Europe/Madrid', 900006, 'Lucía Serrano', '+447700900106', 'CONFIRMED', TIMESTAMPTZ '2026-11-13 08:52+01'),
    (900007, 5, TIMESTAMPTZ '2026-11-19 18:00 Europe/Madrid', 900007, 'Pablo Herrera', '+447700900107', 'CONFIRMED', TIMESTAMPTZ '2026-11-14 21:12+01'),
    (900008, 12, TIMESTAMPTZ '2026-11-24 10:30 Europe/Madrid', 900008, 'Sofía Martín', '+447700900108', 'CONFIRMED', TIMESTAMPTZ '2026-11-15 12:32+01'),
    (900009, 3, TIMESTAMPTZ '2026-11-27 13:00 Europe/Madrid', 900009, 'Nuria Castell', '+447700900109', 'CONFIRMED', TIMESTAMPTZ '2026-11-15 18:47+01'),
    (900010, 14, TIMESTAMPTZ '2026-12-01 11:00 Europe/Madrid', 900010, 'Daniel Soler', '+447700900110', 'CONFIRMED', TIMESTAMPTZ '2026-11-16 09:22+01'),
    (900011, 8, TIMESTAMPTZ '2026-12-02 17:00 Europe/Madrid', 900011, 'Elena Ortiz', '+447700900111', 'CONFIRMED', TIMESTAMPTZ '2026-11-16 10:07+01'),
    (900012, 16, TIMESTAMPTZ '2026-12-03 12:30 Europe/Madrid', 900012, 'Hugo Ferrer', '+447700900112', 'CONFIRMED', TIMESTAMPTZ '2026-11-16 11:43+01'),
    (900013, 9, TIMESTAMPTZ '2026-12-09 10:00 Europe/Madrid', 900013, 'Clara Ibáñez', '+447700900113', 'CONFIRMED', TIMESTAMPTZ '2026-11-16 12:17+01')
) AS v (id, property_id, starts_at, phone_verification_id, visitor_name, visitor_phone, status, created_at)
JOIN visit_slot slot ON slot.property_id = v.property_id AND slot.starts_at = v.starts_at
ON CONFLICT (id) DO UPDATE
SET property_id = EXCLUDED.property_id,
    visit_slot_id = EXCLUDED.visit_slot_id,
    phone_verification_id = EXCLUDED.phone_verification_id,
    visitor_name = EXCLUDED.visitor_name,
    visitor_phone = EXCLUDED.visitor_phone,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at;

-- The join above skips a visit whose slot doesn't exist, so stop here instead of loading fewer visits.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM visit WHERE id BETWEEN 900001 AND 900013) <> 13 THEN
        RAISE EXCEPTION 'Demo activity: a seeded visit has no matching visit slot';
    END IF;
END $$;

-- A canceled visit keeps its slot, as the visit booking spec says, so every seeded visit books its slot.
UPDATE visit_slot
SET status = 'BOOKED'
WHERE id IN (SELECT visit_slot_id FROM visit WHERE id BETWEEN 900001 AND 999999);

-- Listing requests in every status. The approved one became property 22 of the catalog. The two rejected
-- ones are scam examples the agency caught, with the reason it gave.
INSERT INTO listing_request (id, phone_verification_id, owner_full_name, owner_phone, title, description, property_type,
                             operation, area, address, price_euros, bedrooms, size_m2, floor, status, reviewed_by,
                             rejection_reason, created_at, reviewed_at)
OVERRIDING SYSTEM VALUE
VALUES
    (900001, 900014, 'Ana Torres', '+447700900201', 'Bright flat near Plaça del Sol',
     'A three-bedroom flat with a balcony over a quiet street, two minutes from the square.',
     'APARTMENT', 'RENT', 'Gràcia', 'Fictional owner address 01, Barcelona', 1200, 3, 85, 2,
     'PENDING', NULL, NULL, '2026-11-14 17:02+01', NULL),
    (900002, 900015, 'Javier Martín', '+447700900202', 'Family house in Sant Gervasi',
     'A four-bedroom house with a small garden and a garage, close to schools.',
     'HOUSE', 'SALE', 'Sant Gervasi', 'Fictional owner address 02, Barcelona', 640000, 4, 160, NULL,
     'PENDING', NULL, NULL, '2026-11-15 10:32+01', NULL),
    (900003, 900016, 'Lucía Pérez', '+447700900203', 'New owner listing in Gràcia',
     'A newly approved listing without catalog photos or precise location.',
     'APARTMENT', 'RENT', 'Gràcia', 'Fictional demo address 22, Barcelona', 1180, 2, 72, 1,
     'APPROVED', 1, NULL, '2026-11-08 12:02+01', '2026-11-09 10:15+01'),
    (900004, 900017, 'Marc Vidal', '+447700900204', 'Penthouse with terrace in Eixample',
     'A three-bedroom penthouse with a large terrace. Available now, deposit required to book a visit.',
     'APARTMENT', 'RENT', 'Eixample', 'Fictional owner address 04, Barcelona', 750, 3, 120, 7,
     'REJECTED', 2,
     'The photos belong to another property already listed in Barcelona, and the rent is far below the area. The owner could not show the property on a video call.',
     '2026-11-10 22:42+01', '2026-11-11 09:30+01'),
    (900005, 900018, 'R. Smith', '+447700900205', 'Studio by the beach, ready today',
     'A furnished studio by the beach. I am abroad, so please send the deposit and I will mail the keys.',
     'STUDIO', 'RENT', 'Barceloneta', 'Fictional owner address 05, Barcelona', 550, 0, 30, 3,
     'REJECTED', 2,
     'The phone number is a virtual number used in two earlier requests with different names, and the owner asked for a deposit before any visit.',
     '2026-11-11 23:59+01', '2026-11-12 09:10+01')
ON CONFLICT (id) DO UPDATE
SET phone_verification_id = EXCLUDED.phone_verification_id,
    owner_full_name = EXCLUDED.owner_full_name,
    owner_phone = EXCLUDED.owner_phone,
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    property_type = EXCLUDED.property_type,
    operation = EXCLUDED.operation,
    area = EXCLUDED.area,
    address = EXCLUDED.address,
    price_euros = EXCLUDED.price_euros,
    bedrooms = EXCLUDED.bedrooms,
    size_m2 = EXCLUDED.size_m2,
    floor = EXCLUDED.floor,
    status = EXCLUDED.status,
    reviewed_by = EXCLUDED.reviewed_by,
    rejection_reason = EXCLUDED.rejection_reason,
    created_at = EXCLUDED.created_at,
    reviewed_at = EXCLUDED.reviewed_at;

UPDATE property
SET listing_request_id = 900003
WHERE id = 22;

-- Messages in every status, as the agency sees them in D5. They are rows for the dashboard only.
-- The SCHEDULED ones are dated in 2027, after the demo, and must never be sent: the messages feature only
-- sends with MESSAGES_SENDING_ENABLED, as the messages spec describes.
INSERT INTO message (id, visit_id, listing_request_id, type, channel, vonage_message_id, status, scheduled_at, updated_at)
OVERRIDING SYSTEM VALUE
VALUES
    (900001, 900001, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-01', 'DELIVERED', '2026-11-06 10:02+01', '2026-11-06 10:02+01'),
    (900002, 900001, NULL, 'REMINDER', 'SMS', 'demo-seed-message-02', 'DELIVERED', '2026-11-10 10:00+01', '2026-11-10 10:00+01'),
    (900003, 900002, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-03', 'DELIVERED', '2026-11-07 16:22+01', '2026-11-07 16:23+01'),
    (900004, 900003, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-04', 'FAILED', '2026-11-09 09:18+01', '2026-11-09 09:19+01'),
    (900005, 900006, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-05', 'DELIVERED', '2026-11-13 08:52+01', '2026-11-13 08:52+01'),
    (900006, 900007, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-06', 'DELIVERED', '2026-11-14 21:12+01', '2026-11-14 21:13+01'),
    (900007, 900008, NULL, 'CONFIRMATION', 'SMS', 'demo-seed-message-07', 'SUBMITTED', '2026-11-15 12:32+01', '2026-11-15 12:32+01'),
    (900008, 900010, NULL, 'REMINDER', 'SMS', NULL, 'SCHEDULED', '2027-01-15 10:00+01', '2026-11-16 09:22+01'),
    (900009, 900011, NULL, 'REMINDER', 'SMS', NULL, 'SCHEDULED', '2027-01-15 16:00+01', '2026-11-16 10:07+01'),
    (900010, NULL, 900001, 'CONFIRMATION', 'SMS', 'demo-seed-message-10', 'DELIVERED', '2026-11-14 17:02+01', '2026-11-14 17:03+01'),
    (900011, NULL, 900003, 'CONFIRMATION', 'SMS', 'demo-seed-message-11', 'DELIVERED', '2026-11-08 12:02+01', '2026-11-08 12:02+01'),
    (900012, NULL, 900003, 'STATUS_UPDATE', 'SMS', 'demo-seed-message-12', 'DELIVERED', '2026-11-09 10:15+01', '2026-11-09 10:16+01'),
    (900013, NULL, 900004, 'STATUS_UPDATE', 'SMS', 'demo-seed-message-13', 'FAILED', '2026-11-11 09:30+01', '2026-11-11 09:31+01'),
    (900014, NULL, 900005, 'STATUS_UPDATE', 'SMS', 'demo-seed-message-14', 'DELIVERED', '2026-11-12 09:10+01', '2026-11-12 09:10+01')
ON CONFLICT (id) DO UPDATE
SET visit_id = EXCLUDED.visit_id,
    listing_request_id = EXCLUDED.listing_request_id,
    type = EXCLUDED.type,
    channel = EXCLUDED.channel,
    vonage_message_id = EXCLUDED.vonage_message_id,
    status = EXCLUDED.status,
    scheduled_at = EXCLUDED.scheduled_at,
    updated_at = EXCLUDED.updated_at;

SELECT setval(pg_get_serial_sequence('phone_verification', 'id'), (SELECT MAX(id) FROM phone_verification));
SELECT setval(pg_get_serial_sequence('visit_slot', 'id'), (SELECT MAX(id) FROM visit_slot));
SELECT setval(pg_get_serial_sequence('visit', 'id'), (SELECT MAX(id) FROM visit));
SELECT setval(pg_get_serial_sequence('listing_request', 'id'), (SELECT MAX(id) FROM listing_request));
SELECT setval(pg_get_serial_sequence('message', 'id'), (SELECT MAX(id) FROM message));
