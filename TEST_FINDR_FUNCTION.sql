-- Test if get_environmental_predictions_basic function exists and works
-- Run this in Supabase SQL Editor

-- 1. Check if function exists
SELECT 
  proname as function_name,
  prokind as kind,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'get_environmental_predictions_basic';

-- 2. Test with a known rectangle
SELECT * FROM get_environmental_predictions_basic('31F1', CURRENT_DATE) LIMIT 5;

-- 3. Check grants
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_environmental_predictions_basic';
