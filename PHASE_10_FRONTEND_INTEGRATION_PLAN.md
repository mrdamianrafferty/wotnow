# Phase 10 Frontend Integration Plan

**Date:** 12 October 2025  
**Status:** In Progress  
**Goal:** Display real-time environmental data and freshness indicators in prediction cards

---

## 📊 Current State

### ✅ Backend (Phase 10 Complete)
- `get_environmental_predictions_basic()` function returns `data_freshness` field
- `factors` JSONB includes actual temperature, salinity, depth, substrate
- `weight_profile` shows guild (pelagic, reef_kelp, benthic, etc.)
- 324/325 rectangles have fresh data (< 24 hours)

### 🎯 Frontend Changes Needed

1. **Type Definitions** (`lib/findr/mapPrediction.ts`)
   - Add `data_freshness`, `weight_profile`, `factors` to `CardData` interface
   - Extract environmental data from prediction results

2. **Data Freshness Badge Component** (new file)
   - Green badge: "Fresh (< 24h)"
   - Yellow badge: "Recent (< 3 days)"
   - Orange badge: "Older (< 1 week)"
   - Red badge: "Stale (> 1 week)"

3. **Environmental Data Display**
   - Show actual temperature/salinity in card
   - Show guild badge with tooltip explaining weights
   - Show data age ("Updated 6 hours ago")

4. **Update Prediction Cards**
   - `pages/findr/index.tsx` - Add environmental info to `PredictionCardContent`
   - `components/findr/ActiveSpeciesCard.tsx` - Add data quality indicator
   - `components/findr/GoodSpeciesCard.tsx` - Add environmental summary
   - `components/findr/WaitingSpeciesCard.tsx` - Show why conditions aren't ideal

---

## 🚀 Implementation Steps

### Step 1: Update Type Definitions (5 mins)

**File:** `lib/findr/mapPrediction.ts`

```typescript
export interface CardData {
  // ... existing fields ...
  
  // NEW: Environmental data
  data_freshness?: 'fresh' | 'recent' | 'older' | 'stale';
  weight_profile?: 'pelagic' | 'surf_estuary' | 'reef_kelp' | 'benthic' | 'cephalopod' | 'default_coastal';
  environmental_factors?: {
    temperature?: { actual: number; match: string; score: number };
    salinity?: { actual: number; match: string; score: number };
    depth?: { actual: number; match: string; score: number };
    substrate?: { actual: string; match: string; score: number };
    data_age_hours?: number;
    data_source?: string;
  };
}
```

### Step 2: Create Data Freshness Badge Component (10 mins)

**File:** `components/findr/DataFreshnessBadge.tsx`

```typescript
interface DataFreshnessBadgeProps {
  freshness: 'fresh' | 'recent' | 'older' | 'stale';
  dataAgeHours?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const DataFreshnessBadge: React.FC<DataFreshnessBadgeProps> = ({
  freshness,
  dataAgeHours,
  size = 'sm'
}) => {
  const config = {
    fresh: { color: 'badge-success', icon: '🟢', label: 'Fresh Data' },
    recent: { color: 'badge-warning', icon: '🟡', label: 'Recent Data' },
    older: { color: 'badge-warning', icon: '🟠', label: 'Older Data' },
    stale: { color: 'badge-error', icon: '🔴', label: 'Stale Data' }
  }[freshness];

  const timeAgo = dataAgeHours 
    ? dataAgeHours < 24 
      ? `${Math.round(dataAgeHours)}h ago`
      : `${Math.round(dataAgeHours / 24)}d ago`
    : null;

  return (
    <div className={`badge ${config.color} badge-${size} gap-1`}>
      <span>{config.icon}</span>
      <span>{timeAgo || config.label}</span>
    </div>
  );
};
```

### Step 3: Create Guild Badge Component (10 mins)

**File:** `components/findr/GuildBadge.tsx`

```typescript
interface GuildBadgeProps {
  guild: string;
  showTooltip?: boolean;
}

const GUILD_INFO = {
  pelagic: {
    label: 'Pelagic',
    icon: '🌊',
    weights: 'Temp 38% • Sal 27% • Depth 20% • Substrate 15%',
    description: 'Open water species. Highly temperature-sensitive.'
  },
  surf_estuary: {
    label: 'Surf/Estuary',
    icon: '🏖️',
    weights: 'Temp 33% • Sal 22% • Depth 23% • Substrate 22%',
    description: 'Coastal zones. Tolerates varied salinity.'
  },
  reef_kelp: {
    label: 'Reef/Kelp',
    icon: '🪨',
    weights: 'Temp 25% • Sal 18% • Depth 22% • Substrate 35%',
    description: 'Rocky habitats. Substrate-driven.'
  },
  benthic: {
    label: 'Benthic',
    icon: '⚓',
    weights: 'Temp 28% • Sal 20% • Depth 22% • Substrate 30%',
    description: 'Bottom-dwellers. Substrate-dependent.'
  },
  cephalopod: {
    label: 'Cephalopod',
    icon: '🦑',
    weights: 'Temp 32% • Sal 23% • Depth 22% • Substrate 23%',
    description: 'Squid/octopus. Balanced preferences.'
  },
  default_coastal: {
    label: 'Coastal',
    icon: '🐟',
    weights: 'Temp 30% • Sal 20% • Depth 25% • Substrate 25%',
    description: 'General coastal species.'
  }
};

export const GuildBadge: React.FC<GuildBadgeProps> = ({ guild, showTooltip = true }) => {
  const info = GUILD_INFO[guild] || GUILD_INFO.default_coastal;

  return (
    <div className="tooltip" data-tip={showTooltip ? `${info.description}\n${info.weights}` : undefined}>
      <div className="badge badge-outline gap-1">
        <span>{info.icon}</span>
        <span className="text-xs">{info.label}</span>
      </div>
    </div>
  );
};
```

### Step 4: Create Environmental Info Component (15 mins)

**File:** `components/findr/EnvironmentalInfo.tsx`

```typescript
interface EnvironmentalInfoProps {
  factors?: CardData['environmental_factors'];
  compact?: boolean;
}

export const EnvironmentalInfo: React.FC<EnvironmentalInfoProps> = ({
  factors,
  compact = false
}) => {
  if (!factors) return null;

  const getMatchColor = (match: string) => {
    if (match === 'optimal' || match === 'preferred') return 'text-success';
    if (match === 'tolerable' || match === 'acceptable' || match === 'suitable') return 'text-warning';
    return 'text-error';
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs">
        {factors.temperature && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.temperature.match)}`}>
            🌡️ {factors.temperature.actual}°C
          </span>
        )}
        {factors.salinity && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.salinity.match)}`}>
            🧂 {factors.salinity.actual} ppt
          </span>
        )}
        {factors.substrate && (
          <span className={`flex items-center gap-1 ${getMatchColor(factors.substrate.match)}`}>
            🪨 {factors.substrate.actual}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {factors.temperature && (
        <div className="flex items-center justify-between">
          <span className="text-base-content/60">🌡️ Temp:</span>
          <span className={`font-semibold ${getMatchColor(factors.temperature.match)}`}>
            {factors.temperature.actual}°C
          </span>
        </div>
      )}
      {factors.salinity && (
        <div className="flex items-center justify-between">
          <span className="text-base-content/60">🧂 Sal:</span>
          <span className={`font-semibold ${getMatchColor(factors.salinity.match)}`}>
            {factors.salinity.actual} ppt
          </span>
        </div>
      )}
      {factors.depth && (
        <div className="flex items-center justify-between">
          <span className="text-base-content/60">📏 Depth:</span>
          <span className={`font-semibold ${getMatchColor(factors.depth.match)}`}>
            {factors.depth.actual}m
          </span>
        </div>
      )}
      {factors.substrate && (
        <div className="flex items-center justify-between">
          <span className="text-base-content/60">🪨 Substrate:</span>
          <span className={`font-semibold ${getMatchColor(factors.substrate.match)}`}>
            {factors.substrate.actual}
          </span>
        </div>
      )}
    </div>
  );
};
```

### Step 5: Update mapPrediction Function (10 mins)

**File:** `lib/findr/mapPrediction.ts`

Add extraction logic:

```typescript
export function mapPrediction(prediction: FishingPrediction, index: number): CardData | null {
  // ... existing code ...

  // NEW: Extract environmental data
  const data_freshness = firstString(prediction.data_freshness) as CardData['data_freshness'];
  const weight_profile = firstString(prediction.weight_profile) as CardData['weight_profile'];
  
  // Extract factors from JSONB
  const factors = prediction.factors ? {
    temperature: prediction.factors.temperature ? {
      actual: Number(prediction.factors.temperature.actual),
      match: String(prediction.factors.temperature.match),
      score: Number(prediction.factors.temperature.score)
    } : undefined,
    salinity: prediction.factors.salinity ? {
      actual: Number(prediction.factors.salinity.actual),
      match: String(prediction.factors.salinity.match),
      score: Number(prediction.factors.salinity.score)
    } : undefined,
    depth: prediction.factors.depth ? {
      actual: Number(prediction.factors.depth.actual),
      match: String(prediction.factors.depth.match),
      score: Number(prediction.factors.depth.score)
    } : undefined,
    substrate: prediction.factors.substrate ? {
      actual: String(prediction.factors.substrate.actual),
      match: String(prediction.factors.substrate.match),
      score: Number(prediction.factors.substrate.score)
    } : undefined,
    data_age_hours: prediction.factors.data_age_hours ? 
      Number(prediction.factors.data_age_hours) : undefined,
    data_source: prediction.factors.data_source ? 
      String(prediction.factors.data_source) : undefined
  } : undefined;

  return {
    // ... existing fields ...
    data_freshness,
    weight_profile,
    environmental_factors: factors
  };
}
```

### Step 6: Update PredictionCardContent (20 mins)

**File:** `pages/findr/index.tsx`

Add environmental info display to card:

```tsx
const PredictionCardContent: React.FC<PredictionCardContentProps> = ({
  card,
  // ... other props
}) => {
  // ... existing code ...

  return (
    <div className="card h-full bg-base-100 shadow-xl">
      <div className="card-body flex h-full flex-col gap-4 sm:gap-5">
        {/* ... existing image/header ... */}

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="card-title text-2xl sm:text-3xl leading-tight">
                <TranslatedFishName name={card.commonName} />
                {/* ... existing scientific name ... */}
              </h2>
              {card.confidence !== null && (
                <span className={confidenceBadgeClasses(card.confidence, 'sm')}>
                  {card.confidence}% <TranslatedText text="biting" />
                </span>
              )}
              
              {/* NEW: Guild Badge */}
              {card.weight_profile && (
                <GuildBadge guild={card.weight_profile} />
              )}
              
              {/* NEW: Data Freshness Badge */}
              {card.data_freshness && (
                <DataFreshnessBadge 
                  freshness={card.data_freshness}
                  dataAgeHours={card.environmental_factors?.data_age_hours}
                />
              )}
            </div>
          </div>
          {/* ... existing info button ... */}
        </div>

        {/* ... existing summary ... */}

        {/* NEW: Environmental Conditions */}
        {card.environmental_factors && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
              🌊 Current Conditions
            </p>
            <EnvironmentalInfo factors={card.environmental_factors} />
          </div>
        )}

        {/* ... rest of existing card content ... */}
      </div>
    </div>
  );
};
```

---

## 🎯 Expected Results

### Before:
```typescript
{
  commonName: "Sea Bass",
  confidence: 96,
  // No environmental data shown
}
```

### After:
```typescript
{
  commonName: "Sea Bass",
  confidence: 96,
  data_freshness: "fresh",               // Badge: 🟢 6h ago
  weight_profile: "reef_kelp",           // Badge: 🪨 Reef/Kelp
  environmental_factors: {
    temperature: { actual: 16.5, match: "optimal", score: 0.075 },
    salinity: { actual: 35.1, match: "optimal", score: 0.054 },
    substrate: { actual: "mixed", match: "acceptable", score: 0.245 },
    depth: { actual: 15, match: "optimal", score: 0.077 },
    data_age_hours: 6.2,
    data_source: "met"
  }
}
```

**UI Display:**
```
🐟 Sea Bass (Dicentrarchus labrax)
[96% biting] [🪨 Reef/Kelp] [🟢 6h ago]

🌊 Current Conditions
────────────────────────────────
🌡️ Temp:      16.5°C ✅ (Optimal)
🧂 Salinity:   35.1 ppt ✅ (Optimal)
📏 Depth:      15m ✅ (Optimal)
🪨 Substrate:  mixed ⚠️ (Acceptable)

Updated 6 hours ago • Source: MET Norway
```

---

## ⏱️ Timeline

- **Step 1:** Update types (5 mins)
- **Step 2:** DataFreshnessBadge component (10 mins)
- **Step 3:** GuildBadge component (10 mins)
- **Step 4:** EnvironmentalInfo component (15 mins)
- **Step 5:** Update mapPrediction (10 mins)
- **Step 6:** Update PredictionCardContent (20 mins)
- **Step 7:** Update ActiveSpeciesCard (15 mins)
- **Step 8:** Update GoodSpeciesCard (10 mins)
- **Step 9:** Update WaitingSpeciesCard (10 mins)
- **Step 10:** Testing & polish (15 mins)

**Total:** ~2 hours

---

## 🧪 Testing Checklist

- [ ] Data freshness badges display correctly (fresh/recent/older/stale)
- [ ] Guild badges show correct icons and tooltips
- [ ] Environmental factors display with correct colors (green/yellow/red)
- [ ] Data age shows correctly ("6h ago", "2d ago")
- [ ] Cards work on mobile (responsive)
- [ ] Tooltips readable and informative
- [ ] No TypeScript errors
- [ ] Backwards compatible (cards without environmental data still work)

---

## 🚀 Deployment Steps

1. Create new components (DataFreshnessBadge, GuildBadge, EnvironmentalInfo)
2. Update type definitions in mapPrediction.ts
3. Update mapPrediction function to extract new data
4. Update all card components (PredictionCardContent, ActiveSpeciesCard, etc.)
5. Test locally with real prediction data
6. Deploy to production

---

## 📝 Notes

- **Backwards compatibility:** All new fields are optional, so existing predictions without environmental data will continue to work
- **Data source:** MET Norway provides most data, fallback to Open-Meteo/Stormglass
- **Salinity:** Currently null in most records (Phase 10.2 will fix)
- **Substrate:** Currently inferred from region (Phase 10.1 will connect EMODnet)

