ALTER TABLE images
    DROP COLUMN IF EXISTS file_url;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_image_id BIGINT REFERENCES images(id) ON DELETE SET NULL;

UPDATE users
SET avatar_image_id = CAST(regexp_replace(avatar_url, '^.*/api/files/([0-9]+)$', '\\1') AS BIGINT)
WHERE avatar_image_id IS NULL
  AND avatar_url IS NOT NULL
  AND avatar_url ~ '^.*/api/files/[0-9]+$';

ALTER TABLE users
    DROP COLUMN IF EXISTS avatar_url;

ALTER TABLE organizations
    DROP COLUMN IF EXISTS logo_url;

CREATE INDEX IF NOT EXISTS idx_users_avatar_image_id
    ON users (avatar_image_id);
