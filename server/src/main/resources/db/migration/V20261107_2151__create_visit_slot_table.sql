CREATE TABLE visit_slot (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    property_id BIGINT                   NOT NULL REFERENCES property (id),
    starts_at   TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at     TIMESTAMP WITH TIME ZONE NOT NULL,
    status      VARCHAR(20)              NOT NULL CHECK (status IN ('AVAILABLE', 'BOOKED')),
    CHECK (ends_at > starts_at)
);

CREATE INDEX visit_slot_property_id_starts_at_idx ON visit_slot (property_id, starts_at);
