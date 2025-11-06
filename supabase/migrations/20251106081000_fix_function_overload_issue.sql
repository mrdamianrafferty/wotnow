-- Fix function overload issue by keeping only the 10-parameter Phase 2 version
-- with biogeographic region fix
-- Date: 2025-11-06 08:10

-- Drop the 8-parameter version that was just created
DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced(text, date, numeric, numeric, text, numeric, numeric, numeric) CASCADE;

-- The 10-parameter version (with tide/flow from Phase 2) should now be the only one
-- and it already has the biogeographic region fix from the previous migration
