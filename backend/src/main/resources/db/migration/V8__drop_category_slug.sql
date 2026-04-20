ALTER TABLE categories DROP COLUMN IF EXISTS slug;
DROP INDEX IF EXISTS idx_categories_slug;
ALTER TABLE categories DROP CONSTRAINT IF EXISTS uq_categories_slug;
