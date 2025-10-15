-- Migration: Create Copernicus Ingestion Monitoring Tables
--
-- This migration creates tables for tracking ingestion health, failures, and alerts.
-- Enables monitoring dashboard and automated failure detection.
--
-- To deploy: Run this in Supabase SQL Editor

-- Table for storing ingestion run logs
CREATE TABLE IF NOT EXISTS copernicus_ingestion_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  target_date DATE NOT NULL,
  success_rate NUMERIC(5,2) NOT NULL,
  total_rectangles INT NOT NULL,
  successful INT NOT NULL,
  failed INT NOT NULL,
  partial INT NOT NULL DEFAULT 0,
  duration_minutes INT NOT NULL,
  errors JSONB DEFAULT '[]'::jsonb,
  warnings JSONB DEFAULT '[]'::jsonb,
  alert_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX idx_copernicus_logs_timestamp ON copernicus_ingestion_logs(timestamp DESC);
CREATE INDEX idx_copernicus_logs_success_rate ON copernicus_ingestion_logs(success_rate);
CREATE INDEX idx_copernicus_logs_target_date ON copernicus_ingestion_logs(target_date DESC);

-- Table for tracking rectangle-level coverage and health
CREATE TABLE IF NOT EXISTS copernicus_rectangle_health (
  rectangle_code TEXT PRIMARY KEY,
  last_successful_ingestion TIMESTAMPTZ,
  last_failed_ingestion TIMESTAMPTZ,
  consecutive_failures INT DEFAULT 0,
  total_ingestions INT DEFAULT 0,
  successful_ingestions INT DEFAULT 0,
  average_variables_retrieved NUMERIC(3,1),
  typical_data_quality TEXT CHECK (typical_data_quality IN ('good', 'partial', 'poor')),
  has_copernicus_coverage BOOLEAN DEFAULT TRUE,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for monitoring
CREATE INDEX idx_rectangle_health_failures ON copernicus_rectangle_health(consecutive_failures DESC) 
WHERE consecutive_failures > 0;

CREATE INDEX idx_rectangle_health_last_success ON copernicus_rectangle_health(last_successful_ingestion DESC);

-- Table for alert history
CREATE TABLE IF NOT EXISTS copernicus_alerts (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_success_rate', 'critical_failure', 'no_updates', 'api_error')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_method TEXT, -- 'email', 'slack', 'both'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for alert management
CREATE INDEX idx_copernicus_alerts_timestamp ON copernicus_alerts(timestamp DESC);
CREATE INDEX idx_copernicus_alerts_unresolved ON copernicus_alerts(timestamp DESC) 
WHERE resolved = FALSE;

-- Function to update rectangle health after each ingestion
CREATE OR REPLACE FUNCTION update_rectangle_health(
  p_rectangle_code TEXT,
  p_success BOOLEAN,
  p_variables_retrieved INT,
  p_data_quality TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO copernicus_rectangle_health (
    rectangle_code,
    last_successful_ingestion,
    last_failed_ingestion,
    consecutive_failures,
    total_ingestions,
    successful_ingestions,
    average_variables_retrieved,
    typical_data_quality,
    updated_at
  ) VALUES (
    p_rectangle_code,
    CASE WHEN p_success THEN NOW() ELSE NULL END,
    CASE WHEN NOT p_success THEN NOW() ELSE NULL END,
    CASE WHEN NOT p_success THEN 1 ELSE 0 END,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    p_variables_retrieved,
    p_data_quality,
    NOW()
  )
  ON CONFLICT (rectangle_code) DO UPDATE SET
    last_successful_ingestion = CASE 
      WHEN p_success THEN NOW() 
      ELSE copernicus_rectangle_health.last_successful_ingestion 
    END,
    last_failed_ingestion = CASE 
      WHEN NOT p_success THEN NOW() 
      ELSE copernicus_rectangle_health.last_failed_ingestion 
    END,
    consecutive_failures = CASE 
      WHEN p_success THEN 0 
      ELSE copernicus_rectangle_health.consecutive_failures + 1 
    END,
    total_ingestions = copernicus_rectangle_health.total_ingestions + 1,
    successful_ingestions = copernicus_rectangle_health.successful_ingestions + 
      CASE WHEN p_success THEN 1 ELSE 0 END,
    average_variables_retrieved = (
      (copernicus_rectangle_health.average_variables_retrieved * copernicus_rectangle_health.total_ingestions + p_variables_retrieved) /
      (copernicus_rectangle_health.total_ingestions + 1)
    ),
    typical_data_quality = p_data_quality,
    updated_at = NOW();
END;
$$;

-- Function to check for stale data (no updates in 48 hours)
CREATE OR REPLACE FUNCTION check_for_stale_data()
RETURNS TABLE (
  rectangle_code TEXT,
  last_update TIMESTAMPTZ,
  hours_since_update NUMERIC
)
LANGUAGE sql
AS $$
  SELECT 
    rectangle_code,
    last_successful_ingestion,
    EXTRACT(EPOCH FROM (NOW() - last_successful_ingestion)) / 3600 as hours_since_update
  FROM copernicus_rectangle_health
  WHERE last_successful_ingestion < NOW() - INTERVAL '48 hours'
    AND has_copernicus_coverage = TRUE
  ORDER BY last_successful_ingestion ASC;
$$;

-- Function to get health summary
CREATE OR REPLACE FUNCTION get_copernicus_health_summary()
RETURNS TABLE (
  metric TEXT,
  value NUMERIC,
  status TEXT
)
LANGUAGE sql
AS $$
  SELECT 'total_rectangles', COUNT(*)::numeric, 'info' FROM copernicus_rectangle_health
  UNION ALL
  SELECT 'rectangles_with_data', 
         COUNT(*)::numeric, 
         'info' 
  FROM copernicus_rectangle_health 
  WHERE last_successful_ingestion IS NOT NULL
  UNION ALL
  SELECT 'rectangles_failing', 
         COUNT(*)::numeric,
         CASE WHEN COUNT(*) > 10 THEN 'critical' WHEN COUNT(*) > 5 THEN 'warning' ELSE 'info' END
  FROM copernicus_rectangle_health 
  WHERE consecutive_failures > 3
  UNION ALL
  SELECT 'rectangles_stale_48h', 
         COUNT(*)::numeric,
         CASE WHEN COUNT(*) > 20 THEN 'critical' WHEN COUNT(*) > 10 THEN 'warning' ELSE 'info' END
  FROM copernicus_rectangle_health 
  WHERE last_successful_ingestion < NOW() - INTERVAL '48 hours'
    AND has_copernicus_coverage = TRUE
  UNION ALL
  SELECT 'average_success_rate_7d',
         AVG(success_rate),
         CASE WHEN AVG(success_rate) < 50 THEN 'critical' 
              WHEN AVG(success_rate) < 80 THEN 'warning' 
              ELSE 'info' END
  FROM copernicus_ingestion_logs
  WHERE timestamp > NOW() - INTERVAL '7 days'
  UNION ALL
  SELECT 'unresolved_alerts',
         COUNT(*)::numeric,
         CASE WHEN COUNT(*) > 5 THEN 'critical' WHEN COUNT(*) > 2 THEN 'warning' ELSE 'info' END
  FROM copernicus_alerts
  WHERE resolved = FALSE;
$$;

-- Create view for monitoring dashboard
CREATE OR REPLACE VIEW copernicus_dashboard_summary AS
SELECT
  -- Latest ingestion stats
  (SELECT timestamp FROM copernicus_ingestion_logs ORDER BY timestamp DESC LIMIT 1) as last_run,
  (SELECT success_rate FROM copernicus_ingestion_logs ORDER BY timestamp DESC LIMIT 1) as last_success_rate,
  (SELECT AVG(success_rate) FROM copernicus_ingestion_logs WHERE timestamp > NOW() - INTERVAL '7 days') as avg_success_rate_7d,
  (SELECT AVG(success_rate) FROM copernicus_ingestion_logs WHERE timestamp > NOW() - INTERVAL '30 days') as avg_success_rate_30d,
  
  -- Rectangle health
  (SELECT COUNT(*) FROM copernicus_rectangle_health WHERE last_successful_ingestion > NOW() - INTERVAL '24 hours') as rectangles_updated_24h,
  (SELECT COUNT(*) FROM copernicus_rectangle_health WHERE consecutive_failures > 3) as rectangles_failing,
  (SELECT COUNT(*) FROM copernicus_rectangle_health WHERE last_successful_ingestion < NOW() - INTERVAL '48 hours' AND has_copernicus_coverage = TRUE) as rectangles_stale,
  
  -- Alert status
  (SELECT COUNT(*) FROM copernicus_alerts WHERE resolved = FALSE) as unresolved_alerts,
  (SELECT COUNT(*) FROM copernicus_alerts WHERE timestamp > NOW() - INTERVAL '24 hours') as alerts_24h;

-- Grant permissions
GRANT SELECT ON copernicus_ingestion_logs TO anon, authenticated;
GRANT INSERT ON copernicus_ingestion_logs TO authenticated;
GRANT SELECT ON copernicus_rectangle_health TO anon, authenticated;
GRANT SELECT ON copernicus_alerts TO anon, authenticated;
GRANT SELECT ON copernicus_dashboard_summary TO anon, authenticated;

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE copernicus_ingestion_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE copernicus_rectangle_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE copernicus_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read monitoring data (it's not sensitive)
CREATE POLICY "Allow public read access to ingestion logs"
  ON copernicus_ingestion_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to rectangle health"
  ON copernicus_rectangle_health FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to alerts"
  ON copernicus_alerts FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add helpful comments
COMMENT ON TABLE copernicus_ingestion_logs IS 'Tracks each daily ingestion run with success rates and errors';
COMMENT ON TABLE copernicus_rectangle_health IS 'Monitors per-rectangle ingestion health and coverage';
COMMENT ON TABLE copernicus_alerts IS 'Records alerts sent about ingestion failures and issues';
COMMENT ON FUNCTION check_for_stale_data IS 'Identifies rectangles without updates in 48+ hours';
COMMENT ON FUNCTION get_copernicus_health_summary IS 'Returns overall health metrics for monitoring dashboard';
COMMENT ON VIEW copernicus_dashboard_summary IS 'Real-time summary of Copernicus ingestion system health';
