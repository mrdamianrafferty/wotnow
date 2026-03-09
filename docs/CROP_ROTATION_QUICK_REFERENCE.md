# Crop Rotation Quick Reference Card

**For Grow Daisy Developers & Educators**

---

## The 3 Essential Rotation Rules

| Rule | Reason | Action |
|------|--------|--------|
| **No Solanaceae→Solanaceae (5 yr gap)** | Late blight, verticillium wilt persist | Tomato→Tomato? Never. Tomato→Potato? Never. |
| **No Brassicaceae→Brassicaceae (3 yr gap)** | Clubroot persists 10+ years if present | Cabbage→Cabbage? Wait 3+ years minimum. |
| **Legume→Heavy Feeder = Nitrogen Win** | Legume fixes nitrogen; next crop benefits | Peas (spring)→Brassicas (autumn) = perfect. |

---

## Plant Families Quick ID

**Heavy Feeders (exhaust nitrogen):**
- Brassicaceae: Cabbage, broccoli, kale, cauliflower
- Solanaceae: Tomato, potato, pepper, eggplant
- Cucurbitaceae: Courgette, pumpkin, cucumber, squash

**Nitrogen Fixers (restore nitrogen):**
- Fabaceae: Pea, broad bean, runner bean, French bean

**Light Feeders (don't deplete):**
- Alliaceae: Onion, garlic, leek, shallot
- Apiaceae: Carrot, parsnip, celery, fennel
- Amaranthaceae: Spinach, chard, beetroot
- Asteraceae: Lettuce, endive, chicory

---

## 3-Year Rotation for Any Garden Size

### 3-Bed Garden (RECOMMENDED)
```
Year 1:  Bed A: Heavy feeders (Brassica)    | Bed B: Legumes       | Bed C: Light feeders (Carrot, onion)
Year 2:  Bed A: Light feeders               | Bed B: Brassica      | Bed C: Legumes
Year 3:  Bed A: Legumes                     | Bed B: Light feeders | Bed C: Brassica
Year 4:  Repeat from Year 1
```

### 2-Bed Garden (Simple)
```
Year 1:  Bed A: Heavy (spring) + Light (winter) | Bed B: Legumes (spring) + Brassica (autumn)
Year 2:  Rotate beds
Year 3:  Repeat Year 1
```

### 4-Bed Garden (Ideal)
```
Add: Bed D = Alliums/storage crops
Rotate all beds clockwise each year
```

---

## "Never Follows" Cheat Sheet

| If You Planted... | DO NOT Plant This Year | Wait Until Year... |
|---|---|---|
| Tomato or Potato | Tomato, pepper, eggplant | 5 |
| Cabbage, broccoli, kale | Any Brassica | 3 |
| Carrot, parsnip | Carrot family (celery, fennel, parsley) | 2 |
| Garlic, onion, leek | Any Allium | 2 |
| ANY vegetable | Similar family ✓ | General rule varies |

---

## Best Follows (Synergies)

| Planted This Year | Plant Next Year | Why |
|---|---|---|
| Heavy feeder (Brassica, Solanaceae) | Legume (pea, bean) | Light demand, lets soil recover |
| Legume (pea, bean) | Heavy feeder (Brassica, Solanaceae) | Nitrogen benefit carries forward |
| Root crop (Carrot, beet) | Brassica | Deep roots improve structure for shallow feeders |
| Brassica | Allium (onion, garlic) | Clean transition; reset soil |

---

## Atlantic Climate Tweaks (Spain, UK, Brittany)

| Issue | Standard Rule | Atlantic Adjustment |
|---|---|---|
| Blight (Solanaceae) | 4-year gap | **5-year gap** (wet seasons) |
| Clubroot (Brassica) | 3-year gap | **Consider 4 years** + lime soil to pH 7.0+ |
| Legume nitrogen | Available immediately | **Slower release** in cool soil (benefit extends through winter) |
| Cover crop gap | 6 weeks | Hairy vetch for winter; buckwheat for summer |

**Best seasonal pattern for Atlantic:**
- Spring (Feb-May): Peas, broad beans
- Summer (Jun-Aug): Tomatoes, courgettes
- Autumn (Sep-Oct): Plant brassicas, onions
- Winter (Nov-Feb): Harvest brassicas, prepare next bed

---

## What Info Does the App Need to Collect?

**Minimum (Phase 1):**
- Plant family name (Brassicaceae, Solanaceae, etc.) when planting
- Date removed from bed (already tracked)
- Optional: Diseases/pests observed

**Nice-to-have (Phase 2-3):**
- Yield/productivity
- Soil amendments added
- Weather conditions (rain, temperature)
- User region (to adjust climate rules)

---

## Cover Crops by Season

| Season | Crop | Family | Plant Date | Terminate | Benefit |
|---|---|---|---|---|---|
| **Winter** (8 months) | Hairy vetch | Fabaceae | Nov 1 | Mar 15 | +100-150 kg N/ha, deep roots, structure |
| **Winter** | Crimson clover | Fabaceae | Nov 1 | Mar 15 | +80-120 kg N/ha, edible leaves, pretty |
| **Winter** | Field beans | Fabaceae | Nov 1 | Mar 15 | +150+ kg N/ha, large plants, edible |
| **Summer** (8 weeks) | Buckwheat | Polygonaceae | May 15 | Jul 30 | Phosphorus mobilizer, pollinators, fast |
| **Summer** | Borage | Boraginaceae | May 15 | Aug 31 | Pollinators, edible flowers, pest repellent |

---

## Disease & Pest Persistence in Soil

| Pathogen | Family | Years Persistence | Atlantic Climate Severity |
|---|---|---|---|
| Late blight (Phytophthora) | Solanaceae | 3-5 in soil | **SEVERE** (wet, cool = blight heaven) |
| Clubroot (Plasmodiophora) | Brassicaceae | 10-15 once established | **SEVERE** in wet, acidic clay |
| White rot (Allium) | Alliaceae | 8-10 | Moderate (less common in damp climates) |
| Verticillium | Solanaceae | 5-10 | Moderate (spore-dependent) |
| Fusarium | Cucurbitaceae | 3-5 | Low (prefers dry conditions) |

---

## How to Explain Rotation to Users

**For Complete Beginners:**
"Move plant families around each year. It's like musical chairs for vegetables—prevents bugs from finding them."

**For Engaged Users:**
"Rotation balances soil nutrients naturally. Legumes restore nitrogen; heavy feeders use it. Alternating prevents pest buildup (e.g., blight spores don't survive 5 years waiting for tomatoes)."

**For Gardeners Who Care About Science:**
"Each plant family attracts specific soil-borne pathogens and depletes different nutrients. Rotation breaks pathogen life cycles and prevents single-nutrient depletion. Legume nitrogen fixation is real: 100-150 kg/ha added to soil annually."

---

## Rotation Scheme Selection (For UI)

**User has:**
- **2 beds** → Use "2-bed simple 3-year" (seasonal variety within beds)
- **3 beds** → Use "3-year strict" (RECOMMENDED—perfect rotation)
- **4 beds** → Use "4-year strict" (ultra-clean rotation)
- **5+ beds** → Custom rotation or 5-year scheme
- **1 bed or doesn't want rotation** → Allow mixed planting, but track families for future advice

---

## Common Gardener Mistakes (& What the App Should Warn About)

| Mistake | Why It's Bad | App Warning |
|---|---|---|
| Tomato → Tomato every year | Blight accumulates | 🔴 STRONG WARNING |
| Cabbage family 2 years running | Clubroot gets established | 🔴 STRONG WARNING |
| Heavy feeder → Heavy feeder | Nitrogen exhaustion | 🟡 Medium warning |
| Forgetting planting dates | Can't calculate rotation | Remind to record dates |
| Adding cover crop for "looks" not benefit | Missed soil improvement | 🟢 Educate (nice-to-have) |
| Planting same family in every zone | Defeats rotation purpose | 🟡 Medium warning |

---

## Algorithm Pseudocode for Recommendations

```
function suggestNextFamily(bed_id):
  plantings = query last 5 plantings from bed_id

  if plantings.empty:
    return all families ranked by usefulness

  last_family = plantings[0].family
  years_since = today - plantings[0].removed_date

  # Build forbidden list
  forbidden = []
  if last_family in SOLANACEAE:
    if years_since < 5:
      forbidden.add(SOLANACEAE)
  if last_family in BRASSICA:
    if years_since < 3:
      forbidden.add(BRASSICA)
  [... more rules ...]

  # Rank suggestions
  suggestions = []
  if last_family is HEAVY_FEEDER and FABACEAE not in forbidden:
    suggestions.add(FABACEAE, score=10)  // nitrogen benefit!

  for family in ALL_FAMILIES:
    if family not in forbidden and family != last_family:
      suggestions.add(family, score=7-8)

  return sorted(suggestions, by: score)
```

---

## Useful Links for Developers

- Full guide: `CROP_ROTATION_EXPERT_GUIDE.md`
- Implementation plan: `CROP_ROTATION_IMPLEMENTATION_PLAN.md`
- API docs: `/api/grow/beds/[bedId]/rotation-suggestions`
- Database schema: `DATABASE_SCHEMA_REFERENCE.md`

---

## Decision Tree: Which Rotation Scheme?

```
Does user have <4 beds?
├─ Yes, 2-3 beds → 3-year rotation (rotate annually)
├─ Yes, 4+ beds → 4-year rotation (rotate annually)
└─ No data yet → Ask user, offer 3-year as default

Is user in Atlantic/wet climate?
├─ Yes → Use 5-year Solanaceae gap, suggest winter cover crops
└─ No → Use standard 4-year gaps, no special climate rules (Phase 4)

Does user want to track disease?
├─ Yes → Collect pest_disease_log on each planting
└─ No → Optional; still functional

Is user a beginner?
├─ Yes → Simplified UI, show only top 2 suggestions
└─ No (advanced) → Show all families, explain all rules
```

---

## Testing Checklist

- [ ] Solanaceae last year → Solanaceae forbidden this year
- [ ] Legume last year → Legume + Brassica compatible
- [ ] Empty bed history → All families suggested equally
- [ ] Cover crop suggestion appears for 6+ week gaps
- [ ] Atlantic climate rule (5yr vs 4yr) appears in UI
- [ ] Mixed bed tracking doesn't break rotation logic
- [ ] Disease tracking (if implemented) updates recommendations
- [ ] User can override suggestion if needed
- [ ] Suggestion persists when user plants (for history)

---

**Last Updated:** March 2026
**Author:** Horticulture Expert
**For:** Grow Daisy Development Team
