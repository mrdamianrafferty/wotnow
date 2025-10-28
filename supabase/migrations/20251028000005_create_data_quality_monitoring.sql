-- Data Quality Monitoring for grid_conditions_latest
--
-- Provides real-time visibility into environmental data coverage and quality
-- Critical for ensuring predictions use reliable data

-- Overall coverage statistics
CREATE OR REPLACE VIEW grid_data_quality_summary AS
SELECT
  COUNT(*) as total_cells,
  COUNT(surface_temperature_c) as cells_with_temp,
  COUNT(salinity_psu) as cells_with_salinity,
  COUNT(chlorophyll_mg_m3) as cells_with_chlorophyll,
  COUNT(oxygen_mg_l) as cells_with_oxygen,
  ROUND(100.0 * COUNT(surface_temperature_c) / COUNT(*), 1) as temp_coverage_pct,
  ROUND(100.0 * COUNT(salinity_psu) / COUNT(*), 1) as salinity_coverage_pct,
  ROUND(100.0 * COUNT(chlorophyll_mg_m3) / COUNT(*), 1) as chlorophyll_coverage_pct,
  ROUND(100.0 * COUNT(oxygen_mg_l) / COUNT(*), 1) as oxygen_coverage_pct,
  MAX(updated_at) as last_update,
  MIN(collected_at) as oldest_data,
  MAX(collected_at) as newest_data,
  NOW() - MAX(collected_at) as data_age
FROM grid_conditions_latest;

COMMENT ON VIEW grid_data_quality_summary IS
'Overall environmental data quality metrics for all grid cells';

-- EU-specific (ICES-mapped) coverage
CREATE OR REPLACE VIEW grid_data_quality_eu AS
SELECT
  COUNT(DISTINCT gcl.cell_id) as eu_cells_total,
  COUNT(DISTINCT CASE WHEN gcl.surface_temperature_c IS NOT NULL THEN gcl.cell_id END) as eu_cells_with_temp,
  COUNT(DISTINCT CASE WHEN gcl.salinity_psu IS NOT NULL THEN gcl.cell_id END) as eu_cells_with_salinity,
  COUNT(DISTINCT CASE WHEN gcl.chlorophyll_mg_m3 IS NOT NULL THEN gcl.cell_id END) as eu_cells_with_chlorophyll,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN gcl.surface_temperature_c IS NOT NULL THEN gcl.cell_id END) /
    COUNT(DISTINCT gcl.cell_id), 1) as eu_temp_coverage_pct,
  MAX(gcl.updated_at) as last_update,
  NOW() - MAX(gcl.collected_at) as data_age
FROM grid_conditions_latest gcl
INNER JOIN grid_025deg_ices_xref xref ON xref.cell_id = gcl.cell_id;

COMMENT ON VIEW grid_data_quality_eu IS
'Environmental data quality metrics for European (ICES-mapped) waters only';

-- Critical alerts: Cells missing temperature (most important variable)
CREATE OR REPLACE VIEW grid_quality_alerts AS
SELECT
  'missing_temperature' as alert_type,
  'critical' as severity,
  gcl.cell_id,
  STRING_AGG(DISTINCT xref.rectangle_code, ', ') as affected_rectangles,
  gcl.salinity_psu IS NOT NULL as has_other_data,
  gcl.updated_at,
  NOW() - gcl.collected_at as data_age
FROM grid_conditions_latest gcl
LEFT JOIN grid_025deg_ices_xref xref ON xref.cell_id = gcl.cell_id
WHERE gcl.surface_temperature_c IS NULL
GROUP BY gcl.cell_id, gcl.salinity_psu, gcl.updated_at, gcl.collected_at

UNION ALL

SELECT
  'stale_data' as alert_type,
  CASE
    WHEN NOW() - collected_at > INTERVAL '7 days' THEN 'critical'
    WHEN NOW() - collected_at > INTERVAL '3 days' THEN 'warning'
    ELSE 'info'
  END as severity,
  cell_id,
  NULL as affected_rectangles,
  TRUE as has_other_data,
  updated_at,
  NOW() - collected_at as data_age
FROM grid_conditions_latest
WHERE NOW() - collected_at > INTERVAL '3 days'
  AND surface_temperature_c IS NOT NULL

ORDER BY severity DESC, data_age DESC;

COMMENT ON VIEW grid_quality_alerts IS
'Data quality alerts: missing critical variables and stale data warnings';

-- Per-rectangle data quality (for EU waters)
CREATE OR REPLACE VIEW rectangle_data_quality AS
SELECT
  fcl.rectangle_code,
  fcl.sea_temp_c IS NOT NULL as has_temperature,
  fcl.salinity_psu IS NOT NULL as has_salinity,
  fcl.chlorophyll_mg_m3 IS NOT NULL as has_chlorophyll,
  fcl.dissolved_oxygen_mg_l IS NOT NULL as has_oxygen,
  fcl.captured_at as last_captured,
  NOW() - fcl.captured_at as data_age,
  COUNT(DISTINCT xref.cell_id) as num_grid_cells
FROM findr_conditions_latest fcl
LEFT JOIN grid_025deg_ices_xref xref ON xref.rectangle_code = fcl.rectangle_code
GROUP BY fcl.rectangle_code, fcl.sea_temp_c, fcl.salinity_psu,
         fcl.chlorophyll_mg_m3, fcl.dissolved_oxygen_mg_l, fcl.captured_at
ORDER BY has_temperature DESC, data_age ASC;

COMMENT ON VIEW rectangle_data_quality IS
'Data quality metrics per ICES rectangle showing variable coverage and freshness';

-- Grant public read access to these monitoring views
GRANT SELECT ON grid_data_quality_summary TO anon, authenticated;
GRANT SELECT ON grid_data_quality_eu TO anon, authenticated;
GRANT SELECT ON grid_quality_alerts TO anon, authenticated;
GRANT SELECT ON rectangle_data_quality TO anon, authenticated;
