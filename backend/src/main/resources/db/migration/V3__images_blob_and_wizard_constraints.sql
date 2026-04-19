ALTER TABLE images
    ADD COLUMN IF NOT EXISTS file_data BYTEA;

CREATE INDEX IF NOT EXISTS idx_images_uploaded_by_user_id
    ON images (uploaded_by_user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_images_single_primary
    ON event_images (event_id)
    WHERE is_primary = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_artist_images_single_primary
    ON artist_images (artist_id)
    WHERE is_primary = TRUE;
