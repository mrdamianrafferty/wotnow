-- Add iNaturalist URL column to species table
-- This allows linking to iNaturalist species pages for additional identification resources

ALTER TABLE public.species 
ADD COLUMN IF NOT EXISTS inaturalist_url TEXT;

COMMENT ON COLUMN public.species.inaturalist_url IS 'Link to iNaturalist species page for identification and observation data';

-- Example iNaturalist URLs:
-- https://www.inaturalist.org/taxa/47273-Dicentrarchus-labrax (Sea Bass)
-- https://www.inaturalist.org/taxa/47427-Gadus-morhua (Atlantic Cod)
-- https://www.inaturalist.org/taxa/47426-Scomber-scombrus (Mackerel)
