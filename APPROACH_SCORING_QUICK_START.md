# Approach Scoring System - Quick Start Guide

**Status:** ✅ **READY TO INTEGRATE**

**One-sentence summary:**
"For each species, we look at its best habitats and techniques, compare those to today's conditions, and recommend the combo that should fish best right now."

---

## What's Been Built

Three scoring modules are **complete and tested**:

1. **`lib/findr/scoreHabitatsByConditions.ts`**
   - Scores 8 habitats (rocky_shore, sandy_beach, pier_harbor, estuary, shallow_water, deep_water, wreck_reef, open_sea)
   - Based on wind, waves, tide, clarity, time of day, temperature
   - Includes angler-friendly explanation strings

2. **`lib/findr/scoreTechniquesByConditions.ts`**
   - Scores 12 techniques (BOT, RLG, FLF, SLF, LRF, SPN, JIG, TRL, SAB, FLY, SURF, EGI)
   - Handles code normalization (TRL, trolling → TRL)
   - Based on sea conditions, wind, clarity, tide

3. **`lib/findr/scoreSpeciesApproach.ts`**
   - Combines habitat + technique scores (60/40 weighting)
   - Returns best approach + alternatives
   - Generates human-readable explanations

---

## Test Results

Run `npx tsx scripts/test-approach-scoring.ts` to see:

✅ **Perfect spinning conditions** → Rocky Shore + Spinning = 100/100
✅ **Classic beach day** → Sandy Beach + Surfcasting = 100/100
✅ **Rough weather** → Deep Water + Jigging = 96/100 (correctly avoids shore)
✅ **Flat calm** → Shallow Water + Spinning = 96/100 (still finds options)
✅ **Night harbour** → Pier/Harbour + EGI = 100/100 (squid under lights)
✅ **Estuary dawn** → Estuary + Fly = 100/100 (perfect fly conditions)

---

## Quick Integration

### Step 1: Add to Predictions API

In `pages/api/findr/predictions.ts`:

```typescript
import { getSpeciesApproach } from '@/lib/findr/scoreSpeciesApproach';

// After species matching, add approach scoring:
const enhancedPredictions = predictions.map(pred => {
  const approach = getSpeciesApproach(
    pred.preferred_habitats,
    pred.effective_techniques,
    {
      wind_speed_kts: conditions.wind_speed_kts,
      wave_height_m: conditions.wave_height_m,
      current_speed_ms: conditions.current_speed_ms,
      kd490: conditions.kd490,
      tide_stage: tideInfo?.stage || null,
      time_of_day: getTimeOfDay(),  // Need to implement
      sea_temp_c: conditions.sea_temp_c
    }
  );

  return {
    ...pred,
    bestApproach: approach?.bestApproach,
    approachScore: approach?.overallScore,
    approachSummary: approach?.summaryText,
    alternativeApproaches: approach?.alternativeApproaches
  };
});
```

### Step 2: Display in UI

In species card component:

```tsx
import { formatApproachForDisplay } from '@/lib/findr/scoreSpeciesApproach';

// In your species card component:
const display = formatApproachForDisplay(species.approach);

<div className="approach-section">
  <h3>{display.headline}</h3>
  <div className="score-badge" data-score={display.scoreValue}>
    {display.score}
  </div>
  <p className="explanation">{display.explanation}</p>

  {display.alternatives.length > 0 && (
    <details>
      <summary>Alternative approaches</summary>
      <ul>
        {display.alternatives.map(alt => (
          <li key={alt}>{alt}</li>
        ))}
      </ul>
    </details>
  )}

  {display.toughConditionsWarning && (
    <div className="warning">
      ⚠️ {display.toughConditionsWarning}
    </div>
  )}
</div>
```

---

## Required Helper Functions

You'll need to implement:

### 1. Tide Stage Detection

```typescript
function getTideStage(tideData: TidePoint[]): 'flooding' | 'ebbing' | 'high_slack' | 'low_slack' | null {
  // Calculate from tide API data
  // Based on current height vs next high/low
}
```

### 2. Time of Day Calculation

```typescript
function getTimeOfDay(timezone: string): 'dawn' | 'day' | 'dusk' | 'night' {
  // Calculate based on sun position or simple hour ranges:
  // dawn: 5am-7am
  // day: 7am-6pm
  // dusk: 6pm-8pm
  // night: 8pm-5am
}
```

---

## Code Normalization

The system handles mixed technique codes automatically:

- `TRL`, `trolling`, `drifting` → All normalize to `TRL`
- `SPN`, `spinning`, `soft_plastics` → All normalize to `SPN`
- `BOT`, `bottom_fishing`, `pier_fishing`, `chumming` → All normalize to `BOT`

**No database changes needed** - the mapping happens in code.

---

## Weighting Explained

**60% Habitat + 40% Technique = Combined Score**

Why this ratio?

- **Habitat is dominant** (60%): "Wrong ground won't save you"
  - If fish aren't there, technique doesn't matter
  - Example: Perfect lure technique won't catch cod on a beach

- **Technique optimizes** (40%): Final edge for success
  - Assumes you're on the right ground already
  - Example: Spinning vs Bottom fishing from same rocky shore

---

## Score Interpretation

| Score Range | Label | Meaning |
|-------------|-------|---------|
| 80-100 | Excellent | Ideal conditions for this approach |
| 70-79 | Very Good | Strong conditions, high chance of success |
| 60-69 | Good | Decent conditions, reasonable chance |
| 50-59 | Fair | OK conditions, lower odds |
| 40-49 | Challenging | Tough but possible |
| 0-39 | Tough | Not ideal, consider alternatives |

---

## Example Output

```typescript
{
  bestApproach: {
    habitat: 'rocky_shore',
    habitatEmoji: '🪨',
    habitatScore: 100,
    habitatReason: 'ideal swell height for rocky shore',

    technique: 'SPN',
    techniqueName: 'Spinning',
    techniqueEmoji: '🎣',
    techniqueScore: 100,
    techniqueReason: 'perfect conditions for lure fishing',

    combinedScore: 100,
    explanation: 'Perfect conditions for lure fishing, ideal swell height for rocky shore'
  },

  alternativeApproaches: [
    {
      habitat: 'rocky_shore',
      technique: 'BOT',
      techniqueName: 'Bottom Fishing',
      combinedScore: 98,
      explanation: '...'
    }
  ],

  overallScore: 100,
  summaryText: 'Spinning from Rocky Shore (Excellent)'
}
```

---

## Next Steps

### Immediate (Phase 1)
- [ ] Implement `getTideStage()` helper
- [ ] Implement `getTimeOfDay()` helper
- [ ] Add approach scoring to predictions API
- [ ] Test with real Findr conditions

### Short-term (Phase 2)
- [ ] Design UI components for approach display
- [ ] Add to species cards
- [ ] Add help/info tooltips
- [ ] Test with real users

### Future Enhancements
- [ ] Add boat access filter (only show boat techniques if available)
- [ ] Add safety warnings (red flag dangerous combinations)
- [ ] Show tidal windows (best times within the day)
- [ ] Regional variations (Mediterranean vs Atlantic rules)
- [ ] Learn from catch logs (refine scoring over time)

---

## Related Files

- **Implementation:**
  - `lib/findr/scoreHabitatsByConditions.ts`
  - `lib/findr/scoreTechniquesByConditions.ts`
  - `lib/findr/scoreSpeciesApproach.ts`

- **Documentation:**
  - `APPROACH_SCORING_SYSTEM.md` - Complete guide with all rules
  - `APPROACH_SCORING_QUICK_START.md` - This file

- **Testing:**
  - `scripts/test-approach-scoring.ts` - Test suite with 6 scenarios

---

## Questions?

**Q: Do I need to update the database?**
A: No! The system works with existing `preferred_habitats` and `effective_techniques` arrays.

**Q: What if technique codes are inconsistent?**
A: The system handles both short codes (`TRL`) and full names (`trolling`) automatically.

**Q: What if environmental data is missing?**
A: Each condition field is optional (`?`). Missing data is handled gracefully.

**Q: Can I adjust the weighting?**
A: Yes! Change `HABITAT_WEIGHT` and `TECHNIQUE_WEIGHT` in `scoreSpeciesApproach.ts`.

**Q: How do I add new habitats or techniques?**
A: Add a new entry to `HABITAT_CONDITION_RULES` or `TECHNIQUE_CONDITION_RULES` with scoring rules.

---

## Success Metrics

After integration, measure:

1. **Usage:** % of users who expand "Best Approach" section
2. **Accuracy:** Compare approach recommendations to catch logs
3. **Diversity:** Are different approaches recommended in different conditions?
4. **Feedback:** User ratings on approach helpfulness

---

**Ready to integrate!** 🎣

Start with Phase 1 helpers, then add to predictions API, then build UI components.
