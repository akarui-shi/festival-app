ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(1024);

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS logo_url VARCHAR(1024);

CREATE TABLE IF NOT EXISTS organization_join_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    decision_comment TEXT,
    CONSTRAINT chk_org_join_requests_status
        CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_org_join_requests_org_status
    ON organization_join_requests (organization_id, status);

CREATE INDEX IF NOT EXISTS idx_org_join_requests_user_status
    ON organization_join_requests (user_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS uq_org_join_requests_user_org_pending
    ON organization_join_requests (user_id, organization_id)
    WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS administrative_actions (
    id BIGSERIAL PRIMARY KEY,
    admin_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id BIGINT,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_actions_created_at
    ON administrative_actions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin_id
    ON administrative_actions (admin_id);
