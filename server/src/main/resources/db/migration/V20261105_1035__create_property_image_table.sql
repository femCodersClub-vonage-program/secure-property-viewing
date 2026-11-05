CREATE TABLE property_image (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    property_id BIGINT       NOT NULL REFERENCES property (id),
    url         VARCHAR(500) NOT NULL,
    alt_text    VARCHAR(500) NOT NULL CHECK (btrim(alt_text) <> ''),
    position    SMALLINT     NOT NULL
);

CREATE INDEX property_image_property_id_idx ON property_image (property_id);
