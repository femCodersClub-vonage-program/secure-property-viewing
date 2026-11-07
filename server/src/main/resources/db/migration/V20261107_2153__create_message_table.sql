CREATE TABLE message (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visit_id           BIGINT                   REFERENCES visit (id),
    listing_request_id BIGINT                   REFERENCES listing_request (id),
    type               VARCHAR(20)              NOT NULL CHECK (type IN ('CONFIRMATION', 'REMINDER', 'STATUS_UPDATE')),
    channel            VARCHAR(20)              NOT NULL CHECK (channel IN ('SMS')),
    vonage_message_id  VARCHAR(255),
    status             VARCHAR(20)              NOT NULL CHECK (status IN ('SCHEDULED', 'SUBMITTED', 'DELIVERED', 'FAILED')),
    scheduled_at       TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CHECK (num_nonnulls(visit_id, listing_request_id) = 1)
);

CREATE INDEX message_visit_id_idx ON message (visit_id);
CREATE INDEX message_listing_request_id_idx ON message (listing_request_id);
