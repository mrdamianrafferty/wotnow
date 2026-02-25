-- =============================================================================
-- Seed: garden_threat_risk_rule — weather-driven risk rules
-- Migration: 20260225000003_seed_garden_threat_risk_rules
--
-- ~115 rules across fungal diseases, pests, oomycetes, bacterial,
-- abiotic stresses, nutrient, and other garden threats.
--
-- Each rule references garden_threat by slug and uses the rule_json
-- schema consumed by ruleEngine.ts / evaluateThreatRule().
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNGAL DISEASES
-- ─────────────────────────────────────────────────────────────────────────────

-- late-blight (1/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal late blight conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]},{"signal":"rain_72h_mm","op":">=","value":15},{"signal":"rh_hours_24h_over_90","op":">=","value":6}],"score":5,"reasons":["Warm humid conditions with persistent leaf wetness ideal for late blight"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'late-blight'
ON CONFLICT DO NOTHING;

-- late-blight (2/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate late blight risk', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,22]},{"signal":"rain_72h_mm","op":">=","value":8}],"score":3,"reasons":["Cool wet weather increases blight risk"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'late-blight'
ON CONFLICT DO NOTHING;

-- late-blight (3/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Low blight risk - warm dry', true, 6, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25}],"score":1,"reasons":["Hot dry weather suppresses blight"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'late-blight'
ON CONFLICT DO NOTHING;

-- powdery-mildew (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal powdery mildew conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]},{"signal":"rh_hours_24h_over_90","op":"<","value":2},{"signal":"rain_72h_mm","op":"<","value":5}],"score":4,"reasons":["Warm dry days with cool humid nights favour powdery mildew"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'powdery-mildew'
ON CONFLICT DO NOTHING;

-- powdery-mildew (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate mildew risk', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[18,25]}],"score":2,"reasons":["Moderate temperatures support mildew growth"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'powdery-mildew'
ON CONFLICT DO NOTHING;

-- downy-mildew (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal downy mildew conditions', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,20]},{"signal":"rh_hours_24h_over_90","op":">=","value":8},{"signal":"rain_72h_mm","op":">=","value":10}],"score":5,"reasons":["Cool wet conditions with high humidity are ideal for downy mildew"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'downy-mildew'
ON CONFLICT DO NOTHING;

-- downy-mildew (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate downy mildew risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,22]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":3,"reasons":["Wet conditions with moderate temperatures increase downy mildew risk"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'downy-mildew'
ON CONFLICT DO NOTHING;

-- botrytis-grey-mould (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal grey mould conditions', true, 4, 11,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,22]},{"signal":"rh_hours_24h_over_90","op":">=","value":8},{"signal":"rain_72h_mm","op":">=","value":10}],"score":5,"reasons":["Cool humid conditions with poor air circulation favour Botrytis"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'botrytis-grey-mould'
ON CONFLICT DO NOTHING;

-- botrytis-grey-mould (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate grey mould risk', true, 3, 11,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,25]},{"signal":"rh_hours_24h_over_90","op":">=","value":4}],"score":3,"reasons":["Moderate humidity and cool temperatures support grey mould development"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'botrytis-grey-mould'
ON CONFLICT DO NOTHING;

-- rust (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal rust conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,22]},{"signal":"rh_hours_24h_over_90","op":">=","value":6},{"signal":"rain_72h_mm","op":">=","value":8}],"score":4,"reasons":["Warm humid weather with leaf wetness favours rust spore germination"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rust'
ON CONFLICT DO NOTHING;

-- rust (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate rust risk', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":2,"reasons":["Mild wet conditions support rust development"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rust'
ON CONFLICT DO NOTHING;

-- early-blight (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal early blight conditions', true, 6, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[20,30]},{"signal":"rh_hours_24h_over_90","op":">=","value":4}],"score":4,"reasons":["Warm humid conditions favour Alternaria"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'early-blight'
ON CONFLICT DO NOTHING;

-- early-blight (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate early blight risk', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[18,28]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":2,"reasons":["Warm wet weather increases early blight risk"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'early-blight'
ON CONFLICT DO NOTHING;

-- damping-off (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal damping off conditions', true, 2, 5,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,18]},{"signal":"rh_hours_24h_over_90","op":">=","value":8}],"score":4,"reasons":["Cool wet conditions increase damping off risk for seedlings"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'damping-off'
ON CONFLICT DO NOTHING;

-- damping-off (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate damping off risk', true, 1, 6,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,20]},{"signal":"rain_72h_mm","op":">=","value":10}],"score":3,"reasons":["Cool wet soil conditions favour damping off pathogens"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'damping-off'
ON CONFLICT DO NOTHING;

-- leaf-spot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal leaf spot conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]},{"signal":"rain_72h_mm","op":">=","value":15},{"signal":"rh_hours_24h_over_90","op":">=","value":6}],"score":4,"reasons":["Warm wet conditions with extended leaf wetness drive leaf spot infection"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'leaf-spot'
ON CONFLICT DO NOTHING;

-- leaf-spot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate leaf spot risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,28]},{"signal":"rain_72h_mm","op":">=","value":8}],"score":2,"reasons":["Wet weather supports leaf spot fungal growth"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'leaf-spot'
ON CONFLICT DO NOTHING;

-- apple-scab (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal scab conditions', true, 3, 7,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,20]},{"signal":"rain_72h_mm","op":">=","value":10},{"signal":"rh_hours_24h_over_90","op":">=","value":6}],"score":5,"reasons":["Extended leaf wetness during spring rains drives scab infection"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'apple-scab'
ON CONFLICT DO NOTHING;

-- apple-scab (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate scab risk', true, 3, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,22]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":3,"reasons":["Cool wet spring weather supports scab spore release"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'apple-scab'
ON CONFLICT DO NOTHING;

-- rose-black-spot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal black spot conditions', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]},{"signal":"rain_72h_mm","op":">=","value":10},{"signal":"rh_hours_24h_over_90","op":">=","value":4}],"score":4,"reasons":["Rain splash spreads black spot spores between leaves"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rose-black-spot'
ON CONFLICT DO NOTHING;

-- rose-black-spot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate black spot risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,28]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":2,"reasons":["Wet weather supports black spot spread"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rose-black-spot'
ON CONFLICT DO NOTHING;

-- root-rot (1/2) — year-round (no season columns)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Waterlogged conditions', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":30}],"score":4,"reasons":["Saturated soil deprives roots of oxygen"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'root-rot'
ON CONFLICT DO NOTHING;

-- root-rot (2/2) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate root rot risk', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":15},{"signal":"temp_avg_24h_c","op":"between","value":[10,20]}],"score":2,"reasons":["Persistent wet soil in cool conditions promotes root rot"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'root-rot'
ON CONFLICT DO NOTHING;

-- clubroot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal clubroot conditions', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]},{"signal":"rain_72h_mm","op":">=","value":15}],"score":4,"reasons":["Warm wet acidic soil favours clubroot"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'clubroot'
ON CONFLICT DO NOTHING;

-- clubroot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate clubroot risk', true, 3, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,28]},{"signal":"rain_72h_mm","op":">=","value":8}],"score":2,"reasons":["Wet conditions in the growing season support clubroot spore survival"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'clubroot'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PESTS
-- ─────────────────────────────────────────────────────────────────────────────

-- aphids (1/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak aphid conditions', true, 4, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]},{"signal":"rain_72h_mm","op":"<","value":10}],"score":4,"reasons":["Warm dry weather accelerates aphid reproduction"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'aphids'
ON CONFLICT DO NOTHING;

-- aphids (2/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate aphid risk', true, 3, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]}],"score":2,"reasons":["Mild temperatures support aphid activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'aphids'
ON CONFLICT DO NOTHING;

-- aphids (3/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Low aphid risk - cold', true, 10, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"<","value":8}],"score":1,"reasons":["Cold weather suppresses aphid populations"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'aphids'
ON CONFLICT DO NOTHING;

-- slugs-snails (1/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak slug conditions', true, 3, 11,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,20]},{"signal":"rain_72h_mm","op":">=","value":10},{"signal":"rh_hours_24h_over_90","op":">=","value":4}],"score":5,"reasons":["Wet mild conditions are ideal for slug and snail activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'slugs-snails'
ON CONFLICT DO NOTHING;

-- slugs-snails (2/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate slug risk', true, 3, 11,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[5,22]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":3,"reasons":["Damp conditions encourage slug and snail movement"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'slugs-snails'
ON CONFLICT DO NOTHING;

-- slugs-snails (3/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Dry weather - slug risk low', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":"<","value":3},{"signal":"temp_avg_24h_c","op":">","value":20}],"score":1,"reasons":["Hot dry conditions deter slug and snail activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'slugs-snails'
ON CONFLICT DO NOTHING;

-- spider-mites (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak spider mite conditions', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25},{"signal":"rain_72h_mm","op":"<","value":3},{"signal":"rh_hours_24h_over_90","op":"<","value":2}],"score":5,"reasons":["Hot dry conditions cause spider mite populations to explode"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'spider-mites'
ON CONFLICT DO NOTHING;

-- spider-mites (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate spider mite risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":20},{"signal":"rain_72h_mm","op":"<","value":8}],"score":3,"reasons":["Warm dry weather supports spider mite breeding"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'spider-mites'
ON CONFLICT DO NOTHING;

-- whitefly (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak whitefly conditions', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[18,30]},{"signal":"rain_72h_mm","op":"<","value":5}],"score":4,"reasons":["Warm sheltered conditions favour whitefly populations"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'whitefly'
ON CONFLICT DO NOTHING;

-- whitefly (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate whitefly risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]}],"score":2,"reasons":["Mild to warm temperatures support whitefly development"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'whitefly'
ON CONFLICT DO NOTHING;

-- thrips (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak thrips conditions', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":22},{"signal":"rain_72h_mm","op":"<","value":5}],"score":4,"reasons":["Hot dry weather drives thrips activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'thrips'
ON CONFLICT DO NOTHING;

-- thrips (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate thrips risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":18},{"signal":"rain_72h_mm","op":"<","value":10}],"score":2,"reasons":["Warm weather with low rainfall supports thrips feeding"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'thrips'
ON CONFLICT DO NOTHING;

-- vine-weevil (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Vine weevil active', true, 3, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,25]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":3,"reasons":["Adult vine weevils are active in mild damp conditions"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'vine-weevil'
ON CONFLICT DO NOTHING;

-- vine-weevil (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Vine weevil larvae active', true, 9, 5,
  '{"version":1,"logic":"all","conditions":[{"signal":"month","op":"in","value":[9,10,11,3,4,5]}],"score":2,"reasons":["Larvae feed on roots through autumn and spring"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'vine-weevil'
ON CONFLICT DO NOTHING;

-- brassica-caterpillars (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak caterpillar season', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]}],"score":4,"reasons":["Butterfly egg-laying peaks in warm summer months"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'brassica-caterpillars'
ON CONFLICT DO NOTHING;

-- brassica-caterpillars (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate caterpillar risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]}],"score":2,"reasons":["Mild temperatures support caterpillar feeding activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'brassica-caterpillars'
ON CONFLICT DO NOTHING;

-- carrot-fly (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak carrot fly season', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]}],"score":4,"reasons":["Two generations per year, peak egg-laying in warm weather"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'carrot-fly'
ON CONFLICT DO NOTHING;

-- carrot-fly (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Second generation carrot fly', true, 7, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,22]}],"score":3,"reasons":["Second generation larvae damage late-season crops"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'carrot-fly'
ON CONFLICT DO NOTHING;

-- cabbage-root-fly (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak cabbage root fly', true, 4, 6,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,22]}],"score":4,"reasons":["First generation egg-laying in spring"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'cabbage-root-fly'
ON CONFLICT DO NOTHING;

-- cabbage-root-fly (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Second generation cabbage root fly', true, 7, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]}],"score":3,"reasons":["Second generation attacks mid to late summer plantings"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'cabbage-root-fly'
ON CONFLICT DO NOTHING;

-- flea-beetle (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak flea beetle', true, 4, 7,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":20},{"signal":"rain_72h_mm","op":"<","value":5}],"score":4,"reasons":["Hot dry weather increases flea beetle damage on seedlings"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'flea-beetle'
ON CONFLICT DO NOTHING;

-- flea-beetle (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate flea beetle risk', true, 3, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":15},{"signal":"rain_72h_mm","op":"<","value":10}],"score":2,"reasons":["Warm dry conditions support flea beetle activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'flea-beetle'
ON CONFLICT DO NOTHING;

-- codling-moth (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peak codling moth', true, 5, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":15}],"score":4,"reasons":["Moths fly and lay eggs in warm evenings"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'codling-moth'
ON CONFLICT DO NOTHING;

-- codling-moth (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate codling moth risk', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":12}],"score":2,"reasons":["Mild evenings allow moth flight and egg-laying"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'codling-moth'
ON CONFLICT DO NOTHING;

-- fungus-gnats (1/1) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Fungus gnat conditions', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rh_hours_24h_over_90","op":">=","value":6}],"score":3,"reasons":["Constantly moist compost attracts fungus gnats"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'fungus-gnats'
ON CONFLICT DO NOTHING;

-- leaf-miners (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Leaf miner active', true, 4, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]}],"score":3,"reasons":["Adult flies lay eggs on leaves in warm weather"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'leaf-miners'
ON CONFLICT DO NOTHING;

-- scale-insects (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Scale insect active', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":15}],"score":3,"reasons":["Warm conditions accelerate scale insect reproduction"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'scale-insects'
ON CONFLICT DO NOTHING;

-- mealybugs (1/1) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Mealybug conditions', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":18},{"signal":"rh_hours_24h_over_90","op":"<","value":4}],"score":3,"reasons":["Warm dry indoor conditions favour mealybugs"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'mealybugs'
ON CONFLICT DO NOTHING;

-- cutworms (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Cutworm active', true, 4, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]}],"score":3,"reasons":["Cutworm larvae are most active in spring and summer"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'cutworms'
ON CONFLICT DO NOTHING;

-- earwigs (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Earwig peak', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,25]},{"signal":"rh_hours_24h_over_90","op":">=","value":4}],"score":2,"reasons":["Warm damp conditions encourage earwig activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'earwigs'
ON CONFLICT DO NOTHING;

-- red-lily-beetle (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Lily beetle active', true, 3, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":12}],"score":4,"reasons":["Adult beetles emerge in spring and feed on lily foliage"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'red-lily-beetle'
ON CONFLICT DO NOTHING;

-- rosemary-beetle (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Rosemary beetle active', true, 3, 5,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":10}],"score":3,"reasons":["Adults emerge in spring to feed on herb foliage"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rosemary-beetle'
ON CONFLICT DO NOTHING;

-- rosemary-beetle (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Autumn generation rosemary beetle', true, 9, 11,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,18]}],"score":2,"reasons":["Autumn generation feeds before overwintering"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'rosemary-beetle'
ON CONFLICT DO NOTHING;

-- sawfly (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Sawfly active', true, 4, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":15}],"score":3,"reasons":["Warm weather drives sawfly adult emergence and egg-laying"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'sawfly'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- OOMYCETE
-- ─────────────────────────────────────────────────────────────────────────────

-- phytophthora (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Ideal Phytophthora conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[12,25]},{"signal":"rain_72h_mm","op":">=","value":20},{"signal":"rh_hours_24h_over_90","op":">=","value":6}],"score":5,"reasons":["Warm waterlogged conditions drive Phytophthora root and stem infection"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'phytophthora'
ON CONFLICT DO NOTHING;

-- phytophthora (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate Phytophthora risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,22]},{"signal":"rain_72h_mm","op":">=","value":10}],"score":3,"reasons":["Cool wet soil conditions support Phytophthora spread"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'phytophthora'
ON CONFLICT DO NOTHING;

-- pythium (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Pythium conditions', true, 2, 6,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[10,20]},{"signal":"rain_72h_mm","op":">=","value":15}],"score":4,"reasons":["Cool wet conditions favour Pythium damping off"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'pythium'
ON CONFLICT DO NOTHING;

-- peronospora (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Peronospora active', true, 3, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,18]},{"signal":"rh_hours_24h_over_90","op":">=","value":8},{"signal":"rain_72h_mm","op":">=","value":10}],"score":4,"reasons":["Cool humid weather drives Peronospora sporulation"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'peronospora'
ON CONFLICT DO NOTHING;

-- peronospora (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate Peronospora risk', true, 3, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[8,20]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":2,"reasons":["Cool damp conditions support Peronospora development"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'peronospora'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- BACTERIAL
-- ─────────────────────────────────────────────────────────────────────────────

-- bacterial-canker (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Canker infection risk', true, 9, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":10},{"signal":"temp_avg_24h_c","op":"between","value":[5,15]}],"score":4,"reasons":["Autumn rain and pruning wounds allow canker bacteria entry"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bacterial-canker'
ON CONFLICT DO NOTHING;

-- bacterial-canker (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Spring canker risk', true, 3, 5,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":8},{"signal":"temp_avg_24h_c","op":"between","value":[8,18]}],"score":3,"reasons":["Spring rain spreads canker bacteria to new growth"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bacterial-canker'
ON CONFLICT DO NOTHING;

-- bacterial-leaf-spot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Bacterial leaf spot conditions', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[20,30]},{"signal":"rh_hours_24h_over_90","op":">=","value":4},{"signal":"rain_72h_mm","op":">=","value":8}],"score":4,"reasons":["Warm humid conditions with rain splash spread bacterial leaf spot"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bacterial-leaf-spot'
ON CONFLICT DO NOTHING;

-- bacterial-leaf-spot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate bacterial leaf spot risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[18,28]},{"signal":"rain_72h_mm","op":">=","value":5}],"score":2,"reasons":["Warm wet weather supports bacterial leaf spot spread"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bacterial-leaf-spot'
ON CONFLICT DO NOTHING;

-- soft-rot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Soft rot conditions', true, 5, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[20,30]},{"signal":"rain_72h_mm","op":">=","value":15}],"score":4,"reasons":["Warm wet conditions accelerate bacterial soft rot"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'soft-rot'
ON CONFLICT DO NOTHING;

-- soft-rot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate soft rot risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]},{"signal":"rain_72h_mm","op":">=","value":10}],"score":2,"reasons":["Warm moist conditions support soft rot bacteria"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'soft-rot'
ON CONFLICT DO NOTHING;

-- crown-gall (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Crown gall risk', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,30]},{"signal":"rain_72h_mm","op":">=","value":10}],"score":3,"reasons":["Warm wet soil conditions favour crown gall bacteria entry through wounds"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'crown-gall'
ON CONFLICT DO NOTHING;

-- fire-blight (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Fire blight ideal', true, 4, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[18,30]},{"signal":"rh_hours_24h_over_90","op":">=","value":4},{"signal":"rain_72h_mm","op":">=","value":5}],"score":5,"reasons":["Warm humid weather during blossom drives fire blight epidemics"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'fire-blight'
ON CONFLICT DO NOTHING;

-- fire-blight (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate fire blight risk', true, 4, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]},{"signal":"rain_72h_mm","op":">=","value":3}],"score":3,"reasons":["Warm wet weather supports fire blight spread"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'fire-blight'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- ABIOTIC
-- ─────────────────────────────────────────────────────────────────────────────

-- frost-damage (1/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Frost warning', true, 10, 4,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"<","value":2}],"score":5,"reasons":["Sub-zero temperatures damage tender plant tissue"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'frost-damage'
ON CONFLICT DO NOTHING;

-- frost-damage (2/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Light frost risk', true, 10, 4,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"<","value":5}],"score":3,"reasons":["Near-freezing temperatures risk frost on clear nights"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'frost-damage'
ON CONFLICT DO NOTHING;

-- frost-damage (3/3)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Late frost risk', true, 3, 5,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"<","value":5},{"signal":"month","op":"in","value":[3,4,5]}],"score":4,"reasons":["Late spring frosts catch emerging growth"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'frost-damage'
ON CONFLICT DO NOTHING;

-- heat-stress (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Extreme heat', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":30}],"score":5,"reasons":["Extreme heat causes wilting, bolting, and sunscald"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'heat-stress'
ON CONFLICT DO NOTHING;

-- heat-stress (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Heat stress risk', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25}],"score":3,"reasons":["High temperatures stress cool-season crops"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'heat-stress'
ON CONFLICT DO NOTHING;

-- blossom-end-rot (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'BER risk - heat', true, 6, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":28},{"signal":"rain_72h_mm","op":"<","value":5}],"score":4,"reasons":["Hot dry spells disrupt calcium uptake causing BER"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'blossom-end-rot'
ON CONFLICT DO NOTHING;

-- blossom-end-rot (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate BER risk', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25},{"signal":"rain_72h_mm","op":"<","value":8}],"score":2,"reasons":["Warm dry conditions may disrupt even watering and calcium uptake"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'blossom-end-rot'
ON CONFLICT DO NOTHING;

-- sunscald-leaf-scorch (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Sunscald risk', true, 6, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":28},{"signal":"rain_72h_mm","op":"<","value":3}],"score":4,"reasons":["Intense sun on exposed fruit causes bleached patches"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'sunscald-leaf-scorch'
ON CONFLICT DO NOTHING;

-- overwatering-poor-drainage (1/2) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Waterlogging risk', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":30}],"score":4,"reasons":["Prolonged heavy rain saturates soil"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'overwatering-poor-drainage'
ON CONFLICT DO NOTHING;

-- overwatering-poor-drainage (2/2) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate drainage issues', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":15}],"score":2,"reasons":["Persistent rain may cause waterlogging on heavy soils"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'overwatering-poor-drainage'
ON CONFLICT DO NOTHING;

-- wind-scorch (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Wind damage risk', true, 10, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"month","op":"in","value":[10,11,12,1,2,3]}],"score":3,"reasons":["Winter winds desiccate evergreen foliage"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'wind-scorch'
ON CONFLICT DO NOTHING;

-- drought-stress (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Drought stress', true, 5, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25},{"signal":"rain_72h_mm","op":"<","value":2}],"score":4,"reasons":["Hot dry conditions exhaust soil moisture"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'drought-stress'
ON CONFLICT DO NOTHING;

-- drought-stress (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate drought risk', true, 4, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":20},{"signal":"rain_72h_mm","op":"<","value":5}],"score":2,"reasons":["Warm weather with little rain starts to deplete soil moisture"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'drought-stress'
ON CONFLICT DO NOTHING;

-- waterlogging (1/2) — year-round
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Waterlogging', true, null, null,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":40}],"score":4,"reasons":["Heavy persistent rain causes root asphyxiation"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'waterlogging'
ON CONFLICT DO NOTHING;

-- waterlogging (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate waterlogging', true, 10, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":20},{"signal":"temp_avg_24h_c","op":"<","value":10}],"score":3,"reasons":["Cold wet soil drains slowly"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'waterlogging'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- NUTRIENT
-- ─────────────────────────────────────────────────────────────────────────────

-- nitrogen-deficiency (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Nitrogen leaching risk', true, 10, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"rain_72h_mm","op":">=","value":25}],"score":3,"reasons":["Heavy rain leaches nitrogen from soil"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'nitrogen-deficiency'
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- OTHER
-- ─────────────────────────────────────────────────────────────────────────────

-- bolting (1/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Bolting risk - heat', true, 4, 8,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":25}],"score":4,"reasons":["Sudden heat triggers premature bolting in leafy crops"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bolting'
ON CONFLICT DO NOTHING;

-- bolting (2/2)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Moderate bolting risk', true, 4, 7,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":">","value":22}],"score":2,"reasons":["Warm temperatures may trigger bolting in sensitive varieties"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bolting'
ON CONFLICT DO NOTHING;

-- nematodes (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Nematode active', true, 4, 10,
  '{"version":1,"logic":"all","conditions":[{"signal":"temp_avg_24h_c","op":"between","value":[15,28]}],"score":3,"reasons":["Warm soil temperatures increase nematode activity"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'nematodes'
ON CONFLICT DO NOTHING;

-- bird-damage (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Fruit ripening attracts birds', true, 6, 9,
  '{"version":1,"logic":"all","conditions":[{"signal":"month","op":"in","value":[6,7,8,9]}],"score":3,"reasons":["Ripening fruit attracts birds"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'bird-damage'
ON CONFLICT DO NOTHING;

-- deer-browsing (1/1)
INSERT INTO garden_threat_risk_rule (threat_id, title, enabled, season_start_month, season_end_month, rule_json)
SELECT gt.id, 'Winter deer browsing', true, 11, 3,
  '{"version":1,"logic":"all","conditions":[{"signal":"month","op":"in","value":[11,12,1,2,3]}],"score":3,"reasons":["Scarce winter food drives deer to browse garden plants"]}'::jsonb
FROM garden_threat gt WHERE gt.slug = 'deer-browsing'
ON CONFLICT DO NOTHING;

COMMIT;
