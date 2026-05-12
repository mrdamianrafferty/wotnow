# RHS Hardiness System and USDA Mapping

**Read this when:** rating a plant for UK conditions, writing the hardiness section of a species page, drafting the RHS hardiness migration CSV (see `GROW_DAISY_PHASE_1_PLAN.md` Step 1), or any USDA-to-RHS conversion question.

## The RHS H1a–H7 scale

The RHS H1a–H7 scale runs **opposite** to USDA: H1 is most tender, H7 most hardy. It's based on absolute minimum temperature the plant survives, not annual extreme mean.

- **H1a** — heated greenhouse, above 15°C. Tropical houseplants.
- **H1b** — cool or frost-free glasshouse, 10°C to 15°C. Many tender perennials.
- **H1c** — frost-free glasshouse or warm room, 5°C to 10°C. Most tomatoes (tender plants treated as annuals outdoors).
- **H2** — tender, cool/frost-free greenhouse, 1°C to 5°C. Citrus in pots, dahlias as tubers, many half-hardy bedding.
- **H3** — half-hardy, unheated greenhouse, mild winter outdoors, −5°C to 1°C. Olives in sheltered coastal gardens, many salvias, some agaves.
- **H4** — hardy, average winter, −10°C to −5°C. Lavender (most), most Mediterranean herbs, most hardy perennials, fig in sheltered gardens.
- **H5** — hardy, cold winter, −15°C to −10°C. Apple, pear, most UK natives, robust perennials.
- **H6** — hardy, very cold winter, −20°C to −15°C. Most fruit bushes, the hardier rose species.
- **H7** — very hardy, −20°C and below. Highland and arctic species.

## USDA mapping

USDA-to-RHS mapping is messy. A plant USDA 9–11 is not a single H rating — it depends on which end of USDA 9 you're at and what summer heat it needs. As a rough working guide for the Grow Daisy `plant_species` mapping:

| USDA zones tolerated | Approximate RHS rating |
|---|---|
| USDA 11 only | H1a |
| USDA 10–11 | H1b |
| USDA 9–11 | H1c or H2 (depends on summer heat need) |
| USDA 8–11 | H3 |
| USDA 7–11 | H4 |
| USDA 6–11 | H5 |
| USDA 5–11 | H6 |
| USDA 4 and below | H7 |

These mappings are coarse; the **top 200 UK-relevant species need manual review**.

## Notes per major crop

- **Tomato** — H1c (frost-tender; outdoor crop only after last frost). Common error: marking as H2 because the plant survives 1°C briefly. It doesn't survive a frost.
- **Potato** — H1c for the foliage (frost-tender); tubers themselves overwinter in mild soil but rarely reliably.
- **Apple** — H6 typically. Specific cultivars vary.
- **Lavender** — most are H4 or H5. *Lavandula stoechas* is more H3.
- **Avocado** — typically H2 in sheltered south-coast gardens; H3 at best with shelter; will not crop reliably in UK outdoors.
- **Fig (Ficus carica)** — H4 in mainland UK, often grown as a wall-trained specimen. Will not fruit reliably in upland or northern gardens.
- **Olive** — H3 in sheltered south-east and coastal gardens; will not crop reliably anywhere in UK.
- **Rosemary** — H4 typically; *Rosmarinus 'Miss Jessopp's Upright'* is hardier and more reliable than prostrate forms.
- **Asparagus** — H7 (very hardy once established); the crowns can take −20°C and below.
- **Strawberry** — H5 (the plant); flowers are frost-tender so March/April protection often needed.

When in doubt, give the rating range (H4–H5) and note the cultivar variance.

## CSV format for the hardiness migration

When suggesting RHS hardiness mappings for the 200-species migration (see `GROW_DAISY_PHASE_1_PLAN.md` Step 1), output rows in the format:

```
slug, common_name, scientific_name, usda_min, usda_max, rhs_min, rhs_max, notes
tomato, Tomato, Solanum lycopersicum, 10, 11, H1c, H1c, Frost-tender; treated as annual outdoors
apple, Apple, Malus domestica, 4, 8, H5, H6, Hardiness varies by rootstock and cultivar
```

Always include a `notes` column. Single-rating cells are fine where a plant has a narrow range; ranges are fine where cultivars vary materially.

## References

- [RHS — Hardiness ratings explained](https://www.rhs.org.uk/advice/rhs-hardiness-rating)
- [Gardens Illustrated — H-ratings vs USDA](https://www.gardensillustrated.com/plants/plant-hardiness-ratings-explained)
