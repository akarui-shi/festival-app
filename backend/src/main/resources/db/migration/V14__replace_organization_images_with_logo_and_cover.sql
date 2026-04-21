ALTER TABLE organizations
    ADD COLUMN logo_image_id BIGINT,
    ADD COLUMN cover_image_id BIGINT;

UPDATE organizations AS o
SET logo_image_id = (
    SELECT oi.image_id
    FROM organization_images oi
    WHERE oi.organization_id = o.id
      AND oi.is_logo = TRUE
    ORDER BY oi.id ASC
    LIMIT 1
)
WHERE o.logo_image_id IS NULL;

UPDATE organizations AS o
SET cover_image_id = (
    SELECT oi.image_id
    FROM organization_images oi
    WHERE oi.organization_id = o.id
      AND oi.is_logo = FALSE
    ORDER BY oi.id ASC
    LIMIT 1
)
WHERE o.cover_image_id IS NULL;

UPDATE organizations
SET cover_image_id = COALESCE(cover_image_id, logo_image_id)
WHERE cover_image_id IS NULL;

ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_logo_image
        FOREIGN KEY (logo_image_id) REFERENCES images (id) ON DELETE SET NULL;

ALTER TABLE organizations
    ADD CONSTRAINT fk_organizations_cover_image
        FOREIGN KEY (cover_image_id) REFERENCES images (id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_logo_image_id
    ON organizations (logo_image_id);

CREATE INDEX idx_organizations_cover_image_id
    ON organizations (cover_image_id);

DROP TABLE organization_images;
