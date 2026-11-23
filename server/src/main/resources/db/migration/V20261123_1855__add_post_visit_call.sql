ALTER TABLE visit ADD COLUMN visitor_joined_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE post_visit_call (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visit_id         BIGINT                   NOT NULL UNIQUE REFERENCES visit (id),
    vonage_call_uuid VARCHAR(64) UNIQUE,
    status           VARCHAR(20)              NOT NULL
        CHECK (status IN ('CALLING', 'ANSWERED', 'NOT_REACHED', 'FAILED', 'SKIPPED')),
    answer           VARCHAR(20) CHECK (answer IN ('ASKED_FOR_MONEY', 'NOT_ASKED')),
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    answered_at      TIMESTAMP WITH TIME ZONE
);

-- The agency dashboard reads the recent answers that raised an alert
CREATE INDEX post_visit_call_alert_idx ON post_visit_call (answered_at) WHERE answer = 'ASKED_FOR_MONEY';
