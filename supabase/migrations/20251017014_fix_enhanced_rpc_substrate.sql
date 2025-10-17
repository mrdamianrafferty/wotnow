-- Fix enhanced RPC substrate reference
-- Correct the species.substrate_preference column error

DROP FUNCTION IF EXISTS get_environmental_predictions_enhanced(text, date, numeric, numeric, text, numeric, numeric, numeric);

-- Now the correct migration will be applied next
