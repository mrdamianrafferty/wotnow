-- Fix foreign key constraints to reference correct table
-- The original constraints referenced findr_rectangles which doesn't exist
-- They should reference ices_rectangles instead

-- Drop the broken foreign key constraints
ALTER TABLE findr_prediction_impressions
DROP CONSTRAINT IF EXISTS fk_prediction_impressions_rectangle;

ALTER TABLE findr_catch_entries
DROP CONSTRAINT IF EXISTS fk_catch_entries_rectangle;

ALTER TABLE findr_fishing_sessions
DROP CONSTRAINT IF EXISTS fk_fishing_sessions_rectangle;

-- Clean up orphaned records before adding correct foreign keys
-- Delete impressions with rectangle codes that don't exist in ices_rectangles
DELETE FROM findr_prediction_impressions
WHERE rectangle_code NOT IN (SELECT rectangle_code FROM ices_rectangles);

-- Delete catches with rectangle codes that don't exist in ices_rectangles
DELETE FROM findr_catch_entries
WHERE rectangle_code NOT IN (SELECT rectangle_code FROM ices_rectangles);

-- Delete sessions with rectangle codes that don't exist in ices_rectangles
DELETE FROM findr_fishing_sessions
WHERE rectangle_code NOT IN (SELECT rectangle_code FROM ices_rectangles);

-- Recreate foreign keys pointing to the correct ices_rectangles table
ALTER TABLE findr_prediction_impressions
ADD CONSTRAINT fk_prediction_impressions_rectangle
FOREIGN KEY (rectangle_code) REFERENCES ices_rectangles(rectangle_code)
ON DELETE CASCADE;

ALTER TABLE findr_catch_entries
ADD CONSTRAINT fk_catch_entries_rectangle
FOREIGN KEY (rectangle_code) REFERENCES ices_rectangles(rectangle_code)
ON DELETE CASCADE;

ALTER TABLE findr_fishing_sessions
ADD CONSTRAINT fk_fishing_sessions_rectangle
FOREIGN KEY (rectangle_code) REFERENCES ices_rectangles(rectangle_code)
ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_prediction_impressions_rectangle ON findr_prediction_impressions
IS 'Ensures rectangle_code exists in ices_rectangles table';

COMMENT ON CONSTRAINT fk_catch_entries_rectangle ON findr_catch_entries
IS 'Ensures rectangle_code exists in ices_rectangles table';

COMMENT ON CONSTRAINT fk_fishing_sessions_rectangle ON findr_fishing_sessions
IS 'Ensures rectangle_code exists in ices_rectangles table';
