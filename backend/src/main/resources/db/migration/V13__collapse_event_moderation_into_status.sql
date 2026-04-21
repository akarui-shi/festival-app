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

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint c
                 JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'events'
          AND c.conname = 'chk_events_status'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT chk_events_status;
    END IF;
END
$$;

UPDATE events
SET status = CASE
    WHEN moderation_status = 'на_рассмотрении' THEN 'на_рассмотрении'
    WHEN moderation_status = 'отклонено' AND status = 'черновик' THEN 'отклонено'
    WHEN moderation_status = 'одобрено' AND status = 'черновик' THEN 'опубликовано'
    ELSE status
END
WHERE moderation_status IS NOT NULL;

UPDATE events
SET status = CASE
    WHEN lower(status) IN ('draft') THEN 'черновик'
    WHEN lower(status) IN ('pending', 'pending_approval', 'on_moderation') THEN 'на_рассмотрении'
    WHEN lower(status) IN ('published') THEN 'опубликовано'
    WHEN lower(status) IN ('rejected') THEN 'отклонено'
    WHEN lower(status) IN ('archived') THEN 'завершено'
    WHEN lower(status) IN ('cancelled', 'canceled') THEN 'отменено'
    ELSE status
END;

ALTER TABLE events
    DROP COLUMN IF EXISTS moderation_status;

ALTER TABLE events
    ADD CONSTRAINT chk_events_status
        CHECK (status IN ('черновик', 'на_рассмотрении', 'опубликовано', 'отклонено', 'завершено', 'отменено'));
