-- Fix get_fishing_predictions(): species.typical_gear was renamed/replaced by
-- species.gear_by_technique (jsonb keyed by technique) directly on the live DB,
-- without a tracked migration or a matching update to this function. Every
-- call to get_fishing_predictions has been failing with
-- "column s.typical_gear does not exist" (42703) since, which silently broke
-- the hourly check-notifications cron (no predictions -> no emails sent).
CREATE OR REPLACE FUNCTION public.get_fishing_predictions(rectangle_code_input text, prediction_date_input date DEFAULT CURRENT_DATE, user_language text DEFAULT 'en'::text)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  month_col TEXT;
  result JSON;
BEGIN
  -- Determine the month column based on prediction date (jan, feb, mar, etc.)
  month_col := lower(to_char(prediction_date_input, 'mon'));

  -- Build predictions from species_monthly_abundance table
  -- LEFT JOIN with species table to get species details (fallback if no match)
  EXECUTE format('
    SELECT COALESCE(json_agg(
      json_build_object(
        ''species_id'', sma.species_id,
        ''species_code'', COALESCE(s.species_code, sma.species_id),
        ''speciesCode'', COALESCE(s.species_code, sma.species_id),
        ''species_common_name'', COALESCE(s.name_en, INITCAP(REPLACE(sma.species_id, ''-'', '' ''))),
        ''common_name'', COALESCE(s.name_en, INITCAP(REPLACE(sma.species_id, ''-'', '' ''))),
        ''species_scientific_name'', COALESCE(s.scientific_name, ''''),
        ''scientific_name'', COALESCE(s.scientific_name, ''''),
        ''confidence'', ROUND((sma.%I * 100)::numeric, 0),
        ''confidence_percent'', ROUND((sma.%I * 100)::numeric, 0),
        ''abundance'', sma.%I,
        ''rectangle_code'', sma.rectangle_code,
        ''prediction_date'', $2,
        ''month'', $3,
        ''rationale'', json_build_array(
          ''Species shows '' || ROUND((sma.%I * 100)::numeric, 0) || ''%% historical catch rate in '' || $3,
          ''Based on DATRAS survey data for rectangle '' || sma.rectangle_code,
          ''Typical depth range: '' || COALESCE(s.min_depth::text, ''0'') || ''-'' || COALESCE(s.max_depth::text, ''200'') || ''m''
        ),
        ''headline'', ''Good prospects for '' || COALESCE(s.name_en, INITCAP(REPLACE(sma.species_id, ''-'', '' ''))) || '' this month'',
        ''summary'', COALESCE(s.name_en, INITCAP(REPLACE(sma.species_id, ''-'', '' ''))) || '' typically shows '' || ROUND((sma.%I * 100)::numeric, 0) || ''%% catch rates in this area during '' || $3,
        ''bait_suggestions'', COALESCE(to_jsonb(s.gear_by_technique), ''[]''::jsonb),
        ''tide_tips'', json_build_array(
          CASE
            WHEN s.tide_sensitivity > 0.6 THEN ''Fish during tide changes for best results''
            WHEN s.tide_sensitivity > 0.3 THEN ''Moderate tide influence - fish anytime''
            ELSE ''Tide has minimal impact on this species''
          END
        ),
        ''status_notes'', json_build_array(
          COALESCE(s.conservation_status, ''Check local stock status''),
          COALESCE(s.fun_fact, ''Great sport fish'')
        ),
        ''depth_range'', json_build_object(
          ''min'', s.min_depth,
          ''max'', s.max_depth
        ),
        ''temperature_sensitivity'', COALESCE(s.temperature_sensitivity, 0.5),
        ''wind_sensitivity'', COALESCE(s.wind_sensitivity, 0.5),
        ''pressure_sensitivity'', COALESCE(s.pressure_sensitivity, 0.5),
        ''tide_sensitivity'', COALESCE(s.tide_sensitivity, 0.5),
        ''eating_quality'', COALESCE(s.eating_quality, 0.7)
      ) ORDER BY sma.%I DESC
    ), ''[]''::json)
    FROM species_monthly_abundance sma
    LEFT JOIN species s ON s.species_code = sma.species_id
      OR LOWER(REPLACE(s.name_en, '' '', ''-'')) = LOWER(sma.species_id)
    WHERE sma.rectangle_code = $1
      AND sma.%I > 0.2
    LIMIT 20
  ',
    month_col, month_col, month_col, month_col, month_col,
    month_col, month_col
  )
  INTO result
  USING rectangle_code_input, prediction_date_input, to_char(prediction_date_input, 'Month');

  RETURN result;
END;
$function$;
