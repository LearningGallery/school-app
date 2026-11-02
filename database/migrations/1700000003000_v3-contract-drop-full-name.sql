-- Up Migration
-- CONTRACT: run only after EVERY application version that reads or writes full_name is gone.
-- Dropping it earlier breaks those versions immediately, and breaks rolling back to them.
UPDATE students SET display_name = full_name WHERE display_name IS NULL; -- last safety net for rows v1 wrote after the backfill
ALTER TABLE students ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE students DROP COLUMN full_name;

-- Down Migration
-- Structure only: the old column comes back filled from display_name. Anything that depended on it must be redeployed.
ALTER TABLE students ADD COLUMN full_name text;
UPDATE students SET full_name = display_name;
ALTER TABLE students ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE students ALTER COLUMN display_name DROP NOT NULL;
