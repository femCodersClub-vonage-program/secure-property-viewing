ALTER TABLE property
    ADD CONSTRAINT property_listing_request_id_fkey
        FOREIGN KEY (listing_request_id) REFERENCES listing_request (id);

ALTER TABLE property
    ADD CONSTRAINT property_listing_request_id_key
        UNIQUE (listing_request_id);
