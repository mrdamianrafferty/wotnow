# Fishing Advice Quick Reference

**Status:** ✅ Ready for Integration
**Last Updated:** November 20, 2025

---

## Quick Start

### Import Functions

```typescript
import {
  generateTacticalAdvice,
  generateStrategicAdvice,
  type TacticalAdvice,
  type StrategicAdvice,
  type SpeciesWithPreferences
} from '@/lib/findr/generateFishingAdvice';

import { getTideStage, getTimeOfDayFromCoordinates } from '@/lib/findr/conditionHelpers';
```

---

## Tactical Advice (Right Now)

### Basic Usage

```typescript
// 1. Fetch data
const predictions = await getPredictions(rectangleCode);
const conditions = await getCurrentConditions(rectangleCode);
const tides = await getTideData(lat, lon);

// 2. Generate advice
const advice = generateTacticalAdvice(
  predictions,
  {
    ...conditions,
    tide_stage: getTideStage(tides),
    time_of_day: getTimeOfDayFromCoordinates(lat, lon)
  },
  tides,
  { name: 'Portland Bill', lat, lon }
);

// 3. Use in UI
console.log(advice.urgency);         // 'go_now' | 'good_window' | 'wait' | 'tough_conditions'
console.log(advice.summary);         // "Excellent conditions right now!"
console.log(advice.topSpecies);      // Top 3 species with scores
console.log(advice.actionableSteps); // ["Head to rocky shore now", ...]
```

### API Endpoint Pattern

```typescript
// pages/api/findr/advice/tactical.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { rectangleCode } = req.query;

  const [predictions, conditions, rectangle] = await Promise.all([
    getPredictions(rectangleCode),
    getConditions(rectangleCode),
    getRectangle(rectangleCode)
  ]);

  const tides = await getTides(rectangle.center_lat, rectangle.center_lon);

  const advice = generateTacticalAdvice(
    predictions,
    {
      ...conditions,
      tide_stage: getTideStage(tides),
      time_of_day: getTimeOfDayFromCoordinates(rectangle.center_lat, rectangle.center_lon)
    },
    tides,
    { name: rectangle.name, lat: rectangle.center_lat, lon: rectangle.center_lon }
  );

  return res.json({ success: true, advice });
}
```

### React Hook Pattern

```typescript
// hooks/useTacticalAdvice.ts
import { useQuery } from '@tanstack/react-query';

export function useTacticalAdvice(rectangleCode: string | null) {
  return useQuery({
    queryKey: ['tactical-advice', rectangleCode],
    queryFn: async () => {
      if (!rectangleCode) return null;
      const res = await fetch(`/api/findr/advice/tactical?rectangleCode=${rectangleCode}`);
      const data = await res.json();
      return data.advice as TacticalAdvice;
    },
    enabled: !!rectangleCode,
    refetchInterval: 5 * 60 * 1000,  // Refresh every 5 minutes
    staleTime: 4 * 60 * 1000,        // Consider stale after 4 minutes
  });
}

// Usage
const { data: advice, isLoading } = useTacticalAdvice(rectangleCode);
```

---

## Strategic Advice (Planning Ahead)

### Basic Usage

```typescript
// 1. Fetch forecast data
const species = await getSpecies('BSS');
const forecast = await getForecast(rectangleCode, date);

// 2. Format forecast data
const conditionsOverTime = forecast.map(f => ({
  time: new Date(f.timestamp),
  conditions: {
    wind_speed_kts: f.wind_speed,
    wave_height_m: f.wave_height,
    current_speed_ms: f.current_speed,
    kd490: f.water_clarity,
    sea_temp_c: f.temperature,
    tide_stage: getTideStage(tides, new Date(f.timestamp)),
    time_of_day: getTimeOfDay('Europe/London', new Date(f.timestamp))
  }
}));

// 3. Generate advice
const advice = generateStrategicAdvice(
  species,
  conditionsOverTime,
  'Sunday, Nov 24'
);

// 4. Use in UI
console.log(advice.bestWindows);           // Top 3 time windows with scores
console.log(advice.recommendedApproaches); // Best habitat+technique combos
console.log(advice.whatToBring);           // Gear checklist
console.log(advice.tips);                  // Species-specific tips
```

### API Endpoint Pattern

```typescript
// pages/api/findr/advice/strategic.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { rectangleCode, speciesCode, date } = req.query;

  const [species, forecast, rectangle] = await Promise.all([
    getSpecies(speciesCode as string),
    getForecast(rectangleCode as string, date as string),
    getRectangle(rectangleCode as string)
  ]);

  const tides = await getTides(rectangle.center_lat, rectangle.center_lon);

  const conditionsOverTime = forecast.map(f => ({
    time: new Date(f.timestamp),
    conditions: {
      ...f,
      tide_stage: getTideStage(tides, new Date(f.timestamp)),
      time_of_day: getTimeOfDayFromCoordinates(
        rectangle.center_lat,
        rectangle.center_lon,
        new Date(f.timestamp)
      )
    }
  }));

  const advice = generateStrategicAdvice(
    species,
    conditionsOverTime,
    formatTimeframe(date as string)
  );

  return res.json({ success: true, advice });
}
```

### React Hook Pattern

```typescript
// hooks/useStrategicAdvice.ts
import { useQuery } from '@tanstack/react-query';

export function useStrategicAdvice(
  rectangleCode: string | null,
  speciesCode: string | null,
  date: string | null
) {
  return useQuery({
    queryKey: ['strategic-advice', rectangleCode, speciesCode, date],
    queryFn: async () => {
      if (!rectangleCode || !speciesCode || !date) return null;
      const res = await fetch(
        `/api/findr/advice/strategic?rectangleCode=${rectangleCode}&speciesCode=${speciesCode}&date=${date}`
      );
      const data = await res.json();
      return data.advice as StrategicAdvice;
    },
    enabled: !!rectangleCode && !!speciesCode && !!date,
    staleTime: 60 * 60 * 1000,  // 1 hour
  });
}

// Usage
const { data: advice, isLoading } = useStrategicAdvice(rectangleCode, 'BSS', '2025-11-24');
```

---

## UI Component Examples

### Tactical Advice Badge

```tsx
function UrgencyBadge({ urgency }: { urgency: TacticalAdvice['urgency'] }) {
  const config = {
    go_now: { color: 'badge-success', text: 'GO NOW', icon: '🎯' },
    good_window: { color: 'badge-info', text: 'GOOD WINDOW', icon: '✅' },
    wait: { color: 'badge-warning', text: 'WAIT', icon: '⏰' },
    tough_conditions: { color: 'badge-error', text: 'TOUGH', icon: '❌' }
  };

  const { color, text, icon } = config[urgency];

  return (
    <div className={`badge ${color} gap-2`}>
      <span>{icon}</span>
      <span>{text}</span>
    </div>
  );
}
```

### Action Steps List

```tsx
function ActionSteps({ steps }: { steps: string[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-bold">Action Plan:</h3>
      {steps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <span className="badge badge-primary badge-lg">{i + 1}</span>
          <span className="text-base">{step}</span>
        </div>
      ))}
    </div>
  );
}
```

### Best Windows Timeline

```tsx
function BestWindows({ windows }: { windows: StrategicAdvice['bestWindows'] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-bold">⏰ Best Fishing Windows:</h3>
      {windows.map((window, i) => (
        <div key={i} className="card bg-base-200">
          <div className="card-body">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold">{window.date}</p>
                <p className="text-sm text-base-content/70">{window.time}</p>
              </div>
              <div className="badge badge-primary badge-lg">{window.score}/100</div>
            </div>
            <p className="text-sm">{window.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### What to Bring Checklist

```tsx
function WhatToBring({ items }: { items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  return (
    <div className="space-y-2">
      <h3 className="font-bold">🎒 What to Bring:</h3>
      {items.map((item, i) => (
        <label key={i} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-primary"
            checked={checked.has(i)}
            onChange={() => {
              const next = new Set(checked);
              next.has(i) ? next.delete(i) : next.add(i);
              setChecked(next);
            }}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}
```

---

## Page Integration Examples

### Add to Main Predictions Page

```tsx
// pages/findr/index.tsx (existing predictions page)
import { useTacticalAdvice } from '@/hooks/useTacticalAdvice';

export default function FindrPage() {
  const { rectangleCode } = useFindrSettings();
  const { data: predictions } = useFishingPredictions(rectangleCode);
  const { data: tacticalAdvice } = useTacticalAdvice(rectangleCode);

  return (
    <div>
      {/* Existing predictions UI */}
      <PredictionsCards predictions={predictions} />

      {/* NEW: Tactical advice section */}
      {tacticalAdvice && (
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Right Now</h2>
          <TacticalAdviceCard advice={tacticalAdvice} />
        </section>
      )}
    </div>
  );
}
```

### Create Planning Page

```tsx
// pages/findr/plan.tsx (NEW)
import { useStrategicAdvice } from '@/hooks/useStrategicAdvice';
import { useState } from 'react';

export default function PlanPage() {
  const { rectangleCode } = useFindrSettings();
  const [selectedSpecies, setSelectedSpecies] = useState<string>('BSS');
  const [targetDate, setTargetDate] = useState<string>('2025-11-24');

  const { data: advice, isLoading } = useStrategicAdvice(
    rectangleCode,
    selectedSpecies,
    targetDate
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Plan Your Trip</h1>

      {/* Species and date selection */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="grid md:grid-cols-2 gap-4">
            <label className="form-control">
              <span className="label-text">Target Species</span>
              <select
                className="select select-bordered"
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
              >
                <option value="BSS">Sea Bass</option>
                <option value="MAC">Mackerel</option>
                <option value="FLE">Flounder</option>
                {/* ... more species */}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text">Date</span>
              <input
                type="date"
                className="input input-bordered"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Strategic advice display */}
      {isLoading && <div className="loading loading-spinner" />}
      {advice && <StrategicAdviceCard advice={advice} />}
    </div>
  );
}
```

---

## Common Patterns

### Fetch Predictions + Conditions in Parallel

```typescript
const [predictions, conditions, tides] = await Promise.all([
  fetch(`/api/findr/predictions?rectangleCode=${code}`).then(r => r.json()),
  fetch(`/api/findr/conditions?rectangleCode=${code}`).then(r => r.json()),
  fetch(`/api/tides?lat=${lat}&lon=${lon}`).then(r => r.json())
]);
```

### Enrich Conditions with Helpers

```typescript
const enrichedConditions = {
  ...rawConditions,
  tide_stage: getTideStage(tides),
  time_of_day: getTimeOfDayFromCoordinates(lat, lon)
};
```

### Format Time Windows for Display

```typescript
function formatTimeWindow(time: string, tideStage: string, timeOfDay: string): string {
  const date = new Date(time);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return `${timeStr} (${timeOfDay} + ${tideStage})`;
}
```

---

## Testing

### Run Demo

```bash
npx tsx scripts/demo-fishing-advice.ts
```

### Test Tactical Advice

```typescript
import { generateTacticalAdvice } from '@/lib/findr/generateFishingAdvice';

const advice = generateTacticalAdvice(
  mockSpecies,
  {
    wind_speed_kts: 8,
    wave_height_m: 0.6,
    current_speed_ms: 0.4,
    kd490: 0.15,
    tide_stage: 'flooding',
    time_of_day: 'dawn',
    sea_temp_c: 16
  },
  mockTides
);

console.log(advice.urgency);  // 'go_now'
```

### Test Strategic Advice

```typescript
import { generateStrategicAdvice } from '@/lib/findr/generateFishingAdvice';

const advice = generateStrategicAdvice(
  mockSpecies,
  mockForecast,
  'Sunday, Nov 24'
);

console.log(advice.bestWindows.length);  // 3
```

---

## Troubleshooting

### "Advice urgency is always 'wait'"
**Cause:** Low approach scores across all species
**Fix:** Check that `tide_stage` and `time_of_day` are being calculated correctly

### "Best windows array is empty"
**Cause:** No forecast windows scored >= 70
**Fix:** Check forecast data quality, ensure tide_stage is calculated for each time window

### "Bait recommendations missing"
**Cause:** Species data doesn't include `recommended_baits`
**Fix:** Ensure species records have populated `recommended_baits` array

---

## Related Documentation

- `FISHING_ADVICE_SYSTEM_COMPLETE.md` - Complete implementation guide
- `APPROACH_SCORING_SYSTEM.md` - Underlying approach scoring logic
- `CONDITION_HELPERS_INTEGRATION_GUIDE.md` - Tide and time helpers

---

**Status:** ✅ Ready for production integration
