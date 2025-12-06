-- Run this in Supabase SQL Editor to analyze database size
-- Go to: https://supabase.com/dashboard/project/swmviqpxetwziqxhzldh/sql/new

-- 1. Overall database size
SELECT pg_size_pretty(pg_database_size(current_database())) as total_db_size;

-- 2. Table sizes (largest first) - using quoted identifiers to avoid cross-schema issues
SELECT 
    t.tablename,
    pg_size_pretty(pg_total_relation_size('"public"."' || t.tablename || '"')) as total_size,
    pg_size_pretty(pg_relation_size('"public"."' || t.tablename || '"')) as table_size
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY pg_total_relation_size('"public"."' || t.tablename || '"') DESC
LIMIT 30;

-- 3. Row counts for each table
SELECT 
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- 4. Tables that appear unused (0 references in codebase analysis):
-- - pressure_snapshots
-- - voucher_usage  
-- - user_favourite_canonicalization_audit
-- - findr_conditions_snapshots
-- - copernicus_cache
-- - biogeochemical_cache
-- - chlorophyll_cache

-- 5. Check if these tables have any data:
SELECT 'pressure_snapshots' as table_name, count(*) as row_count FROM pressure_snapshots
UNION ALL
SELECT 'voucher_usage', count(*) FROM voucher_usage
UNION ALL
SELECT 'user_favourite_canonicalization_audit', count(*) FROM user_favourite_canonicalization_audit
UNION ALL
SELECT 'copernicus_cache', count(*) FROM copernicus_cache
UNION ALL
SELECT 'biogeochemical_cache', count(*) FROM biogeochemical_cache
UNION ALL
SELECT 'chlorophyll_cache', count(*) FROM chlorophyll_cache;

-- 6. Check cache tables that might have stale data:
SELECT 'moon_cache' as table_name, count(*) as total, 
       count(*) FILTER (WHERE created_at < NOW() - INTERVAL '30 days') as older_than_30_days
FROM moon_cache
UNION ALL
SELECT 'weather_cache', count(*), 
       count(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days')
FROM weather_cache
UNION ALL
SELECT 'tide_cache', count(*), 
       count(*) FILTER (WHERE created_at < NOW() - INTERVAL '7 days')
FROM tide_cache
UNION ALL
SELECT 'emodnet_cache', count(*), 
       count(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days')
FROM emodnet_cache
UNION ALL
SELECT 'translation_cache', count(*), 
       count(*) FILTER (WHERE created_at < NOW() - INTERVAL '90 days')
FROM translation_cache;
