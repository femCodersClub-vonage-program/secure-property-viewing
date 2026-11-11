INSERT INTO agency (id, name, email, phone, verified)
OVERRIDING SYSTEM VALUE
VALUES (1, 'Peephole Demo Agency', 'agency@peephole.example', '+34000000000', TRUE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    verified = EXCLUDED.verified;

INSERT INTO agency_user (id, agency_id, full_name, email, password_hash, role)
OVERRIDING SYSTEM VALUE
VALUES
    (1, 1, 'Ana Demo', 'admin@peephole.example', '$2b$12$daJlFafDRt3RZSzjRQ9e5O/TwlfEw5iOBq87m.uu6hMreecx1Fdsm',
    'ADMIN'),
    (2, 1, 'Maria Demo', 'agent@peephole.example', '$2b$12$daJlFafDRt3RZSzjRQ9e5O/TwlfEw5iOBq87m.uu6hMreecx1Fdsm',
    'AGENT')
ON CONFLICT (id) DO UPDATE
SET agency_id = EXCLUDED.agency_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

SELECT setval(pg_get_serial_sequence('agency', 'id'), (SELECT MAX(id) FROM agency));
SELECT setval(pg_get_serial_sequence('agency_user', 'id'), (SELECT MAX(id) FROM agency_user));
