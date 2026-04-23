ALTER TABLE users
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN pending_email VARCHAR(255);

ALTER TABLE users
    ADD CONSTRAINT uq_users_pending_email UNIQUE (pending_email);

CREATE TABLE email_verification_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(120) NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    target_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_email_verification_tokens_token UNIQUE (token),
    CONSTRAINT chk_email_verification_tokens_purpose
        CHECK (purpose IN ('REGISTER', 'CHANGE_EMAIL'))
);

CREATE INDEX idx_email_verification_tokens_user_purpose_used
    ON email_verification_tokens(user_id, purpose, used_at);
