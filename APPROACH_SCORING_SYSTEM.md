# Approach Scoring System

**Last Updated:** November 20, 2025

**One-sentence summary:**
"For each species, we look at its best habitats and techniques, compare those to today's conditions, and recommend the combo that should fish best right now."

---

## Overview

The approach scoring system provides **context-aware, real-time recommendations** for WHERE and HOW to fish each species based on current environmental conditions.

Similar to how the bait scoring system works (`scoreBaitsByConditions.ts`), this system takes environmental data and scores fishing approaches to help anglers make better decisions TODAY.

---

## Architecture

The system is built in three layers:

```
Conditions → Habitat Scoring → Technique Scoring → Combined Approach Score
```

### 1. Habitat Scoring (`lib/findr/scoreHabitatsByConditions.ts`)

**Question:** "How well do today's conditions suit this habitat?"

Scores each habitat (0-100) based on:
- Wind speed & direction
- Wave height & swell
- Tide phase & current strength
- Water clarity (kd490)
- Time of day
- Water temperature

**Example:**
- `sandy_beach` scores high with 0.5-1.2m surf, light onshore wind, rising tide
- `rocky_shore` scores low with big swell (>1.5m) or strong onshore wind

### 2. Technique Scoring (`lib/findr/scoreTechniquesByConditions.ts`)

**Question:** "How well do today's conditions suit this technique?"

Scores each technique (0-100) based on:
- Wind speed (affects casting, lure action)
- Wave conditions (affects presentation)
- Tide strength (affects bottom contact, drift)
- Water clarity (affects lure visibility)
- Time of day (affects feeding behavior)

**Example:**
- `SPN` (Spinning) scores high with moderate chop, moving tide, clear water
- `FLY` (Fly Fishing) scores low with strong wind (>18kts) or murky water

### 3. Combined Approach (`lib/findr/scoreSpeciesApproach.ts`)

**Question:** "What's the best way to fish this species right now?"

For each species:
1. Takes its preferred habitats (1-3) and effective techniques (1-3)
2. Scores all valid combinations (habitat × technique)
3. Ranks by weighted score: **60% habitat + 40% technique**
4. Returns best combo with explanation

**Weighting rationale:**
"Habitat carries more weight (60%) because if you're on the wrong ground, the right technique won't save you. Technique covers the final optimization (40%)."

---

## Data Structures

### Input: Conditions

```typescript
interface ApproachConditions {
  // Wind
  wind_speed_kts?: number | null;
  wind_direction_deg?: number | null;

  // Waves & swell
  wave_height_m?: number | null;

  // Water conditions
  current_speed_ms?: number | null;
  kd490?: number | null;          // water clarity
  sea_temp_c?: number | null;

  // Tide
  tide_stage?: string | null;     // 'flooding', 'ebbing', 'high_slack', 'low_slack'

  // Time
  time_of_day?: 'dawn' | 'day' | 'dusk' | 'night' | null;
}
```

### Output: Scored Approach

```typescript
interface ScoredApproach {
  habitat: string;              // e.g., 'rocky_shore'
  habitatEmoji: string;         // e.g., '🪨'
  habitatScore: number;         // 0-100
  habitatReason: string;

  technique: string;            // e.g., 'SPN'
  techniqueName: string;        // e.g., 'Spinning'
  techniqueEmoji: string;       // e.g., '🎣'
  techniqueScore: number;       // 0-100
  techniqueReason: string;

  combinedScore: number;        // 0-100 (weighted)
  explanation: string;          // Human-readable
}
```

### Output: Species Approach

```typescript
interface SpeciesApproach {
  bestApproach: ScoredApproach;
  alternativeApproaches: ScoredApproach[];  // Score >= 60
  overallScore: number;                      // 0-100
  summaryText: string;                       // One-line summary
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { getSpeciesApproach } from '@/lib/findr/scoreSpeciesApproach';

const approach = getSpeciesApproach(
  ['rocky_shore', 'pier_harbor'],  // From species.preferred_habitats
  ['SPN', 'BOT'],                   // From species.effective_techniques
  {
    wind_speed_kts: 12,
    wave_height_m: 0.8,
    current_speed_ms: 0.4,
    kd490: 0.18,
    tide_stage: 'flooding',
    time_of_day: 'day',
    sea_temp_c: 16
  }
);

if (approach) {
  console.log(approach.summaryText);
  // "Spinning from Rocky Shore (Very Good)"

  console.log(approach.bestApproach.explanation);
  // "Perfect conditions for lure fishing, moderate wind creates perfect movement"

  console.log(approach.overallScore);
  // 82
}
```

### Display in UI

```typescript
import { formatApproachForDisplay } from '@/lib/findr/scoreSpeciesApproach';

const display = formatApproachForDisplay(approach);

// Show in species card:
{display.headline}           // "Best approach: Spinning from Rocky Shore"
{display.score}              // "Very Good (82/100)"
{display.explanation}        // Full explanation text

{display.alternatives.map(alt => (
  <div key={alt}>Also decent: {alt}</div>
))}
// "Also decent: Bottom Fishing from Pier / Harbour (68/100)"

{display.toughConditionsWarning && (
  <Warning>{display.toughConditionsWarning}</Warning>
)}
```

### Integration with Predictions API

Add to `pages/api/findr/predictions.ts`:

```typescript
import { getSpeciesApproach } from '@/lib/findr/scoreSpeciesApproach';

// After species matching, before returning results:
const enhancedPredictions = predictions.map(pred => {
  const approach = getSpeciesApproach(
    pred.preferred_habitats,
    pred.effective_techniques,
    {
      wind_speed_kts: conditions.wind_speed_kts,
      wave_height_m: conditions.wave_height_m,
      current_speed_ms: conditions.current_speed_ms,
      kd490: conditions.kd490,
      tide_stage: tideInfo?.stage,
      time_of_day: getTimeOfDay(),
      sea_temp_c: conditions.sea_temp_c
    }
  );

  return {
    ...pred,
    bestApproach: approach?.bestApproach,
    approachScore: approach?.overallScore,
    approachSummary: approach?.summaryText
  };
});
```

---

## Habitat Scoring Rules

### 🪨 Rocky Shore

**Base Score:** 70

**Thrives:**
- Waves: 0.3-1.0m (ideal swell height)
- Wind: 5-15kts (moderate movement)
- Current: >0.3 m/s (brings baitfish)
- Clarity: kd490 < 0.2 (clear water)

**Struggles:**
- Waves: >1.5m (big swell pushes fish off)
- Wind: >20kts (dangerous conditions)
- Waves: <0.2m (too calm)

**Explanation:**
"Rocky ground holds baitfish and predators in settled seas with movement. Big swell or onshore wind makes rocks dangerous and pushes fish off the edges."

---

### 🏝️ Sandy Beach

**Base Score:** 65

**Thrives:**
- Waves: 0.5-1.2m (perfect surf)
- Wind: 5-15kts (light to moderate onshore)
- Tide: flooding (rising tide)
- Clarity: 0.15-0.35 kd490 (slightly coloured)

**Struggles:**
- Waves: <0.3m (flat calm)
- Waves: >1.8m (heavy surf buries gear)

**Explanation:**
"Surf stirs up worms and crabs in the gutters. Flat calm makes beaches lifeless, heavy surf buries gear."

---

### 🏗️ Pier / Harbour

**Base Score:** 75

**Thrives:**
- Waves: >1.2m (shelter when coast is rough)
- Time: night/dusk (baitfish under lights)
- Current: 0.1-0.5 m/s (gentle flow)
- Wind: ≤10kts (sheltered fishing)

**Struggles:**
- Waves: >2.0m (swell wraps around walls)
- Current: >1.0 m/s (fast tide)

**Explanation:**
"Shelter and structure attract baitfish, brilliant at night. Strong swell wrapping around walls makes it unfishable."

---

### 🏞️ Estuary

**Base Score:** 70

**Thrives:**
- Tide: flooding/ebbing (moving water)
- Current: 0.3-0.8 m/s (steady flow)
- Clarity: kd490 > 0.25 (coloured water)
- Temp: >12°C (warmer water)

**Struggles:**
- Tide: slack (no movement)
- Clarity: kd490 < 0.1 (too clear)

**Explanation:**
"Steady tidal flow brings feeding fish into coloured water. Slack water or extreme freshwater run-off shuts fish down."

---

### 💧 Shallow Water

**Base Score:** 65

**Thrives:**
- Wind: ≤12kts + Waves: ≤0.8m (calm conditions)
- Time: day (sunlight)
- Temp: >15°C (warm water)
- Clarity: kd490 < 0.2 (clear)

**Struggles:**
- Waves: >1.2m (churns bottom)
- Wind: >18kts (spooks fish)

**Explanation:**
"Fish use shallows for feeding during stable conditions. Big wind or swell spooks fish and churns up the bottom."

---

### ⚓ Deep Water

**Base Score:** 65

**Thrives:**
- Waves: >1.5m (when shallows are rough)
- Current: >0.4 m/s (activates bottom feeders)
- Temp: <12°C (cooler water)

**Struggles:**
- Calm: wind <5kts + waves <0.5m (dead calm)
- Current: <0.1 m/s + wind <5kts (fish sulk)

**Explanation:**
"Deep marks fish well in heavier weather - wind matters less. Dead calm with no tide makes fish sulk on the bottom."

---

### 🪸 Wreck & Reef

**Base Score:** 75

**Thrives:**
- Waves: 0.5-1.5m (moderate swell)
- Current: 0.3-0.8 m/s (steady tide)
- Clarity: kd490 < 0.25 (clear water)

**Struggles:**
- Current: >1.2 m/s (too strong)
- Waves: >2.0m (big drift)

**Explanation:**
"Structure attracts baitfish and predators even in moderate swell. Very strong tide makes it hard to keep lures in the zone."

---

### 🛥️ Open Sea

**Base Score:** 65

**Thrives:**
- Wind: ≤15kts + Waves: ≤1.2m (stable)
- Clarity: kd490 < 0.15 (clear water)
- Temp: >16°C (warm water)
- Current: >0.5 m/s (current lines)

**Struggles:**
- Waves: >2.0m (heavy chop)
- Wind: >25kts (white-out)

**Explanation:**
"Stable conditions let pelagics hunt freely in clear water. Heavy chop and white-out scatter shoals and push fish deeper."

---

## Technique Scoring Rules

### BOT — Bottom Fishing

**Base Score:** 75

**Thrives:**
- Tide: 0.2-0.7 m/s + Waves: ≤1.5m (hold bottom)
- Clarity: kd490 > 0.3 (murky water OK)

**Struggles:**
- Waves: >2.0m (buries baits)
- Current: >1.2 m/s (can't hold)
- Very calm (tide <0.1 m/s + waves <0.3m)

---

### RLG — Running Ledger

**Base Score:** 70

**Thrives:**
- Tide: 0.1-0.5 m/s + Waves: ≤1.0m (gentle)
- Wind: ≤12kts (bite detection)

**Struggles:**
- Waves: >1.5m (loses sensitivity)
- Current: >0.8 m/s (too fast)

---

### FLF — Float Fishing

**Base Score:** 70

**Thrives:**
- Wind: ≤12kts + Waves: ≤0.6m (sheltered)
- Clarity: kd490 < 0.25 (clear water)
- Time: day (visual fishing)

**Struggles:**
- Wind: >18kts (uncontrollable)
- Waves: >1.0m (drags float)

---

### SPN — Spinning

**Base Score:** 75

**Thrives:**
- Wind: 5-15kts + Waves: 0.3-1.2m + Tide: >0.2 m/s (perfect lure conditions)
- Clarity: kd490 < 0.2 (clear water)
- Time: dawn/dusk (feeding time)

**Struggles:**
- Waves: >1.8m (messy seas)
- Wind: >22kts (casting impossible)
- Clarity: kd490 > 0.35 (too murky)

---

### JIG — Jigging

**Base Score:** 75

**Thrives:**
- Waves: 0.5-1.8m + Tide: ≤1.0 m/s (vertical control)
- Tide: 0.3-0.8 m/s (brings baitfish)

**Struggles:**
- Current: >1.5 m/s (can't stay vertical)
- Waves: >2.5m (depth control difficult)

---

### TRL — Trolling

**Base Score:** 70

**Thrives:**
- Wind: 5-18kts + Waves: 0.5-1.5m + Clarity: <0.25 (ideal trolling)
- Temp: >16°C (pelagics at surface)

**Struggles:**
- Waves: >2.0m (too rough)
- Calm: wind <5kts + waves <0.3m (too calm)
- Clarity: kd490 > 0.35 (murky)

---

### FLY — Saltwater Fly

**Base Score:** 65

**Thrives:**
- Wind: ≤10kts + Clarity: <0.15 (perfect fly conditions)
- Tide: 0.2-0.6 m/s (moving water)
- Time: dawn/dusk (sight fishing)

**Struggles:**
- Wind: >18kts (casting impossible)
- Clarity: kd490 > 0.3 (ruins sight fishing)

---

### SURF — Surfcasting

**Base Score:** 75

**Thrives:**
- Waves: 0.5-1.5m (clean surf)
- Wind: 5-15kts (moderate onshore)
- Tide: flooding (rising tide)

**Struggles:**
- Waves: <0.3m (flat seas)
- Waves: >2.0m (storm surf)
- Wind: >25kts (dangerous casting)

---

### EGI — Squid Jigs

**Base Score:** 70

**Thrives:**
- Wind: ≤12kts + Waves: ≤0.6m + Clarity: <0.2 (perfect for squid)
- Time: night/dusk (under lights)
- Temp: >14°C (squid active)

**Struggles:**
- Waves: >1.2m (shuts squid down)
- Clarity: kd490 > 0.3 (murky water)

---

### SAB — Sabiki / Bait Catching

**Base Score:** 75

**Thrives:**
- Wind: ≤18kts + Waves: ≤1.2m (calm enough)
- Time: night (baitfish under lights)
- Current: >0.3 m/s (brings baitfish)

**Struggles:**
- Waves: >1.8m (tangles rigs)
- Clarity: kd490 > 0.4 (muddy water)

---

## Edge Cases & Error Handling

### No Good Combo (All scores < 40)

**Internal:** Mark as "Tough conditions"

**UI Message:**
"Conditions aren't ideal for this species right now – you might still catch, but the odds are lower than usual."

---

### Missing Data from APIs

**Internal:** Fall back to rectangle-average or historical typicals

**UI Message:**
"Live wave data is missing – using typical conditions for this area instead."

---

### Multiple Habitats Tie

**Internal:** Sort by habitatScore, then techniqueScore, then bias toward shore over boat

**UI Message:**
"Rocky ledges and harbour walls both score well – choose whichever is safer and easier to reach."

---

## Integration Checklist

- [ ] Add approach scoring to `lib/findr/mapPrediction.ts`
- [ ] Extend predictions API response with approach data
- [ ] Add tide phase detection (calculate from tide API)
- [ ] Add time of day calculation (from user timezone)
- [ ] Update species card UI to show best approach
- [ ] Add "Why this works" explanation section
- [ ] Add alternative approaches section
- [ ] Add "tough conditions" warning banner
- [ ] Add help/info tooltips with habitat/technique explanations
- [ ] Add approach score to prediction confidence calculation (optional)

---

## Testing

See `scripts/test-approach-scoring.ts` for examples and test cases.

Run tests:
```bash
npm run env:sync
npx tsx scripts/test-approach-scoring.ts
```

---

## Future Enhancements

1. **Boat access filter**: Only show boat techniques if user has boat access
2. **Safety warnings**: Red flag dangerous combinations (e.g., rocks in storm)
3. **Tidal windows**: Show optimal time windows within the day
4. **Regional variations**: Different rules for Mediterranean vs Atlantic
5. **User feedback loop**: Learn from catch logs to refine scoring
6. **Weather forecast**: Show how approach score changes over next 3 days
7. **Accessibility scoring**: Factor in travel time, parking, access difficulty

---

## Related Documentation

- `scoreBaitsByConditions.ts` - Bait scoring system (similar pattern)
- `mapPrediction.ts` - Species environmental matching
- `CONFIDENCE_SCORING_ALGORITHM.md` - Prediction confidence system
- `FINDR_VALIDATION_SYSTEM.md` - Catch validation and feedback loop
