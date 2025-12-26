-- Migration: Add updated_at column with trigger for ices_rectangles
-- Adds an automatic timestamp column updated_at which is set on INSERT/UPDATE

BEGIN;

ALTER TABLE public.ices_rectangles
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill existing rows if any were not populated by the DEFAULT
UPDATE public.ices_rectangles
SET updated_at = now()
WHERE updated_at IS NULL;

-- Create trigger function to keep updated_at current on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to update updated_at on row changes
DROP TRIGGER IF EXISTS set_updated_at_trigger ON public.ices_rectangles;
CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON public.ices_rectangles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Index for sitemap freshness and selection
CREATE INDEX IF NOT EXISTS idx_ices_rectangles_updated_at ON public.ices_rectangles USING btree (updated_at);

COMMIT;

