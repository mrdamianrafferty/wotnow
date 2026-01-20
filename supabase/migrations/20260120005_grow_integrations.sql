-- ============================================================================
-- GROW DAISY INTEGRATIONS
-- ============================================================================
-- Database schema for third-party service integrations.
-- Supports weather stations, smart irrigation, and soil sensors.
--
-- Created: 2026-01-20
-- ============================================================================

-- =============================================================================
-- USER INTEGRATIONS TABLE
-- =============================================================================
-- Stores user connections to external services

CREATE TABLE IF NOT EXISTS public.grow_user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Integration type
  provider TEXT NOT NULL,  -- 'tempest', 'ambient_weather', 'rachio', 'ecowitt', etc.
  provider_name TEXT NOT NULL,  -- Display name for UI

  -- Connection details (encrypted tokens stored separately)
  external_id TEXT,  -- Provider's user/device ID
  device_id TEXT,    -- Specific device ID if applicable
  device_name TEXT,  -- User-friendly device name

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'disconnected')),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',  -- Provider-specific config

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique per user per provider per device
  UNIQUE(user_id, provider, device_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_integrations_user ON public.grow_user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_integrations_provider ON public.grow_user_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_grow_integrations_status ON public.grow_user_integrations(status);

-- RLS policies
ALTER TABLE public.grow_user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own integrations" ON public.grow_user_integrations;
CREATE POLICY "Users can manage own integrations"
  ON public.grow_user_integrations FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all integrations" ON public.grow_user_integrations;
CREATE POLICY "Service role can manage all integrations"
  ON public.grow_user_integrations FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- INTEGRATION TOKENS TABLE (Encrypted)
-- =============================================================================
-- Stores OAuth tokens and API keys securely

CREATE TABLE IF NOT EXISTS public.grow_integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.grow_user_integrations(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Token data (should be encrypted at application level)
  access_token TEXT,
  refresh_token TEXT,
  api_key TEXT,

  -- Token metadata
  token_type TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS - Only service role can access tokens
ALTER TABLE public.grow_integration_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for tokens" ON public.grow_integration_tokens;
CREATE POLICY "Service role only for tokens"
  ON public.grow_integration_tokens FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- WEATHER STATION DATA TABLE
-- =============================================================================
-- Cached data from connected weather stations

CREATE TABLE IF NOT EXISTS public.grow_weather_station_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.grow_user_integrations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Observation time
  observed_at TIMESTAMPTZ NOT NULL,

  -- Temperature readings
  air_temp_c NUMERIC(5,2),
  feels_like_c NUMERIC(5,2),
  dew_point_c NUMERIC(5,2),

  -- Humidity
  humidity_percent NUMERIC(5,2),

  -- Wind
  wind_speed_ms NUMERIC(5,2),
  wind_gust_ms NUMERIC(5,2),
  wind_direction_deg INTEGER,

  -- Precipitation
  rain_rate_mm_hr NUMERIC(6,2),
  rain_daily_mm NUMERIC(6,2),
  rain_weekly_mm NUMERIC(6,2),

  -- Pressure
  pressure_mb NUMERIC(6,2),
  pressure_trend TEXT,  -- 'rising', 'falling', 'steady'

  -- Solar/UV
  solar_radiation_wm2 NUMERIC(6,1),
  uv_index NUMERIC(4,2),

  -- Lightning (Tempest specific)
  lightning_count INTEGER,
  lightning_avg_distance_km NUMERIC(5,2),

  -- Battery/Status
  battery_percent INTEGER,
  signal_quality INTEGER,

  -- Raw data for debugging
  raw_data JSONB,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_weather_station_user ON public.grow_weather_station_data(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_weather_station_integration ON public.grow_weather_station_data(integration_id);
CREATE INDEX IF NOT EXISTS idx_grow_weather_station_observed ON public.grow_weather_station_data(observed_at DESC);

-- Partition hint: Consider partitioning by observed_at for large datasets
-- CREATE INDEX IF NOT EXISTS idx_grow_weather_station_observed_brin ON public.grow_weather_station_data USING BRIN (observed_at);

-- RLS policies
ALTER TABLE public.grow_weather_station_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own weather station data" ON public.grow_weather_station_data;
CREATE POLICY "Users can view own weather station data"
  ON public.grow_weather_station_data FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage weather station data" ON public.grow_weather_station_data;
CREATE POLICY "Service role can manage weather station data"
  ON public.grow_weather_station_data FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- IRRIGATION ZONES TABLE
-- =============================================================================
-- Stores Rachio/irrigation system zones

CREATE TABLE IF NOT EXISTS public.grow_irrigation_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES public.grow_user_integrations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Zone identification
  external_zone_id TEXT NOT NULL,
  zone_number INTEGER,
  zone_name TEXT,

  -- Zone configuration
  enabled BOOLEAN DEFAULT true,
  nozzle_type TEXT,  -- 'spray', 'rotor', 'drip', etc.
  soil_type TEXT,
  slope TEXT,  -- 'flat', 'slight', 'moderate', 'steep'
  sun_exposure TEXT,  -- 'full_sun', 'partial', 'shade'
  vegetation_type TEXT,  -- 'lawn', 'shrubs', 'vegetables', etc.

  -- Smart watering settings
  smart_watering_enabled BOOLEAN DEFAULT true,
  seasonal_adjustment NUMERIC(4,2),  -- Percentage adjustment

  -- Linked garden/plants
  garden_id UUID,  -- Optional link to user's garden

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(integration_id, external_zone_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_irrigation_zones_user ON public.grow_irrigation_zones(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_irrigation_zones_integration ON public.grow_irrigation_zones(integration_id);

-- RLS policies
ALTER TABLE public.grow_irrigation_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own irrigation zones" ON public.grow_irrigation_zones;
CREATE POLICY "Users can manage own irrigation zones"
  ON public.grow_irrigation_zones FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage irrigation zones" ON public.grow_irrigation_zones;
CREATE POLICY "Service role can manage irrigation zones"
  ON public.grow_irrigation_zones FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- IRRIGATION HISTORY TABLE
-- =============================================================================
-- Tracks watering events from smart irrigation

CREATE TABLE IF NOT EXISTS public.grow_irrigation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES public.grow_irrigation_zones(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Event details
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Event type
  event_type TEXT CHECK (event_type IN ('scheduled', 'manual', 'quick_run', 'smart_cycle')),
  trigger_source TEXT,  -- 'app', 'schedule', 'voice', 'automation'

  -- Water usage
  water_used_gallons NUMERIC(6,2),

  -- Weather at time of watering
  weather_temp_c NUMERIC(5,2),
  weather_condition TEXT,
  was_skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,  -- 'rain', 'wind', 'freeze', 'saturation'

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_irrigation_history_user ON public.grow_irrigation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_irrigation_history_zone ON public.grow_irrigation_history(zone_id);
CREATE INDEX IF NOT EXISTS idx_grow_irrigation_history_started ON public.grow_irrigation_history(started_at DESC);

-- RLS policies
ALTER TABLE public.grow_irrigation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own irrigation history" ON public.grow_irrigation_history;
CREATE POLICY "Users can view own irrigation history"
  ON public.grow_irrigation_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage irrigation history" ON public.grow_irrigation_history;
CREATE POLICY "Service role can manage irrigation history"
  ON public.grow_irrigation_history FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- COMMUNITY GROUPS TABLE
-- =============================================================================
-- Regional gardening groups for local alerts

CREATE TABLE IF NOT EXISTS public.grow_community_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Group identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Location
  region_name TEXT,  -- 'Dublin, Ireland', 'Portland, OR', etc.
  center_lat NUMERIC(9,6),
  center_lng NUMERIC(9,6),
  radius_km NUMERIC(6,2) DEFAULT 50,

  -- Settings
  is_public BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false,
  member_count INTEGER DEFAULT 0,

  -- Moderation
  created_by UUID REFERENCES auth.users(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_community_groups_slug ON public.grow_community_groups(slug);
CREATE INDEX IF NOT EXISTS idx_grow_community_groups_location ON public.grow_community_groups(center_lat, center_lng);

-- RLS policies
ALTER TABLE public.grow_community_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public groups" ON public.grow_community_groups;
CREATE POLICY "Anyone can view public groups"
  ON public.grow_community_groups FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Service role can manage groups" ON public.grow_community_groups;
CREATE POLICY "Service role can manage groups"
  ON public.grow_community_groups FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- COMMUNITY GROUP MEMBERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.grow_community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.grow_community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Membership
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),

  -- Preferences
  receive_alerts BOOLEAN DEFAULT true,
  receive_tips BOOLEAN DEFAULT true,

  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(group_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_community_members_user ON public.grow_community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_grow_community_members_group ON public.grow_community_members(group_id);

-- RLS policies
ALTER TABLE public.grow_community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memberships" ON public.grow_community_members;
CREATE POLICY "Users can view own memberships"
  ON public.grow_community_members FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own memberships" ON public.grow_community_members;
CREATE POLICY "Users can manage own memberships"
  ON public.grow_community_members FOR ALL
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage memberships" ON public.grow_community_members;
CREATE POLICY "Service role can manage memberships"
  ON public.grow_community_members FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- COMMUNITY ALERTS TABLE
-- =============================================================================
-- Local pest/disease/weather alerts shared by community

CREATE TABLE IF NOT EXISTS public.grow_community_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.grow_community_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Reporter

  -- Alert details
  alert_type TEXT NOT NULL CHECK (alert_type IN ('pest', 'disease', 'weather', 'tip', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),

  -- Affected plants (optional)
  affected_plants TEXT[],

  -- Location
  location_lat NUMERIC(9,6),
  location_lng NUMERIC(9,6),
  location_name TEXT,

  -- Photos
  photo_urls TEXT[],

  -- Verification
  verified BOOLEAN DEFAULT false,
  verification_count INTEGER DEFAULT 0,  -- Other users confirming

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'dismissed')),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_grow_community_alerts_group ON public.grow_community_alerts(group_id);
CREATE INDEX IF NOT EXISTS idx_grow_community_alerts_type ON public.grow_community_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_grow_community_alerts_status ON public.grow_community_alerts(status);
CREATE INDEX IF NOT EXISTS idx_grow_community_alerts_created ON public.grow_community_alerts(created_at DESC);

-- RLS policies
ALTER TABLE public.grow_community_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view alerts" ON public.grow_community_alerts;
CREATE POLICY "Group members can view alerts"
  ON public.grow_community_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.grow_community_members
      WHERE group_id = grow_community_alerts.group_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Members can create alerts" ON public.grow_community_alerts;
CREATE POLICY "Members can create alerts"
  ON public.grow_community_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.grow_community_members
      WHERE group_id = grow_community_alerts.group_id
        AND user_id = auth.uid()
        AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Service role can manage alerts" ON public.grow_community_alerts;
CREATE POLICY "Service role can manage alerts"
  ON public.grow_community_alerts FOR ALL
  TO service_role
  USING (true);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get user's active integrations
CREATE OR REPLACE FUNCTION public.grow_get_user_integrations(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  provider TEXT,
  provider_name TEXT,
  device_name TEXT,
  status TEXT,
  last_sync_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.provider,
    i.provider_name,
    i.device_name,
    i.status,
    i.last_sync_at
  FROM public.grow_user_integrations i
  WHERE i.user_id = p_user_id
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get latest weather station reading
CREATE OR REPLACE FUNCTION public.grow_get_latest_station_data(p_user_id UUID)
RETURNS TABLE (
  air_temp_c NUMERIC,
  humidity_percent NUMERIC,
  wind_speed_ms NUMERIC,
  rain_daily_mm NUMERIC,
  solar_radiation_wm2 NUMERIC,
  observed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.air_temp_c,
    w.humidity_percent,
    w.wind_speed_ms,
    w.rain_daily_mm,
    w.solar_radiation_wm2,
    w.observed_at
  FROM public.grow_weather_station_data w
  WHERE w.user_id = p_user_id
  ORDER BY w.observed_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get nearby community groups
CREATE OR REPLACE FUNCTION public.grow_get_nearby_groups(
  p_lat NUMERIC,
  p_lng NUMERIC,
  p_radius_km NUMERIC DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  region_name TEXT,
  member_count INTEGER,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.name,
    g.slug,
    g.region_name,
    g.member_count,
    (
      6371 * acos(
        cos(radians(p_lat)) * cos(radians(g.center_lat)) *
        cos(radians(g.center_lng) - radians(p_lng)) +
        sin(radians(p_lat)) * sin(radians(g.center_lat))
      )
    )::NUMERIC(8,2) as distance_km
  FROM public.grow_community_groups g
  WHERE g.is_public = true
    AND g.center_lat IS NOT NULL
    AND g.center_lng IS NOT NULL
  HAVING (
    6371 * acos(
      cos(radians(p_lat)) * cos(radians(g.center_lat)) *
      cos(radians(g.center_lng) - radians(p_lng)) +
      sin(radians(p_lat)) * sin(radians(g.center_lat))
    )
  ) <= p_radius_km
  ORDER BY distance_km
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE public.grow_user_integrations IS 'User connections to external services (weather stations, irrigation)';
COMMENT ON TABLE public.grow_integration_tokens IS 'OAuth tokens and API keys for integrations (service role only)';
COMMENT ON TABLE public.grow_weather_station_data IS 'Cached readings from connected weather stations';
COMMENT ON TABLE public.grow_irrigation_zones IS 'Smart irrigation system zones';
COMMENT ON TABLE public.grow_irrigation_history IS 'Watering event history from smart irrigation';
COMMENT ON TABLE public.grow_community_groups IS 'Regional gardening community groups';
COMMENT ON TABLE public.grow_community_members IS 'Community group memberships';
COMMENT ON TABLE public.grow_community_alerts IS 'Community-shared pest/disease/weather alerts';
