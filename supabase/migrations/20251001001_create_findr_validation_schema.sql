-- Create Findr validation infrastructure: prediction impressions and catch entries
-- This enables linking user catches back to the predictions they viewed for accuracy validation

-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for tracking when users view predictions (impression tracking)
CREATE TABLE IF NOT EXISTS findr_prediction_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    rectangle_code TEXT NOT NULL,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    prediction_date DATE NOT NULL,
    ranked_species JSONB NOT NULL, -- Array of {species_id, rank, confidence, urgency}
    environmental_snapshot JSONB, -- Sea temp, tide, wind, etc. at viewing time
    urgency_level TEXT CHECK (urgency_level IN ('high', 'medium', 'low')),
    source TEXT, -- API version that generated these predictions
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for user catch entries with validation linkage
CREATE TABLE IF NOT EXISTS findr_catch_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    species_id TEXT NOT NULL, -- Matches lib/findr/species catalogue
    species_common_name TEXT,
    scientific_name TEXT,
    rectangle_code TEXT NOT NULL,
    prediction_impression_id UUID REFERENCES findr_prediction_impressions(id), -- Links to prediction if user was using Findr
    caught_at TIMESTAMPTZ NOT NULL, -- Actual time of catch
    logged_at TIMESTAMPTZ NOT NULL DEFAULT now(), -- When user logged it
    quantity INTEGER DEFAULT 1,
    size_category TEXT CHECK (size_category IN ('small', 'average', 'large', 'mixed')),
    weight_kg NUMERIC,
    length_cm NUMERIC,
    bait_used TEXT,
    method TEXT CHECK (method IN ('shore', 'boat', 'kayak')),
    habitat_type TEXT CHECK (habitat_type IN ('rocky_shore', 'sandy_beach', 'pier_harbor', 'estuary', 'shallow_water', 'deep_water', 'wreck_reef', 'open_sea')),
    depth_range TEXT CHECK (depth_range IN ('shallow_water', 'deep_water')),
    notes TEXT,
    photo_urls TEXT[],
    followed_findr_advice BOOLEAN, -- Did user deliberately act on predictions
    used_recommended_bait BOOLEAN, -- Calculated by comparing bait_used to species advice
    used_recommended_habitat BOOLEAN, -- Calculated by comparing habitat to species preferences
    is_blank_trip BOOLEAN DEFAULT FALSE, -- True for unsuccessful fishing sessions
    environmental_conditions JSONB, -- Captured from findr_conditions_snapshots at catch time
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional table for grouping catches into fishing sessions
CREATE TABLE IF NOT EXISTS findr_fishing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    rectangle_code TEXT NOT NULL,
    prediction_impression_id UUID REFERENCES findr_prediction_impressions(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    target_species_ids TEXT[], -- What user was trying to catch
    outcome TEXT CHECK (outcome IN ('successful', 'blank', 'conditions_poor')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add session reference to catch entries (optional)
ALTER TABLE findr_catch_entries 
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES findr_fishing_sessions(id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_prediction_impressions_user_timeline 
    ON findr_prediction_impressions (user_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_impressions_location_timeline 
    ON findr_prediction_impressions (rectangle_code, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_impressions_cleanup 
    ON findr_prediction_impressions (viewed_at);

CREATE INDEX IF NOT EXISTS idx_catch_entries_user_timeline 
    ON findr_catch_entries (user_id, caught_at DESC);

CREATE INDEX IF NOT EXISTS idx_catch_entries_location_analysis 
    ON findr_catch_entries (rectangle_code, caught_at DESC);

CREATE INDEX IF NOT EXISTS idx_catch_entries_species_analysis 
    ON findr_catch_entries (species_id, caught_at DESC);

CREATE INDEX IF NOT EXISTS idx_catch_entries_validation_joins 
    ON findr_catch_entries (prediction_impression_id);

CREATE INDEX IF NOT EXISTS idx_catch_entries_user_species_stats 
    ON findr_catch_entries (user_id, species_id);

CREATE INDEX IF NOT EXISTS idx_fishing_sessions_user_timeline 
    ON findr_fishing_sessions (user_id, started_at DESC);

-- Create RLS policies for data security
-- Users can only see their own data

-- Prediction impressions policies
ALTER TABLE findr_prediction_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own impressions" ON findr_prediction_impressions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own impressions" ON findr_prediction_impressions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own impressions" ON findr_prediction_impressions
    FOR UPDATE USING (auth.uid() = user_id);

-- Catch entries policies  
ALTER TABLE findr_catch_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catches" ON findr_catch_entries
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own catches" ON findr_catch_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catches" ON findr_catch_entries
    FOR UPDATE USING (auth.uid() = user_id);

-- Restrict deletes to preserve validation data (soft deletes preferred)
-- No DELETE policy means only service role can delete

-- Fishing sessions policies
ALTER TABLE findr_fishing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON findr_fishing_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON findr_fishing_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON findr_fishing_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Add foreign key constraint to link rectangles if table exists
-- This will fail gracefully if findr_rectangles doesn't exist yet
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'findr_rectangles') THEN
        -- Add foreign key constraint for prediction impressions
        ALTER TABLE findr_prediction_impressions 
        ADD CONSTRAINT fk_prediction_impressions_rectangle 
        FOREIGN KEY (rectangle_code) REFERENCES findr_rectangles(rectangle_code)
        ON DELETE CASCADE;
        
        -- Add foreign key constraint for catch entries  
        ALTER TABLE findr_catch_entries 
        ADD CONSTRAINT fk_catch_entries_rectangle 
        FOREIGN KEY (rectangle_code) REFERENCES findr_rectangles(rectangle_code)
        ON DELETE CASCADE;
        
        -- Add foreign key constraint for fishing sessions
        ALTER TABLE findr_fishing_sessions 
        ADD CONSTRAINT fk_fishing_sessions_rectangle 
        FOREIGN KEY (rectangle_code) REFERENCES findr_rectangles(rectangle_code)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraints to findr_rectangles';
    ELSE
        RAISE NOTICE 'findr_rectangles table not found, skipping foreign key constraints';
    END IF;
END $$;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger for catch entries updated_at
CREATE TRIGGER update_catch_entries_updated_at 
    BEFORE UPDATE ON findr_catch_entries 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE findr_prediction_impressions IS 'Tracks when users view fishing predictions for validation analysis';
COMMENT ON TABLE findr_catch_entries IS 'User-logged fishing catches with prediction linkage for accuracy validation';
COMMENT ON TABLE findr_fishing_sessions IS 'Optional grouping of catches into fishing trips/sessions';
COMMENT ON COLUMN findr_prediction_impressions.ranked_species IS 'JSON array: [{"species_id": "DICL", "rank": 1, "confidence": 92, "urgency": "high"}]';
COMMENT ON COLUMN findr_catch_entries.prediction_impression_id IS 'Links catch back to prediction user viewed (null if caught without using Findr)';
COMMENT ON COLUMN findr_catch_entries.followed_findr_advice IS 'User-reported: were they deliberately following Findr predictions?';
COMMENT ON COLUMN findr_catch_entries.is_blank_trip IS 'True for unsuccessful fishing sessions (valuable for validation)';