-- =============================================================================
-- Phase 3 Complete: Weather-Task Integration + Marketplace
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. EXTEND GROW_USER_PLANTS WITH WEATHER-RELEVANT FIELDS
-- -----------------------------------------------------------------------------

-- Add weather-relevant columns to user plants
ALTER TABLE grow_user_plants
ADD COLUMN IF NOT EXISTS frost_tolerance TEXT CHECK (frost_tolerance IN ('hardy', 'half_hardy', 'tender')),
ADD COLUMN IF NOT EXISTS water_needs TEXT CHECK (water_needs IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS temperature_min_c NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS temperature_max_c NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS last_watered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS watering_frequency_days INTEGER;

-- Set defaults for existing plants based on common patterns
COMMENT ON COLUMN grow_user_plants.frost_tolerance IS 'Hardy: survives frost, Half-hardy: light frost ok, Tender: no frost';
COMMENT ON COLUMN grow_user_plants.water_needs IS 'Low: drought tolerant, Medium: regular, High: needs frequent water';

-- -----------------------------------------------------------------------------
-- 2. CREATE WEATHER ALERTS TABLE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_weather_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('frost', 'heat', 'drought', 'rain', 'wind', 'storm')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT,
  forecast_date DATE NOT NULL,
  forecast_value NUMERIC,
  forecast_unit TEXT,
  affected_plant_ids UUID[],
  task_created_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- RLS for weather alerts
ALTER TABLE grow_weather_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own weather alerts" ON grow_weather_alerts;
CREATE POLICY "Users can view own weather alerts"
  ON grow_weather_alerts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own weather alerts" ON grow_weather_alerts;
CREATE POLICY "Users can update own weather alerts"
  ON grow_weather_alerts FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can manage weather alerts" ON grow_weather_alerts;
CREATE POLICY "Service role can manage weather alerts"
  ON grow_weather_alerts FOR ALL
  USING (auth.role() = 'service_role');

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_weather_alerts_user_date ON grow_weather_alerts(user_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_weather_alerts_unread ON grow_weather_alerts(user_id, is_read) WHERE NOT is_read;

-- -----------------------------------------------------------------------------
-- 3. CREATE WEATHER-TASK LINKS TABLE
-- -----------------------------------------------------------------------------

-- Links forecast conditions to generated tasks
CREATE TABLE IF NOT EXISTS grow_weather_task_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('forecast', 'integration', 'manual')),
  weather_condition TEXT, -- 'frost_below_0', 'temp_above_30', 'rain_expected', etc.
  integration_id UUID REFERENCES grow_user_integrations(id),
  forecast_date DATE,
  original_urgency TEXT,
  adjusted_urgency TEXT,
  adjustment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for task lookups
CREATE INDEX IF NOT EXISTS idx_weather_task_triggers_task ON grow_weather_task_triggers(task_id);

-- -----------------------------------------------------------------------------
-- 4. MARKETPLACE: SEED SWAP LISTINGS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_seed_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  plant_name TEXT NOT NULL,
  plant_slug TEXT,
  variety TEXT,
  quantity TEXT, -- "~50 seeds", "1 packet", etc.
  year_harvested INTEGER,
  description TEXT,
  exchange_for TEXT[], -- what they want in return
  is_free BOOLEAN DEFAULT FALSE,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  location_name TEXT,
  radius_km INTEGER DEFAULT 50,
  photo_urls TEXT[],
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'completed', 'cancelled')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days')
);

-- RLS for seed listings
ALTER TABLE grow_seed_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active seed listings" ON grow_seed_listings;
CREATE POLICY "Anyone can view active seed listings"
  ON grow_seed_listings FOR SELECT
  USING (status = 'active' OR user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own seed listings" ON grow_seed_listings;
CREATE POLICY "Users can manage own seed listings"
  ON grow_seed_listings FOR ALL
  USING (user_id = auth.uid());

-- Indexes for discovery
CREATE INDEX IF NOT EXISTS idx_seed_listings_location ON grow_seed_listings(latitude, longitude) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_seed_listings_plant ON grow_seed_listings(plant_slug) WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- 5. MARKETPLACE: SEED SWAP MESSAGES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_seed_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES grow_seed_listings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users NOT NULL,
  recipient_id UUID REFERENCES auth.users NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for messages
ALTER TABLE grow_seed_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON grow_seed_messages;
CREATE POLICY "Users can view own messages"
  ON grow_seed_messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages" ON grow_seed_messages;
CREATE POLICY "Users can send messages"
  ON grow_seed_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Index for conversation threads
CREATE INDEX IF NOT EXISTS idx_seed_messages_listing ON grow_seed_messages(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_seed_messages_recipient ON grow_seed_messages(recipient_id, is_read);

-- -----------------------------------------------------------------------------
-- 6. MARKETPLACE: LOCAL NURSERIES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_nurseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'IE',
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  phone TEXT,
  email TEXT,
  website TEXT,
  specialties TEXT[], -- ['native plants', 'fruit trees', 'herbs']
  opening_hours JSONB, -- {"mon": "9-17", "tue": "9-17", ...}
  logo_url TEXT,
  photo_urls TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  rating_avg NUMERIC(2,1),
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS - anyone can read nurseries
ALTER TABLE grow_nurseries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view nurseries" ON grow_nurseries;
CREATE POLICY "Anyone can view nurseries"
  ON grow_nurseries FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage nurseries" ON grow_nurseries;
CREATE POLICY "Service role can manage nurseries"
  ON grow_nurseries FOR ALL
  USING (auth.role() = 'service_role');

-- Geospatial index
CREATE INDEX IF NOT EXISTS idx_nurseries_location ON grow_nurseries(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_nurseries_specialties ON grow_nurseries USING GIN(specialties);

-- -----------------------------------------------------------------------------
-- 7. MARKETPLACE: NURSERY INVENTORY (Optional for Nurseries to Use)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_nursery_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nursery_id UUID REFERENCES grow_nurseries(id) ON DELETE CASCADE NOT NULL,
  plant_name TEXT NOT NULL,
  plant_slug TEXT,
  category TEXT, -- 'vegetable', 'herb', 'flower', 'shrub', 'tree'
  size TEXT, -- '9cm pot', '2L pot', 'bare root'
  price_cents INTEGER,
  currency TEXT DEFAULT 'EUR',
  in_stock BOOLEAN DEFAULT TRUE,
  quantity_available INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE grow_nursery_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view inventory" ON grow_nursery_inventory;
CREATE POLICY "Anyone can view inventory"
  ON grow_nursery_inventory FOR SELECT
  USING (in_stock = true);

DROP POLICY IF EXISTS "Service role can manage inventory" ON grow_nursery_inventory;
CREATE POLICY "Service role can manage inventory"
  ON grow_nursery_inventory FOR ALL
  USING (auth.role() = 'service_role');

-- Index for plant search
CREATE INDEX IF NOT EXISTS idx_nursery_inventory_plant ON grow_nursery_inventory(plant_slug) WHERE in_stock;

-- -----------------------------------------------------------------------------
-- 8. MARKETPLACE: AFFILIATE PRODUCTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grow_affiliate_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'tools', 'seeds', 'soil', 'pots', 'fertilizer'
  affiliate_url TEXT NOT NULL,
  affiliate_network TEXT, -- 'amazon', 'awin', 'direct'
  image_url TEXT,
  price_from_cents INTEGER,
  currency TEXT DEFAULT 'EUR',
  rating NUMERIC(2,1),
  is_featured BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE grow_affiliate_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view affiliate products" ON grow_affiliate_products;
CREATE POLICY "Anyone can view affiliate products"
  ON grow_affiliate_products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Service role can manage affiliate products" ON grow_affiliate_products;
CREATE POLICY "Service role can manage affiliate products"
  ON grow_affiliate_products FOR ALL
  USING (auth.role() = 'service_role');

-- Index for category browsing
CREATE INDEX IF NOT EXISTS idx_affiliate_products_category ON grow_affiliate_products(category);
CREATE INDEX IF NOT EXISTS idx_affiliate_products_featured ON grow_affiliate_products(is_featured) WHERE is_featured;

-- -----------------------------------------------------------------------------
-- 9. RPC: FIND NEARBY SEED LISTINGS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION grow_find_nearby_seeds(
  user_lat NUMERIC,
  user_lon NUMERIC,
  radius_km NUMERIC DEFAULT 50,
  plant_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  plant_name TEXT,
  plant_slug TEXT,
  variety TEXT,
  quantity TEXT,
  description TEXT,
  is_free BOOLEAN,
  location_name TEXT,
  distance_km NUMERIC,
  user_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.plant_name,
    sl.plant_slug,
    sl.variety,
    sl.quantity,
    sl.description,
    sl.is_free,
    sl.location_name,
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(sl.latitude)) *
        cos(radians(sl.longitude) - radians(user_lon)) +
        sin(radians(user_lat)) * sin(radians(sl.latitude))
      ))::NUMERIC, 1
    ) as distance_km,
    sl.user_id,
    sl.created_at
  FROM grow_seed_listings sl
  WHERE sl.status = 'active'
    AND sl.expires_at > now()
    AND (plant_filter IS NULL OR sl.plant_slug ILIKE '%' || plant_filter || '%' OR sl.plant_name ILIKE '%' || plant_filter || '%')
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(sl.latitude)) *
      cos(radians(sl.longitude) - radians(user_lon)) +
      sin(radians(user_lat)) * sin(radians(sl.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 10. RPC: FIND NEARBY NURSERIES
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION grow_find_nearby_nurseries(
  user_lat NUMERIC,
  user_lon NUMERIC,
  radius_km NUMERIC DEFAULT 30,
  specialty_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  website TEXT,
  specialties TEXT[],
  rating_avg NUMERIC,
  distance_km NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.name,
    n.description,
    n.address,
    n.city,
    n.latitude,
    n.longitude,
    n.website,
    n.specialties,
    n.rating_avg,
    ROUND(
      (6371 * acos(
        cos(radians(user_lat)) * cos(radians(n.latitude)) *
        cos(radians(n.longitude) - radians(user_lon)) +
        sin(radians(user_lat)) * sin(radians(n.latitude))
      ))::NUMERIC, 1
    ) as distance_km
  FROM grow_nurseries n
  WHERE (specialty_filter IS NULL OR specialty_filter = ANY(n.specialties))
    AND (6371 * acos(
      cos(radians(user_lat)) * cos(radians(n.latitude)) *
      cos(radians(n.longitude) - radians(user_lon)) +
      sin(radians(user_lat)) * sin(radians(n.latitude))
    )) <= radius_km
  ORDER BY distance_km ASC
  LIMIT 30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 11. RPC: GET USER'S WEATHER ALERTS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION grow_get_active_weather_alerts(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  alert_type TEXT,
  severity TEXT,
  title TEXT,
  message TEXT,
  forecast_date DATE,
  forecast_value NUMERIC,
  affected_plant_ids UUID[],
  is_read BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wa.id,
    wa.alert_type,
    wa.severity,
    wa.title,
    wa.message,
    wa.forecast_date,
    wa.forecast_value,
    wa.affected_plant_ids,
    wa.is_read,
    wa.created_at
  FROM grow_weather_alerts wa
  WHERE wa.user_id = target_user_id
    AND wa.is_dismissed = false
    AND (wa.expires_at IS NULL OR wa.expires_at > now())
  ORDER BY
    CASE wa.severity
      WHEN 'critical' THEN 1
      WHEN 'warning' THEN 2
      ELSE 3
    END,
    wa.forecast_date ASC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
