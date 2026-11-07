CREATE TABLE visit (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    property_id           BIGINT                   NOT NULL REFERENCES property (id),
    visit_slot_id         BIGINT                   NOT NULL UNIQUE REFERENCES visit_slot (id),
    phone_verification_id BIGINT                   NOT NULL UNIQUE REFERENCES phone_verification (id),
    visitor_name          VARCHAR(255)             NOT NULL,
    visitor_phone         VARCHAR(20)              NOT NULL,
    status                VARCHAR(20)              NOT NULL CHECK (status IN ('CONFIRMED', 'CANCELED', 'COMPLETED')),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX visit_property_id_idx ON visit (property_id);
