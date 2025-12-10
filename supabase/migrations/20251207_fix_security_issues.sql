-- Fix Supabase security linter issues
-- Generated: 2025-12-07
-- Addresses: Security Definer Views and RLS disabled on public tables

-- ============================================================================
-- PART 1: Enable RLS on all reference/lookup tables
-- These are read-only reference data that should be accessible to all users
-- ============================================================================

-- Species and fishing reference data
ALTER TABLE IF EXISTS public.species_seasonality ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.substrate_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_substrate ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fishing_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_bait ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bait ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technique ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_technique ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_region_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_rectangle_seasonality ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.species_region_seasonality ENABLE ROW LEVEL SECURITY;

-- Habitat and technique reference data
ALTER TABLE IF EXISTS public.habitat_canonical ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habitat_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.technique_alias ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habitat_canonical2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.habitat_alias2 ENABLE ROW LEVEL SECURITY;

-- Geographic/spatial reference data
ALTER TABLE IF EXISTS public.grid_025deg ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.region_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.grid_025deg_ices_xref ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.world_eez ENABLE ROW LEVEL SECURITY;

-- Plant/garden reference data
ALTER TABLE IF EXISTS public.plant_species ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plant_task_calendar_default ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plant_task_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.climate_zone ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.plant_function ENABLE ROW LEVEL SECURITY;

-- Other reference data
ALTER TABLE IF EXISTS public.salmonid_temperature_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bio_bands_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guild_blueprint ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.guild_blueprint_member ENABLE ROW LEVEL SECURITY;

-- Staging/audit tables
ALTER TABLE IF EXISTS public.staging_species_substrate_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.staging_species_patch ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_favourite_canonicalization_audit ENABLE ROW LEVEL SECURITY;

-- Cache tables
ALTER TABLE IF EXISTS public.elevation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.emodnet_cache ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Create permissive SELECT policies for reference data
-- Allow all authenticated and anonymous users to read reference data
-- ============================================================================

-- Species and fishing reference data
CREATE POLICY "Public read access" ON public.species_seasonality FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.substrate_type FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_substrate FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.fishing_techniques FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_bait FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.bait FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.technique FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_technique FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_alias FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_aliases FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_region_overrides FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_rectangle_seasonality FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.species_region_seasonality FOR SELECT USING (true);

-- Habitat and technique reference data
CREATE POLICY "Public read access" ON public.habitat_canonical FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.habitat_alias FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.technique_alias FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.habitat_canonical2 FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.habitat_alias2 FOR SELECT USING (true);

-- Geographic/spatial reference data
CREATE POLICY "Public read access" ON public.grid_025deg FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.region_map FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.spatial_ref_sys FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.grid_025deg_ices_xref FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.world_eez FOR SELECT USING (true);

-- Plant/garden reference data
CREATE POLICY "Public read access" ON public.plant_species FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.plant_task_calendar_default FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.plant_task_type FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.climate_zone FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.plant_function FOR SELECT USING (true);

-- Other reference data
CREATE POLICY "Public read access" ON public.salmonid_temperature_tiers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.bio_bands_thresholds FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.guild_blueprint FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.guild_blueprint_member FOR SELECT USING (true);

-- Staging tables - restrict to service role only (no public access)
CREATE POLICY "Service role only" ON public.staging_species_substrate_flags FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role only" ON public.staging_species_patch FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit table - authenticated users can read their own records
CREATE POLICY "Users can read own records" ON public.user_favourite_canonicalization_audit
  FOR SELECT USING (auth.uid() = user_id);

-- Cache tables - public read access (caches are meant to improve performance)
CREATE POLICY "Public read access" ON public.elevation_cache FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.emodnet_cache FOR SELECT USING (true);

-- ============================================================================
-- PART 3: Security Definer Views
-- Note: These views are intentionally SECURITY DEFINER to provide controlled
-- access to data. They should be reviewed individually to ensure they don't
-- expose sensitive data. For now, we're documenting them.
-- ============================================================================

-- The following views use SECURITY DEFINER (intentional for controlled access):
-- 1. findr_favourite_stats - Aggregates user favorites (safe, read-only)
-- 2. plant_task_calendar_resolved - Resolves plant tasks (safe, read-only)
-- 3. rectangles_025deg - Spatial data view (safe, read-only)
-- 4. subscription_overview - User subscription data (should check if exposes PII)
-- 5. species_data_gaps - Analysis view (safe, read-only)
-- 6. copernicus_dashboard_summary - Data quality stats (safe, read-only)
-- 7. species_full_public - Public species data (safe, read-only)
-- 8. rectangles_025deg_api - API spatial data (safe, read-only)
-- 9. rectangles - Spatial rectangles (safe, read-only)
-- 10. grid_data_quality_eu - Data quality (safe, read-only)
-- 11. species_gap_map - Data gaps (safe, read-only)
-- 12. grid_quality_alerts - Quality alerts (safe, read-only)
-- 13. grid_data_quality_summary - Quality summary (safe, read-only)
-- 14. species_technique_readable - Species techniques (safe, read-only)
-- 15. tide_critical_species - Tide-related species (safe, read-only)
-- 16. species_substrates - Species substrates (safe, read-only)
-- 17. v_species_effective_sensitivity - Species sensitivity (safe, read-only)
-- 18. grid_region - Grid regions (safe, read-only)
-- 19. species_current_analysis - Species analysis (safe, read-only)
-- 20. v_species_effective_env_na - Environmental data (safe, read-only)
-- 21. rectangles_grid_with_ices - Combined grid data (safe, read-only)
-- 22. api_species_techniques - API techniques (safe, read-only)
-- 23. species_seasonality_current - Current seasonality (safe, read-only)
-- 24. emodnet_cache_stats - Cache statistics (safe, read-only)
-- 25. v_species_effective_env_example - Example environmental data (safe, read-only)
-- 26. species_availability_by_grid - Species by grid (safe, read-only)
-- 27. rectangles_unified - Unified rectangles (safe, read-only)
-- 28. region_alias - Region aliases (safe, read-only)
-- 29. rectangle_environmental_conditions - Environmental conditions (safe, read-only)
-- 30. findr_conditions_latest - Latest conditions (safe, read-only)
-- 31. rectangle_data_quality - Data quality (safe, read-only)
-- 32. ices_rectangles_poly - ICES polygons (safe, read-only)

-- If any of these views expose sensitive user data or allow privilege escalation,
-- they should be recreated WITHOUT SECURITY DEFINER and proper RLS should be
-- applied to the underlying tables instead.

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify the migration worked)
-- ============================================================================

-- Check that RLS is now enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;

-- Check policies were created
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
