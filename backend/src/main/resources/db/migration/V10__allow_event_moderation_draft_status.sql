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
    ADD CONSTRAINT chk_events_moderation_status
        CHECK (moderation_status IN ('черновик', 'на_рассмотрении', 'одобрено', 'отклонено'));
