-- ============================================================
-- Grow Daisy — 25-slug content-drop resolver
-- ============================================================
-- Date: 14 May 2026
-- Author: Cowork → Code
-- Re: 25 no-op rows from migration 20260513014 (content drop apply)
-- Investigation: Code's spot-check found 3 species exist under different slugs;
--                13 explicit slugs confirmed absent; ~9 more unidentified.
--
-- This resolver does:
--   §1: 3 RENAMEs to align existing DB rows with the content-drop canonical slugs
--   §2: 13 INSERTs to add new rows for explicitly-absent species
--   §3: Instructions for re-running the relevant subset of 20260513014
--
-- Still needs Code's input:
--   §4: identify the other ~9 unaccounted-for no-op slugs from 20260513014
--
-- Master FK rule (codified after the second-sweep lessons):
--   Every INSERT INTO plant_species_aliases (old_slug, new_slug) requires
--   new_slug to exist in plant_species AT INSERT TIME. Sequence reflects this.
-- ============================================================

BEGIN;

-- ============================================================
-- §1: RENAME 3 existing rows to align with content-drop canonicals
-- ============================================================
-- Strategic choice: rename DB rows TO my drafted slugs (not the reverse),
-- because the drafted slugs match modern UK gardener search behaviour:
--   - "aquilegia" (modern UK garden press, RHS, Sarah Raven, Gardener's World)
--     over "columbine" (older traditional name)
--   - "hardy-geranium" (adjective-first, standard English word order)
--     over "geranium-hardy" (awkward suffix order)
--   - "hellebore" (common name, more searched)
--     over "helleborus" (Latin name as slug is unusual)
-- Reverse aliases preserve all existing inbound links and bookmarks.

-- columbine → aquilegia
UPDATE plant_species SET slug = 'aquilegia' WHERE slug = 'columbine';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('columbine', 'aquilegia');

-- geranium-hardy → hardy-geranium
UPDATE plant_species SET slug = 'hardy-geranium' WHERE slug = 'geranium-hardy';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('geranium-hardy', 'hardy-geranium');

-- helleborus → hellebore
UPDATE plant_species SET slug = 'hellebore' WHERE slug = 'helleborus';
INSERT INTO plant_species_aliases (old_slug, new_slug) VALUES ('helleborus', 'hellebore');

-- ============================================================
-- §2: INSERT 13 new rows for explicitly-absent species
-- ============================================================
-- Minimal-viable columns: slug, name, scientific_name.
-- Code: if other NOT NULL columns exist in plant_species, extend these INSERTs
-- with sensible defaults (e.g. region, type, image_url placeholder).
--
-- The content UPDATE statements in 20260513014 will populate
-- description, howto_steps, faqs, rhs_hardiness_min/max, dates
-- once the rows exist.

INSERT INTO plant_species (slug, name, scientific_name) VALUES
  -- Vegetables (2)
  ('lambs-lettuce',     'Lamb''s lettuce',     'Valerianella locusta'),
  ('strawberry',        'Strawberry',          'Fragaria × ananassa'),
  -- Flowers (10)
  ('alchemilla-mollis', 'Alchemilla mollis',   'Alchemilla mollis'),
  ('bergenia',          'Bergenia',            'Bergenia cordifolia'),
  ('bluebell',          'Bluebell (English)',  'Hyacinthoides non-scripta'),
  ('clematis',          'Clematis',            'Clematis'),
  ('crocus',            'Crocus',              'Crocus'),
  ('daffodil',          'Daffodil',            'Narcissus'),
  ('hydrangea',         'Hydrangea',           'Hydrangea'),
  ('snowdrop',          'Snowdrop',            'Galanthus nivalis'),
  ('tulip',             'Tulip',               'Tulipa'),
  -- Soft fruit (2)
  ('blackberry',        'Blackberry',          'Rubus fruticosus'),
  ('blueberry',         'Blueberry',           'Vaccinium corymbosum');

COMMIT;

-- ============================================================
-- §3: Re-run content UPDATEs from 20260513014 for the 16 affected slugs
-- ============================================================
-- After §1 and §2 commit successfully, re-execute the relevant UPDATEs
-- from supabase/migrations/20260513014_apply_120_species_content.sql.
--
-- The 16 slugs to re-target (each has a corresponding UPDATE block in 20260513014):
--   Renamed (3): aquilegia, hardy-geranium, hellebore
--   New rows (13): lambs-lettuce, strawberry, alchemilla-mollis, bergenia,
--                  bluebell, clematis, crocus, daffodil, hydrangea, snowdrop,
--                  tulip, blackberry, blueberry
--
-- Quick approach — extract just these 16 UPDATEs into a follow-up file:
--
--   for slug in aquilegia hardy-geranium hellebore lambs-lettuce strawberry \
--               alchemilla-mollis bergenia bluebell clematis crocus daffodil \
--               hydrangea snowdrop tulip blackberry blueberry; do
--     awk "/WHERE slug = '${slug}'/{flag=1; print prev} flag{print} /^;$/{flag=0}" \
--       supabase/migrations/20260513014_apply_120_species_content.sql \
--       | sed -n '/^UPDATE/,/^;$/p'
--   done > /tmp/retarget_16.sql
--
-- Wrap in BEGIN/COMMIT, apply.
--
-- Or simpler: re-run 20260513014 in full — every UPDATE is idempotent
-- (COALESCE on date_published) and the 95 already-applied UPDATEs will just
-- refresh date_modified. No harm done.

-- ============================================================
-- §4: Open question — what are the other ~9 unaccounted no-op slugs?
-- ============================================================
-- Code's status doc reported "95 of 120 rows updated" → 25 no-ops total.
-- The explicit categorisation totalled 16:
--   Vegetables (2):       lambs-lettuce, strawberry
--   Flowers (13):         alchemilla-mollis, aquilegia, bergenia, blackberry,
--                         bluebell, clematis, crocus, daffodil, hardy-geranium,
--                         hellebore, hydrangea, snowdrop, tulip
--   Fruit/trees (1):      blueberry
-- That leaves ~9 unaccounted for.
--
-- ASK: Code, please share the full list of slugs from 20260513014 whose
-- UPDATE returned `0 rows affected`. The simplest source:
--
--   For each UPDATE statement, check pg_stat_user_tables / log output, or
--   re-run 20260513014 against current DB state and capture which rows updated.
--   Easier alternative — query:
--
--     SELECT slug FROM (VALUES
--       <list of all 120 drafted slugs as values>
--     ) AS drafted(slug)
--     WHERE slug NOT IN (SELECT slug FROM plant_species);
--
-- Once we have the other ~9, add them to §2 of this resolver as additional
-- INSERTs and re-apply. Same pattern.

-- ============================================================
-- POST-APPLY VERIFICATION
-- ============================================================
-- All 16 should now return rows with non-null description:
--
--   SELECT slug, LEFT(description, 60) AS desc_start
--   FROM plant_species
--   WHERE slug IN (
--     'aquilegia', 'hardy-geranium', 'hellebore',
--     'lambs-lettuce', 'strawberry', 'alchemilla-mollis', 'bergenia',
--     'bluebell', 'clematis', 'crocus', 'daffodil', 'hydrangea', 'snowdrop',
--     'tulip', 'blackberry', 'blueberry'
--   )
--   ORDER BY slug;
--
-- Expected: 16 rows, all with descriptions starting with "Plant ..." or "Sow ..."
--
-- Spot-check redirects from old DB slugs:
--   curl -sI https://grow.godaisy.io/grow/species/columbine | head -1   # expect 308
--   curl -sI https://grow.godaisy.io/grow/species/aquilegia | head -1   # expect 200
--   curl -sI https://grow.godaisy.io/grow/species/helleborus | head -1  # expect 308
--   curl -sI https://grow.godaisy.io/grow/species/hellebore | head -1   # expect 200
