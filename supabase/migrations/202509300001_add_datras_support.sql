-- Normalize DATRAS monthly abundance into a long form that aligns with core rectangle/species IDs.
DROP VIEW IF EXISTS public.datras_monthly_abundance_long CASCADE;

CREATE VIEW public.datras_monthly_abundance_long
WITH (security_invoker = TRUE) AS
SELECT
  sma.id                    AS datras_row_id,
  ir.id                     AS rectangle_id,
  sp.id                     AS species_id,
  month_idx::INT            AS month_number,
  TO_CHAR(DATE '2000-01-01' + ((month_idx::INT - 1) * INTERVAL '1 month'), 'Mon') AS month_name,
  month_val::NUMERIC        AS abundance_value,
  sma.data_source,
  sma.last_updated,
  sma.created_at
FROM public.species_monthly_abundance sma
-- Species frequency and related materialized views rely on the UUID primary key from ices_rectangles;
-- join here so downstream joins compare matching types instead of raw rectangle codes.
JOIN public.ices_rectangles ir
  ON ir.rectangle_code = sma.rectangle_code
JOIN public.species sp
  ON sp.species_code = sma.species_id  -- DATRAS uses short codes like "plaice"; adjust if different.
CROSS JOIN LATERAL UNNEST(
  ARRAY[
    sma.jan, sma.feb, sma.mar, sma.apr,
    sma.may, sma.jun, sma.jul, sma.aug,
    sma.sep, sma.oct, sma.nov, sma.dec
  ]
) WITH ORDINALITY AS months(month_val, month_idx);

-- Aggregate monthly signals into quarters so we can tag the weekly feed efficiently.
DROP VIEW IF EXISTS public.species_datras_quarterly_support CASCADE;

CREATE VIEW public.species_datras_quarterly_support
WITH (security_invoker = TRUE) AS
SELECT
  rectangle_id,
  species_id,
  ((month_number - 1) / 3)::INT + 1 AS quarter,
  AVG(abundance_value)              AS mean_abundance,
  MAX(abundance_value)              AS peak_abundance,
  BOOL_OR(abundance_value IS NOT NULL) AS has_datras
FROM public.datras_monthly_abundance_long
GROUP BY rectangle_id, species_id, quarter;

-- Final view the app/API can target: existing weekly rows plus the DATRAS qualifier.
DROP VIEW IF EXISTS public.species_frequency_with_datras CASCADE;

CREATE VIEW public.species_frequency_with_datras
WITH (security_invoker = TRUE) AS
SELECT
  sf.*,
  sd.mean_abundance                     AS datras_mean_abundance,
  sd.peak_abundance                     AS datras_peak_abundance,
  COALESCE(sd.has_datras, FALSE)        AS datras_supported,
  CASE WHEN COALESCE(sd.has_datras, FALSE)
       THEN 'datras_supported'
       ELSE 'model_only'
  END                                   AS presence_qualifier
FROM public.species_frequency sf
LEFT JOIN public.species_datras_quarterly_support sd
  ON sd.rectangle_id = sf.rectangle_id
 AND sd.species_id   = sf.species_id
 AND sd.quarter      = sf.quarter;

-- Expose the views through PostgREST.
GRANT SELECT ON public.datras_monthly_abundance_long    TO anon, authenticated;
GRANT SELECT ON public.species_datras_quarterly_support TO anon, authenticated;
GRANT SELECT ON public.species_frequency_with_datras    TO anon, authenticated;
