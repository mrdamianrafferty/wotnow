# Working with Grow Daisy Data

**Read this when:** drafting content that ties into the database, writing migration CSVs (especially the RHS hardiness migration), or specifying new columns / schema.

## The plant_species table

The `plant_species` table is the canonical store. It has 50k+ rows across 8 languages. Key columns relevant to expert content:

- `slug` — the URL identifier (`tomato`, `runner-bean`, `solanum-lycopersicum`)
- `name` — common name (English by default)
- `scientific_name` — Latin binomial
- `description` — long-form description
- `advice` — top-tip / one-liner
- `category` — vegetable / fruit / herb / flower / tree / shrub etc.
- `sun_requirements`, `soil_type`, `plant_size`
- `usda_zone_min`, `usda_zone_max` — current hardiness fields (USDA-based; needs RHS migration — see `GROW_DAISY_PHASE_1_PLAN.md` Step 1)
- `search_terms` — alternate names and synonyms

## Adjacent tables (when relevant)

- `species_companions` (or equivalent) — companion-planting pairs
- `species_threats` — pest/disease links
- `species_translations` — non-English variants of `name`, `description`, `advice`

Confirm exact column names against `DATABASE_SCHEMA_REFERENCE.md` before writing migrations — schema drifts.

## CSV format for the RHS hardiness migration

Output rows in the format:

```
slug, common_name, scientific_name, usda_min, usda_max, rhs_min, rhs_max, notes
tomato, Tomato, Solanum lycopersicum, 10, 11, H1c, H1c, Frost-tender; treated as annual outdoors
apple, Apple, Malus domestica, 4, 8, H5, H6, Hardiness varies by rootstock and cultivar
```

Always include a `notes` column — it captures rationale and edge cases that the code can't infer. Single-rating cells are fine where a plant has a narrow range; ranges are fine where cultivars vary materially.

## Tone for app-facing fields

The `advice` and `description` columns are read by humans inside the app. Voice rules (in `grow-content-voice`) apply. Specifically:

- `advice` is a Dowding-style one-liner — imperative, direct, ≤120 chars.
- `description` is editorial — Monty Don × Beth Chatto — opening sentence does work, no encyclopaedia tone.
