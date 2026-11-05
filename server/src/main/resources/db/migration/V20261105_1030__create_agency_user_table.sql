CREATE TABLE agency_user (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id     BIGINT                   NOT NULL REFERENCES agency (id),
    full_name     VARCHAR(255)             NOT NULL,
    email         VARCHAR(255)             NOT NULL,
    password_hash VARCHAR(255)             NOT NULL,
    role          VARCHAR(20)              NOT NULL CHECK (role IN ('ADMIN', 'AGENT')),
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX agency_user_agency_id_idx ON agency_user (agency_id);
