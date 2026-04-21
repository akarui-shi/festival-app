DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
                 JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'events'
          AND c.conname = 'chk_events_moderation_status'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT chk_events_moderation_status;
    END IF;
END
$$;

ALTER TABLE events
    ALTER COLUMN moderation_status DROP NOT NULL,
    ALTER COLUMN moderation_status DROP DEFAULT;

UPDATE events
SET moderation_status = NULL
WHERE moderation_status IS NOT NULL
  AND btrim(lower(moderation_status)) IN ('', 'черновик', 'draft', 'не_отправлено', 'not_sent');

ALTER TABLE events
    ADD CONSTRAINT chk_events_moderation_status
        CHECK (moderation_status IS NULL OR moderation_status IN ('на_рассмотрении', 'одобрено', 'отклонено'));
