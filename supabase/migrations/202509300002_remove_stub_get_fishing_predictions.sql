-- Resolve RPC overload by retiring the JSON stub version of get_fishing_predictions.
-- The typed TABLE-returning function remains the canonical implementation used by the app.

-- Drop the deprecated JSON-returning overload to avoid PostgREST ambiguity (PGRST203).
DROP FUNCTION IF EXISTS public.get_fishing_predictions(text, date, text);

-- Preserve the lightweight monthly JSON helper under a new nameshould we need it for diagnostics.
CREATE OR REPLACE FUNCTION public.get_monthly_abundance_json(
  rectangle_code_input text,
  prediction_date_input date DEFAULT CURRENT_DATE,
  user_language text DEFAULT 'en'
) RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  month_col TEXT;
  result JSON;
BEGIN
  -- Determine the month column (jan, feb, mar, etc.).
  month_col := to_char(prediction_date_input, 'Mon');
  month_col := lower(substring(month_col FROM 1 FOR 3));

  -- Query monthly abundance rows for quick diagnostics.
  EXECUTE format('
    SELECT json_agg(
      json_build_object(
        ''species_id'', species_id,
        ''abundance'', %I,
        ''rectangle_code'', rectangle_code
      ) ORDER BY %I DESC
    )
    FROM species_monthly_abundance
    WHERE rectangle_code = $1
      AND %I > 0.3
  ', month_col, month_col, month_col)
  INTO result
  USING rectangle_code_input;

  RETURN COALESCE(result, '[]'::json);
END;
$function$;

-- Signal PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
