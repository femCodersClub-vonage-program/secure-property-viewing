CREATE TABLE listing_request (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    phone_verification_id BIGINT                   NOT NULL UNIQUE REFERENCES phone_verification (id),
    owner_full_name       VARCHAR(255)             NOT NULL,
    owner_phone           VARCHAR(20)              NOT NULL,
    title                 VARCHAR(255)             NOT NULL,
    description           TEXT                     NOT NULL,
    property_type         VARCHAR(20)              NOT NULL CHECK (property_type IN ('APARTMENT', 'HOUSE', 'STUDIO')),
    operation             VARCHAR(20)              NOT NULL CHECK (operation IN ('RENT', 'SALE')),
    area                  VARCHAR(100)             NOT NULL,
    address               VARCHAR(255)             NOT NULL,
    price_euros           INTEGER                  NOT NULL,
    bedrooms              SMALLINT                 NOT NULL,
    size_m2               INTEGER                  NOT NULL,
    floor                 SMALLINT,
    status                VARCHAR(20)              NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by           BIGINT                   REFERENCES agency_user (id),
    rejection_reason      TEXT,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMP WITH TIME ZONE
);

CREATE INDEX listing_request_reviewed_by_idx ON listing_request (reviewed_by);
