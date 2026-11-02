-- Up Migration
-- BACKFILL: populate the new column from existing rows. On a large table do this in batches
-- (for example 10000 rows at a time) from a Job, not in one statement, to avoid long locks.
UPDATE students SET display_name = full_name WHERE display_name IS NULL;

-- Down Migration
-- Nothing to undo: display_name is dropped by the expand migration's down step.
SELECT 1;
