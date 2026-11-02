-- Up Migration
-- EXPAND: add the new column, keep the old one. Nullable so v1 pods (which do not know it) can keep inserting.
ALTER TABLE students ADD COLUMN display_name text;

-- Down Migration
ALTER TABLE students DROP COLUMN display_name;
