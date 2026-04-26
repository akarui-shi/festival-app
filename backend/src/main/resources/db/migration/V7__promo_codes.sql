CREATE TABLE promo_codes (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(50)    NOT NULL,
    discount_type   VARCHAR(20)    NOT NULL, -- PERCENT | FIXED | FREE
    discount_value  NUMERIC(10,2)  NOT NULL DEFAULT 0,
    max_usages      INTEGER,
    usage_count     INTEGER        NOT NULL DEFAULT 0,
    expires_at      TIMESTAMPTZ,
    organization_id BIGINT         REFERENCES organizations(id) ON DELETE SET NULL,
    active          BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_promo_code UNIQUE (code)
);
CREATE INDEX idx_promo_codes_org ON promo_codes(organization_id);
