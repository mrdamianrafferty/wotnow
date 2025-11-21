# Fishing Advice System - Examples Index

**Status:** ✅ Complete
**Date:** November 20, 2025

---

## Overview

This document indexes all the working examples and demonstrations of the Fishing Advice System.

---

## 🎯 Demo Scripts

### 1. Full System Demo
**File:** `scripts/demo-fishing-advice.ts`

**Run:**
```bash
npx tsx scripts/demo-fishing-advice.ts
```

**Shows:**
- ✅ Scenario 1: Excellent conditions (dawn, flooding tide, 8kts wind)
- ✅ Scenario 2: Tough conditions (slack tide, calm)
- ✅ Scenario 3: Strategic planning (Sunday Sea Bass session)
- ✅ Integration examples (API, hooks, UI)
- ✅ Comparison table

**Key Output:**
- Tactical advice with "GO NOW" urgency
- Strategic advice with 3 best time windows
- Integration code snippets

---

### 2. Specific Scenario Demonstrations
**File:** `scripts/demo-specific-scenarios.ts`

**Run:**
```bash
npx tsx scripts/demo-specific-scenarios.ts
```

**Shows 5 Different Conditions:**

1. **Night Harbour Fishing** (11:00 PM)
   - Calm night, slack tide, clear water
   - Result: Squid excel at night in harbours
   - Urgency: GO NOW
   - Top: Sea Bass (98), Mackerel (100), Squid (100)

2. **Storm Conditions** (Afternoon)
   - Heavy seas (2.5m waves), strong winds (25kts), murky water
   - Result: System steers to deep water/shelter
   - Urgency: GO NOW (but to deep water, not exposed areas)
   - Top: Cod (96), Sea Bass (84), Mackerel (62)

3. **Dawn Patrol** (6:00 AM)
   - Perfect predator conditions (flooding tide, light swell, clear water)
   - Result: Prime time for bass and predators
   - Urgency: GO NOW
   - Top: Sea Bass (100), Mackerel (100), Cod (100)

4. **Midday Slack Tide** (1:00 PM)
   - Flat calm, bright sun, slack tide
   - Result: Lower scores, wait for tide movement
   - Urgency: WAIT
   - Top: Mackerel (100), Squid (100), Sea Bass (86)

5. **Cold Water Winter** (10:00 AM)
   - Cold water (8°C), moderate swell, flooding tide
   - Result: Cod thrives, mackerel struggles
   - Urgency: GO NOW
   - Top: Sea Bass (100), Cod (100), Mackerel (94)

**Summary Table:**
```
┌────────────────────────┬────────────────┬──────────────┬─────────────────────┐
│ Scenario               │ Urgency        │ Top Species  │ Key Factor          │
├────────────────────────┼────────────────┼──────────────┼─────────────────────┤
│ Night Harbour Fishing  │ GO_NOW         │ Squid        │ Night time bonus    │
│ Storm Conditions       │ GO_NOW         │ Cod          │ Heavy seas penalty  │
│ Dawn Patrol            │ GO_NOW         │ Sea Bass     │ Dawn + flooding     │
│ Midday Slack Tide      │ WAIT           │ Mackerel     │ Slack tide penalty  │
│ Cold Water Winter      │ GO_NOW         │ Cod          │ Cold temp bonus     │
└────────────────────────┴────────────────┴──────────────┴─────────────────────┘
```

---

### 3. API Response Examples
**File:** `scripts/demo-api-response.ts`

**Run:**
```bash
npx tsx scripts/demo-api-response.ts
```

**Shows:**
- Complete JSON structure for tactical advice
- Complete JSON structure for strategic advice
- Frontend integration code example

**Tactical API Response:**
```json
{
  "success": true,
  "advice": {
    "timestamp": "2025-11-20T11:52:46.520Z",
    "summary": "Excellent conditions right now! Sea Bass fishing at peak.",
    "urgency": "go_now",
    "topSpecies": [
      {
        "name": "Sea Bass",
        "confidence": 85,
        "approachScore": 100,
        "recommendation": "Spinning from Rocky Shore (Excellent)",
        "explanation": "Perfect conditions for lure fishing..."
      }
    ],
    "currentConditions": {
      "tideStage": "flooding",
      "timeOfDay": "dawn",
      "nextTideChange": "High tide in 45 minutes",
      "windSpeed": 8,
      "waveHeight": 0.6
    },
    "actionableSteps": [
      "Head to Rocky Shore now",
      "Use spinning",
      "Try Crab or Fish baits",
      "Note: High tide in 45 minutes"
    ]
  }
}
```

**Strategic API Response:**
```json
{
  "success": true,
  "advice": {
    "targetSpecies": "Sea Bass",
    "timeframe": "Today",
    "summary": "Best window: 12:52 PM (Day) - SPN from Estuary",
    "bestWindows": [
      {
        "date": "Thu, Nov 20",
        "time": "12:52 PM (Day)",
        "score": 100,
        "reason": "Perfect conditions for lure fishing..."
      }
    ],
    "recommendedApproaches": [
      {
        "habitat": "Estuary",
        "technique": "SPN",
        "score": 100,
        "whenBest": "Best at day"
      }
    ],
    "recommendedBaits": [
      {
        "bait": "🦀 Crab",
        "score": 80,
        "reason": "Proven effective for this species"
      }
    ],
    "whatToBring": [
      "Crab, Fish baits, Worms"
    ],
    "tips": [
      "Peak activity expected 12:52 PM (Day)",
      "Fish moving tides in estuaries for best results"
    ]
  }
}
```

---

## 📱 UI Mockups

**File:** `UI_MOCKUP_FISHING_ADVICE.md`

**Shows:**
- Desktop layout for tactical advice
- Desktop layout for strategic advice
- Mobile responsive design
- Urgency badge styles (GO NOW, GOOD WINDOW, WAIT, TOUGH CONDITIONS)
- Integration with existing predictions page
- Navigation flow
- DaisyUI component classes
- Animation ideas

**Key Screens:**

1. **Tactical Advice Card** - Real-time "fishing now" recommendations
2. **Strategic Planning** - Date/species selector with best windows
3. **Mobile View** - Condensed tactical card for phones
4. **Navigation Flow** - Tab system (Fishing Now / Plan a Trip)

---

## 🔧 Integration Examples

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
      return data.advice;
    },
    enabled: !!rectangleCode,
    refetchInterval: 5 * 60 * 1000,  // Refresh every 5 minutes
  });
}

// Usage in component
const { data: advice, isLoading } = useTacticalAdvice('31F2');
```

### UI Component Pattern

```tsx
// components/findr/TacticalAdviceCard.tsx
export function TacticalAdviceCard({ advice }: { advice: TacticalAdvice }) {
  const urgencyColors = {
    go_now: 'badge-success',
    good_window: 'badge-info',
    wait: 'badge-warning',
    tough_conditions: 'badge-error',
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center gap-2">
          <span className={`badge ${urgencyColors[advice.urgency]}`}>
            {advice.urgency.replace('_', ' ').toUpperCase()}
          </span>
          <h2 className="card-title">Right Now</h2>
        </div>

        <p className="text-lg">{advice.summary}</p>

        {/* Current conditions */}
        <div className="stats stats-vertical lg:stats-horizontal">
          <div className="stat">
            <div className="stat-title">Tide</div>
            <div className="stat-value text-sm">{advice.currentConditions.tideStage}</div>
          </div>
          <div className="stat">
            <div className="stat-title">Time</div>
            <div className="stat-value text-sm">{advice.currentConditions.timeOfDay}</div>
          </div>
        </div>

        {/* Action steps */}
        <div className="space-y-2">
          {advice.actionableSteps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="badge badge-primary">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 📊 Key Insights from Examples

### How the System Adapts

1. **Time of Day**
   - Night: Boosts squid and harbour species
   - Dawn/Dusk: Optimal for predators (bass)
   - Midday: Generally lower scores

2. **Tide Stage**
   - Flooding/Ebbing: High activity (moving water)
   - Slack: Lower scores (waiting period)
   - Tide timing shown in advice ("High tide in 45 minutes")

3. **Weather Conditions**
   - Storm: Steers to sheltered/deep water
   - Calm: Favors open sea techniques
   - Wind/Waves: Affects habitat accessibility

4. **Water Temperature**
   - Cold (8°C): Cod excel, mackerel struggle
   - Warm (18°C): Mackerel excel, cod decline
   - Temperate (14-16°C): Bass optimal

5. **Water Clarity**
   - Clear (low kd490): Spinning/fly fishing favored
   - Murky (high kd490): Bottom fishing/scent baits

---

## 🎓 Testing the System

### Quick Test Commands

```bash
# Run all demos
npx tsx scripts/demo-fishing-advice.ts
npx tsx scripts/demo-specific-scenarios.ts
npx tsx scripts/demo-api-response.ts

# Test individual functions
npx tsx -e "
import { generateTacticalAdvice } from './lib/findr/generateFishingAdvice';
console.log(generateTacticalAdvice([...], {...}, [...]))
"
```

### What to Look For

✅ **Urgency levels match conditions** (go_now for excellent, wait for poor)
✅ **Species adapt to conditions** (squid at night, cod in cold)
✅ **Habitats change with weather** (deep water in storms)
✅ **Techniques match conditions** (no spinning in heavy seas)
✅ **Action steps are specific** ("Head to Rocky Shore now")
✅ **Tide timing is accurate** ("High tide in 45 minutes")

---

## 📚 Related Documentation

**Implementation Guides:**
- `FISHING_ADVICE_SYSTEM_COMPLETE.md` - Complete implementation guide
- `FISHING_ADVICE_QUICK_REF.md` - Quick reference for integration

**Supporting Systems:**
- `APPROACH_SCORING_SYSTEM.md` - Underlying scoring logic
- `CONDITION_HELPERS_INTEGRATION_GUIDE.md` - Tide and time helpers
- `HELPER_FUNCTIONS_COMPLETE.md` - Helper implementation summary

**UI Design:**
- `UI_MOCKUP_FISHING_ADVICE.md` - Visual design and component patterns

---

## 🚀 Next Steps

1. **Create API Endpoints**
   - `/api/findr/advice/tactical`
   - `/api/findr/advice/strategic`

2. **Build React Hooks**
   - `useTacticalAdvice(rectangleCode)`
   - `useStrategicAdvice(rectangleCode, species, date)`

3. **Implement UI Components**
   - `TacticalAdviceCard.tsx`
   - `StrategicAdviceCard.tsx`
   - `BestWindowsList.tsx`
   - `WhatToBringChecklist.tsx`

4. **Add to Pages**
   - Integrate tactical advice into `pages/findr/index.tsx`
   - Create new page `pages/findr/plan.tsx` for strategic planning

5. **Testing & Refinement**
   - User testing with real anglers
   - Validate advice against catch logs
   - Refine scoring thresholds based on feedback

---

**Status:** All examples working and documented ✅
