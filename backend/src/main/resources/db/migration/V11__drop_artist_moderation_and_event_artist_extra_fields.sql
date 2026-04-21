DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
                 JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'artists'
          AND c.conname = 'chk_artists_moderation_status'
    ) THEN
        ALTER TABLE artists DROP CONSTRAINT chk_artists_moderation_status;
    END IF;
END
$$;

ALTER TABLE artists
    DROP COLUMN IF EXISTS moderation_status;

ALTER TABLE event_artists
    DROP COLUMN IF EXISTS event_role,
    DROP COLUMN IF EXISTS display_order;
