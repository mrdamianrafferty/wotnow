-- Create findr_prediction_sessions table for caching prediction API responses
-- This reduces load on the expensive get_fishing_predictions RPC

CREATE TABLE IF NOT EXISTS findr_prediction_sessions (
  rectangle_code text NOT NULL,
  prediction_date date NOT NULL,
  language text NOT NULL DEFAULT 'en',
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  
  -- Composite primary key
  PRIMARY KEY (rectangle_code, prediction_date, language)
);

-- Index for cleanup by expiration
CREATE INDEX IF NOT EXISTS idx_findr_prediction_sessions_expires_at 
ON findr_prediction_sessions (expires_at);

-- Index for fetched_at ordering (used in cache reads)
CREATE INDEX IF NOT EXISTS idx_findr_prediction_sessions_fetched_at 
ON findr_prediction_sessions (rectangle_code, prediction_date, language, fetched_at DESC);

-- Add a comment describing the table
COMMENT ON TABLE findr_prediction_sessions IS 'Caches prediction API responses with TTL to reduce RPC load';