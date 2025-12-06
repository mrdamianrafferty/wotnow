-- DATABASE CLEANUP SCRIPT
-- Run this in Supabase SQL Editor AFTER reviewing the analysis
-- https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql/new

-- ============================================
-- PHASE 1: DROP UNUSED TABLES (0 code references)
-- ============================================

-- These tables have no references in the codebase:
-- Only run after confirming they're truly unused!

-- 1. pressure_snapshots - appears to be an old/unused cache
-- DROP TABLE IF EXISTS pressure_snapshots;

-- 2. voucher_usage - no code references
-- DROP TABLE IF EXISTS voucher_usage;

-- 3. user_favourite_canonicalization_audit - old audit table
-- DROP TABLE IF EXISTS user_favourite_canonicalization_audit;

-- 4. Unused cache tables (functions may use them via database, check first)
-- These were created but the code now uses different approaches:
-- DROP TABLE IF EXISTS copernicus_cache;
-- DROP TABLE IF EXISTS biogeochemical_cache;
-- DROP TABLE IF EXISTS chlorophyll_cache;

-- 5. findr_conditions_snapshots - no code references
-- DROP TABLE IF EXISTS findr_conditions_snapshots;

-- ============================================
-- PHASE 2: CLEAN STALE CACHE DATA
-- ============================================

-- Delete old weather cache (older than 7 days)
DELETE FROM weather_cache WHERE created_at < NOW() - INTERVAL '7 days';

-- Delete old tide cache (older than 7 days)
DELETE FROM tide_cache WHERE created_at < NOW() - INTERVAL '7 days';

-- Delete old moon cache (older than 90 days - moon data is fairly static)
DELETE FROM moon_cache WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old translation cache (older than 90 days)
DELETE FROM translation_cache WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete old emodnet cache (older than 180 days - substrate data rarely changes)
DELETE FROM emodnet_cache WHERE created_at < NOW() - INTERVAL '180 days';

-- ============================================
-- PHASE 3: VACUUM TO RECLAIM SPACE
-- ============================================

-- After deleting data, run VACUUM to reclaim disk space
-- Note: VACUUM FULL requires exclusive lock, use during low-traffic periods
-- VACUUM FULL;

-- Or use regular VACUUM for less intrusive cleanup:
VACUUM ANALYZE;

-- ============================================
-- PHASE 4: CHECK RESULTS
-- ============================================

-- Re-run the size check:
SELECT pg_size_pretty(pg_database_size(current_database())) as total_db_size;

SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size('public.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size('public.'||tablename) DESC
LIMIT 20;
