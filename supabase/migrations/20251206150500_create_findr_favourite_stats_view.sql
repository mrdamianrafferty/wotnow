-- Migration: Create findr_favourite_stats view for aggregating catch statistics
-- Purpose: Provide real-time favourite species insights from catch data
-- Date: 2025-12-06

-- Drop view if it exists (for rerunning migration)
DROP VIEW IF EXISTS findr_favourite_stats;

-- Create view aggregating catch statistics by species
-- Note: findr_catch_entries.species_id stores species_code (TEXT)
-- while user_favourites.species_id stores species UUID
-- We need to join through the species table to match them
CREATE VIEW findr_favourite_stats AS
WITH catch_stats_by_code AS (
  SELECT
    species_id AS species_code,  -- This is actually species_code (TEXT)
    COUNT(*) AS catches_total,
    MAX(caught_at) AS last_catch_at,
    -- Most frequently used bait
    MODE() WITHIN GROUP (ORDER BY bait_used) AS preferred_bait,
    -- Recency score: days since last catch (0-100, where 100 is most recent)
    CASE
      WHEN MAX(caught_at) IS NULL THEN 0
      WHEN EXTRACT(EPOCH FROM (NOW() - MAX(caught_at))) / 86400 < 7 THEN 100
      WHEN EXTRACT(EPOCH FROM (NOW() - MAX(caught_at))) / 86400 < 14 THEN 80
      WHEN EXTRACT(EPOCH FROM (NOW() - MAX(caught_at))) / 86400 < 30 THEN 60
      WHEN EXTRACT(EPOCH FROM (NOW() - MAX(caught_at))) / 86400 < 90 THEN 40
      ELSE 20
    END AS recency_score
  FROM findr_catch_entries
  WHERE is_blank_trip IS NOT TRUE  -- Exclude blank trips from stats
  GROUP BY species_id
),
favourite_dates AS (
  SELECT
    species_id,  -- This is UUID
    MIN(added_at) AS swiped_at
  FROM user_favourites
  GROUP BY species_id
)
SELECT
  sp.id AS species_id,  -- Return UUID for API compatibility
  cs.catches_total,
  -- Format swiped date as relative label
  CASE
    WHEN fd.swiped_at IS NULL THEN NULL
    WHEN EXTRACT(EPOCH FROM (NOW() - fd.swiped_at)) / 86400 < 1 THEN 'Today'
    WHEN EXTRACT(EPOCH FROM (NOW() - fd.swiped_at)) / 86400 < 2 THEN 'Yesterday'
    WHEN EXTRACT(EPOCH FROM (NOW() - fd.swiped_at)) / 86400 < 7 THEN 'This week'
    WHEN EXTRACT(EPOCH FROM (NOW() - fd.swiped_at)) / 86400 < 30 THEN 'This month'
    WHEN EXTRACT(EPOCH FROM (NOW() - fd.swiped_at)) / 86400 < 90 THEN 'Recently'
    ELSE 'A while ago'
  END AS swiped_date_label,
  -- last_perfect_conditions: not implemented yet, will require weather correlation
  NULL::TEXT AS last_perfect_conditions,
  -- Recent activity label based on catch frequency
  CASE
    WHEN cs.catches_total IS NULL OR cs.catches_total = 0 THEN 'No catches yet'
    WHEN cs.recency_score >= 80 THEN 'Very active'
    WHEN cs.recency_score >= 60 THEN 'Active'
    WHEN cs.recency_score >= 40 THEN 'Moderate'
    ELSE 'Low activity'
  END AS recent_activity,
  -- next_best_day: prediction feature, not implemented yet
  NULL::TEXT AS next_best_day,
  cs.preferred_bait,
  -- Season label based on current catches vs historical average
  CASE
    WHEN cs.catches_total IS NULL OR cs.catches_total = 0 THEN 'No data'
    WHEN cs.recency_score >= 80 THEN 'Hot right now'
    WHEN cs.recency_score >= 60 THEN 'In the mood'
    ELSE 'Off season'
  END AS season_label,
  cs.recency_score
FROM species sp
LEFT JOIN catch_stats_by_code cs ON sp.species_code = cs.species_code
LEFT JOIN favourite_dates fd ON sp.id = fd.species_id
WHERE fd.species_id IS NOT NULL OR cs.species_code IS NOT NULL;  -- Only include species with data

-- Add comment explaining the view
COMMENT ON VIEW findr_favourite_stats IS
  'Aggregates catch statistics by species for favourites insights. Automatically updates based on findr_catch_entries and user_favourites tables.';

-- Grant access to authenticated users
GRANT SELECT ON findr_favourite_stats TO authenticated;
GRANT SELECT ON findr_favourite_stats TO anon;
