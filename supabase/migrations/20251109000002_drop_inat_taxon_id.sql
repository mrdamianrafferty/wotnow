-- Drop the incorrect inat_taxon_id column
-- The inaturalist_url column already has correct full URLs and is what the app uses
-- The inat_taxon_id column was populated with wrong IDs and is not used by the application

BEGIN;

-- Drop the inat_taxon_id column if it exists
ALTER TABLE species DROP COLUMN IF EXISTS inat_taxon_id;
ALTER TABLE species DROP COLUMN IF EXISTS inat_taxon_verified;

COMMIT;

-- Log the change
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Removed inat_taxon_id Column';
  RAISE NOTICE '';
  RAISE NOTICE 'The inat_taxon_id column contained incorrect taxon IDs and has been removed.';
  RAISE NOTICE 'The application uses inaturalist_url column which has correct full URLs.';
  RAISE NOTICE '';
END $$;
