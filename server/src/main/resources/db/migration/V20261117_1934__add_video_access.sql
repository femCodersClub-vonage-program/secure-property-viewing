ALTER TABLE visit ADD COLUMN video_session_id VARCHAR(255);

CREATE TABLE video_access (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    visit_id   BIGINT                   NOT NULL REFERENCES visit (id),
    role       VARCHAR(20)              NOT NULL CHECK (role IN ('VISITOR', 'GUEST')),
    token_hash VARCHAR(64)              NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX video_access_visit_id_idx ON video_access (visit_id);
CREATE UNIQUE INDEX video_access_one_visitor_per_visit_idx ON video_access (visit_id) WHERE role = 'VISITOR';
