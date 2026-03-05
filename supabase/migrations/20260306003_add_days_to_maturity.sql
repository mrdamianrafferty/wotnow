-- Add days_to_maturity columns to plant_species for growth stage tracking
ALTER TABLE public.plant_species
  ADD COLUMN IF NOT EXISTS days_to_maturity_min integer,
  ADD COLUMN IF NOT EXISTS days_to_maturity_max integer,
  ADD COLUMN IF NOT EXISTS maturity_basis text
    CHECK (maturity_basis IN ('from_sowing', 'from_transplant')),
  ADD COLUMN IF NOT EXISTS maturity_notes text;

COMMENT ON COLUMN public.plant_species.days_to_maturity_min IS 'Minimum days from sowing/transplant to first harvest';
COMMENT ON COLUMN public.plant_species.days_to_maturity_max IS 'Maximum days from sowing/transplant to first harvest';
COMMENT ON COLUMN public.plant_species.maturity_basis IS 'Whether maturity is measured from_sowing or from_transplant';
COMMENT ON COLUMN public.plant_species.maturity_notes IS 'Additional notes about maturity timing';
