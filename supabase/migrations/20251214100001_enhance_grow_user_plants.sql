-- Enhance grow_user_plants with additional fields for richer plant tracking
-- These fields allow users to track more specific details about individual plants

-- Add species_slug to link to plant_species for easy reference
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS species_slug text;

-- Add variety for specific cultivar tracking (e.g., "Bramley" for Apple)
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS variety text;

-- Add quantity for tracking multiple plants of same type
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;

-- Add source for tracking where plants were obtained
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS source text;

-- Add expected harvest date for planning
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS expected_harvest_at timestamptz;

-- Add cost for tracking garden investment
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS cost_cents integer;

-- Add photo_url for user-uploaded photos of their specific plant
ALTER TABLE public.grow_user_plants 
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create index on species_slug for efficient joins
CREATE INDEX IF NOT EXISTS grow_user_plants_species_slug_idx 
ON public.grow_user_plants (species_slug) 
WHERE species_slug IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.grow_user_plants.species_slug IS 'Slug reference to plant_species table';
COMMENT ON COLUMN public.grow_user_plants.variety IS 'Specific cultivar or variety name (e.g., Bramley, Cherry Belle)';
COMMENT ON COLUMN public.grow_user_plants.quantity IS 'Number of plants/seeds of this type';
COMMENT ON COLUMN public.grow_user_plants.source IS 'Where the plant was obtained (e.g., Local nursery, Seeds from neighbor)';
COMMENT ON COLUMN public.grow_user_plants.expected_harvest_at IS 'Expected harvest date based on planting';
COMMENT ON COLUMN public.grow_user_plants.cost_cents IS 'Cost in cents for budget tracking';
COMMENT ON COLUMN public.grow_user_plants.photo_url IS 'URL to user-uploaded photo of their specific plant';
