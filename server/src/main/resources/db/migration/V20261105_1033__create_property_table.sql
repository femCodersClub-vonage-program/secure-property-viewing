CREATE TABLE property (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agency_id             BIGINT                   NOT NULL REFERENCES agency (id),
    listing_request_id    BIGINT,
    title                 VARCHAR(255)             NOT NULL,
    operation             VARCHAR(20)              NOT NULL CHECK (operation IN ('RENT', 'SALE')),
    property_type         VARCHAR(20)              NOT NULL CHECK (property_type IN ('APARTMENT', 'HOUSE', 'STUDIO')),
    price_euros           INTEGER                  NOT NULL,
    area                  VARCHAR(100)             NOT NULL,
    address               VARCHAR(255)             NOT NULL,
    latitude              NUMERIC(9, 6),
    longitude             NUMERIC(9, 6),
    bedrooms              SMALLINT                 NOT NULL,
    size_m2               INTEGER                  NOT NULL,
    floor                 SMALLINT,
    description           TEXT                     NOT NULL,
    video_visit_available BOOLEAN                  NOT NULL,
    status                VARCHAR(20)              NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX property_agency_id_idx ON property (agency_id);
