-- ============================================================================
-- SUBSTRATE COMPARISON TEST
-- Rock lovers vs Sand lovers on ROCK substrate
-- ============================================================================

SELECT 
  CASE 
    WHEN species_code IN ('bss', 'wrb', 'pol', 'bib') THEN 'ROCK LOVERS'
    WHEN species_code IN ('ple', 'dab', 'sol', 'fle') THEN 'SAND LOVERS'
  END as category,
  species_code,
  species_name,
  environmental_score,
  substrate_match,
  (factors->'substrate'->>'score')::numeric as substrate_score
FROM get_environmental_predictions_basic('31F1', CURRENT_DATE)
WHERE species_code IN ('bss', 'wrb', 'pol', 'bib', 'ple', 'dab', 'sol', 'fle')
ORDER BY 
  CASE 
    WHEN species_code IN ('bss', 'wrb', 'pol', 'bib') THEN 1
    ELSE 2
  END,
  environmental_score DESC;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- ROCK LOVERS (should have high scores + "suitable" substrate match):
--   bss (Bass)     - 9.7, substrate_score: 0.17
--   wrb (Wrasse)   - ~9.5, substrate_score: 0.17
--   pol (Pollock)  - ~9.0, substrate_score: 0.17
--   bib (Bib)      - ~8.5, substrate_score: 0.17
--
-- SAND LOVERS (should have lower scores + "poor" substrate match):
--   sol (Sole)     - ~8.6, substrate_score: 0.06
--   fle (Flounder) - ~8.0, substrate_score: 0.06
--   ple (Plaice)   - ~7.5, substrate_score: 0.06
--   dab (Dab)      - ~7.0, substrate_score: 0.06
--
-- The ~1.1 point difference is from substrate scoring:
-- Rock fish: 0.85 × 0.20 = 0.17
-- Sand fish: 0.30 × 0.20 = 0.06
-- Difference: 0.11 → 1.1 points on 0-10 scale
-- ============================================================================
