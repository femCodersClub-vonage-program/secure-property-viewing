-- Demo post-visit calls: two visits whose visitor answered that someone asked for money before signing, so the
-- "Visits to review" card of the agency dashboard has alerts before any real call. Everything is invented, and the
-- phones use the 07700 900xxx range that Ofcom reserves for fiction.
-- The visits are on November 28 and 29, so their alerts are still within the dashboard's 14 days during the demo
-- recording (December 1 to 3). They are COMPLETED, so the post-visit call check never calls them.

INSERT INTO phone_verification (id, purpose, phone_hash, vonage_request_id, status, check_attempts, created_at, verified_at)
OVERRIDING SYSTEM VALUE
VALUES
    (900019, 'VISIT', 'demo-seed-not-an-hmac-19', 'demo-seed-19', 'VERIFIED', 1, '2026-11-20 18:10+01', '2026-11-20 18:11+01'),
    (900020, 'VISIT', 'demo-seed-not-an-hmac-20', 'demo-seed-20', 'VERIFIED', 1, '2026-11-21 09:30+01', '2026-11-21 09:31+01')
ON CONFLICT (id) DO UPDATE
SET purpose = EXCLUDED.purpose,
    phone_hash = EXCLUDED.phone_hash,
    vonage_request_id = EXCLUDED.vonage_request_id,
    status = EXCLUDED.status,
    check_attempts = EXCLUDED.check_attempts,
    created_at = EXCLUDED.created_at,
    verified_at = EXCLUDED.verified_at;

INSERT INTO visit (id, property_id, visit_slot_id, phone_verification_id, visitor_name, visitor_phone, status,
    created_at, visitor_joined_at)
OVERRIDING SYSTEM VALUE
SELECT v.id, v.property_id, slot.id, v.phone_verification_id, v.visitor_name, v.visitor_phone, v.status,
       v.created_at, v.starts_at + INTERVAL '1 minute'
FROM (VALUES
    (900014, 6, TIMESTAMPTZ '2026-11-28 11:00 Europe/Madrid', 900019, 'Raquel Moreno', '+447700900114', 'COMPLETED', TIMESTAMPTZ '2026-11-20 18:12+01'),
    (900015, 10, TIMESTAMPTZ '2026-11-29 17:30 Europe/Madrid', 900020, 'Iván Prieto', '+447700900115', 'COMPLETED', TIMESTAMPTZ '2026-11-21 09:32+01')
) AS v (id, property_id, starts_at, phone_verification_id, visitor_name, visitor_phone, status, created_at)
JOIN visit_slot slot ON slot.property_id = v.property_id AND slot.starts_at = v.starts_at
ON CONFLICT (id) DO UPDATE
SET property_id = EXCLUDED.property_id,
    visit_slot_id = EXCLUDED.visit_slot_id,
    phone_verification_id = EXCLUDED.phone_verification_id,
    visitor_name = EXCLUDED.visitor_name,
    visitor_phone = EXCLUDED.visitor_phone,
    status = EXCLUDED.status,
    created_at = EXCLUDED.created_at,
    visitor_joined_at = EXCLUDED.visitor_joined_at;

-- The join above skips a visit whose slot doesn't exist, so stop here instead of loading fewer visits.
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM visit WHERE id IN (900014, 900015)) <> 2 THEN
        RAISE EXCEPTION 'Demo post-visit calls: a seeded visit has no matching visit slot';
    END IF;
END $$;

UPDATE visit_slot
SET status = 'BOOKED'
WHERE id IN (SELECT visit_slot_id FROM visit WHERE id IN (900014, 900015));

-- Each call was placed 15 minutes after its visit ended, and the visitor pressed 1 a minute later
INSERT INTO post_visit_call (id, visit_id, vonage_call_uuid, status, answer, created_at, answered_at)
OVERRIDING SYSTEM VALUE
VALUES
    (900001, 900014, 'demo-seed-call-01', 'ANSWERED', 'ASKED_FOR_MONEY', '2026-11-28 11:45+01', '2026-11-28 11:46:12+01'),
    (900002, 900015, 'demo-seed-call-02', 'ANSWERED', 'ASKED_FOR_MONEY', '2026-11-29 18:15+01', '2026-11-29 18:16:40+01')
ON CONFLICT (id) DO UPDATE
SET visit_id = EXCLUDED.visit_id,
    vonage_call_uuid = EXCLUDED.vonage_call_uuid,
    status = EXCLUDED.status,
    answer = EXCLUDED.answer,
    created_at = EXCLUDED.created_at,
    answered_at = EXCLUDED.answered_at;

SELECT setval(pg_get_serial_sequence('phone_verification', 'id'), (SELECT MAX(id) FROM phone_verification));
SELECT setval(pg_get_serial_sequence('visit', 'id'), (SELECT MAX(id) FROM visit));
SELECT setval(pg_get_serial_sequence('post_visit_call', 'id'), (SELECT MAX(id) FROM post_visit_call));
