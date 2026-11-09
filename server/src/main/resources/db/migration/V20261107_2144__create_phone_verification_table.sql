CREATE TABLE phone_verification (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    purpose           VARCHAR(20)              NOT NULL CHECK (purpose IN ('VISIT', 'LISTING_REQUEST')),
    phone_hash        VARCHAR(255)             NOT NULL,
    vonage_request_id VARCHAR(255)             NOT NULL,
    status            VARCHAR(20)              NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')),
    check_attempts    SMALLINT                 NOT NULL DEFAULT 0 CHECK (check_attempts >= 0),
    created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    verified_at       TIMESTAMP WITH TIME ZONE
);

CREATE INDEX phone_verification_phone_hash_created_at_idx ON phone_verification (phone_hash, created_at);
