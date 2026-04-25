CREATE TABLE IF NOT EXISTS session_waitlist (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notified_at TIMESTAMPTZ,
    UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_session ON session_waitlist(session_id, status, created_at);
