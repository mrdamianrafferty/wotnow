-- Optimize findr_prediction_sessions indexes for better cache performance
-- Analysis: Primary key (rectangle_code, prediction_date, language) already covers main query pattern
-- This migration removes redundant index and adds covering index for common queries

-- Drop the redundant fetched_at index since primary key covers the main query pattern
-- The query uses: .eq('rectangle_code').eq('prediction_date').eq('language').order('fetched_at')
-- Primary key handles the equality conditions, separate fetched_at ordering is minimal overhead
DROP INDEX IF EXISTS idx_findr_prediction_sessions_fetched_at;

-- Keep the expires_at index for cache cleanup queries
-- (Already exists from original migration, just documenting here)
-- CREATE INDEX IF NOT EXISTS idx_findr_prediction_sessions_expires_at ON findr_prediction_sessions (expires_at);

-- Add composite index for rectangle-based analytics and cleanup
-- Useful for: finding all cached predictions for a rectangle, grouped by date
CREATE INDEX IF NOT EXISTS idx_findr_prediction_sessions_rectangle_date
ON findr_prediction_sessions (rectangle_code, prediction_date DESC);

COMMENT ON INDEX idx_findr_prediction_sessions_rectangle_date IS 'Composite index for rectangle-based queries and analytics';
