-- Create table for storing Grow Daisy garden photos
-- Photos are stored in Supabase Storage bucket "grow-garden-photos"

CREATE TABLE IF NOT EXISTS public.grow_garden_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Storage reference
    storage_path TEXT NOT NULL,                    -- Path in Supabase Storage bucket
    url TEXT NOT NULL,                             -- Public URL for the photo
    thumbnail_url TEXT,                            -- Transformed thumbnail URL (320x320)
    
    -- Photo metadata
    taken_at TIMESTAMPTZ,                          -- When the photo was taken (from EXIF or user input)
    description TEXT,                              -- User-provided description/caption
    location TEXT,                                 -- Garden location (e.g., "Raised Bed 1", "Front Garden")
    
    -- Relationships
    plant_ids UUID[] DEFAULT '{}',                 -- Array of linked plant IDs from grow_user_plants
    tags TEXT[] DEFAULT '{}',                      -- User-defined tags (e.g., "harvest", "bloom", "pest")
    
    -- Auto timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_grow_garden_photos_user_id
    ON public.grow_garden_photos (user_id, created_at DESC);

-- Index for filtering by location
CREATE INDEX IF NOT EXISTS idx_grow_garden_photos_location
    ON public.grow_garden_photos (user_id, location)
    WHERE location IS NOT NULL;

-- GIN index for tag filtering
CREATE INDEX IF NOT EXISTS idx_grow_garden_photos_tags
    ON public.grow_garden_photos USING GIN (tags);

-- GIN index for plant filtering
CREATE INDEX IF NOT EXISTS idx_grow_garden_photos_plant_ids
    ON public.grow_garden_photos USING GIN (plant_ids);

-- Trigger to automatically update the updated_at column
DROP TRIGGER IF EXISTS grow_garden_photos_set_updated_at ON public.grow_garden_photos;
CREATE TRIGGER grow_garden_photos_set_updated_at
    BEFORE UPDATE ON public.grow_garden_photos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security so users only see their own photos
ALTER TABLE public.grow_garden_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own photos" ON public.grow_garden_photos;
CREATE POLICY "Users can view own photos"
    ON public.grow_garden_photos
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add own photos" ON public.grow_garden_photos;
CREATE POLICY "Users can add own photos"
    ON public.grow_garden_photos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own photos" ON public.grow_garden_photos;
CREATE POLICY "Users can update own photos"
    ON public.grow_garden_photos
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own photos" ON public.grow_garden_photos;
CREATE POLICY "Users can delete own photos"
    ON public.grow_garden_photos
    FOR DELETE
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE public.grow_garden_photos IS 'Garden photos uploaded by users for their Grow Daisy garden gallery';
COMMENT ON COLUMN public.grow_garden_photos.storage_path IS 'Path in Supabase Storage bucket "grow-garden-photos"';
COMMENT ON COLUMN public.grow_garden_photos.plant_ids IS 'Array of plant IDs from grow_user_plants that appear in this photo';
COMMENT ON COLUMN public.grow_garden_photos.tags IS 'User-defined tags for categorization (e.g., harvest, bloom, pest, progress)';

-- Note: Storage bucket "grow-garden-photos" must be created in Supabase dashboard with:
-- - Public: true (for easy image serving)
-- - File size limit: 10MB (photos will be compressed client-side to ~1MB)
-- - Allowed mime types: image/jpeg, image/png, image/webp
