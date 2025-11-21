# Favorites Advice Integration Guide

**Status:** ✅ Ready for Integration
**Use Case:** User-centric advice for their favorite species

---

## Overview

The favorites advice system answers two key user questions:

1. **Tactical**: "I'm interested in 7 species - which should I target TODAY and HOW?"
2. **Strategic**: "Show me the WEEK AHEAD for my favorites so I can plan trips and buy bait"

---

## User Flow

```
User has 7 favorite species
  ↓
Morning: Check tactical advice
  → "3 of your 7 favorites are active NOW"
  → "Target Sea Bass first at Rocky Shore with Spinning"
  → "Bring: Spinning rod, Crab, Worms"
  ↓
Planning: Check strategic advice
  → "5 of your 7 favorites have good windows this week"
  → "Best day: Tuesday (Sea Bass, Mackerel, Cod active)"
  → "Shopping list: Crab, Feathers, Worms"
  → "You'll need access to: Rocky Shore, Pier, Estuary"
```

---

## API Integration

### Tactical Advice Endpoint

```typescript
// pages/api/findr/advice/favorites/tactical.ts
import { generateFavoritesTacticalAdvice } from '@/lib/findr/generateFavouritesAdvice';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getTideStage, getTimeOfDayFromCoordinates } from '@/lib/findr/conditionHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServerClient(req, res);

  // Get user's session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { rectangleCode } = req.query;

  // Fetch user's favorites
  const { data: favorites } = await supabase
    .from('user_favourites')
    .select(`
      species_code,
      species:species!inner (
        species_code,
        name_en,
        preferred_habitats,
        effective_techniques,
        recommended_baits
      )
    `)
    .eq('user_id', user.id);

  if (!favorites || favorites.length === 0) {
    return res.status(400).json({ error: 'No favorites found. Please add some favorite species first.' });
  }

  // Fetch current conditions and predictions for those species
  const { data: predictions } = await supabase
    .from('findr_prediction_sessions')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .in('species_code', favorites.map(f => f.species_code))
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const { data: conditions } = await supabase
    .from('copernicus_data')
    .select('*')
    .eq('rectangle_code', rectangleCode)
    .order('captured_at', { ascending: false })
    .limit(1)
    .single();

  const { data: rectangle } = await supabase
    .from('ices_rectangles')
    .select('*')
    .eq('code', rectangleCode)
    .single();

  // Get tides
  const tideResponse = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tides?lat=${rectangle.center_lat}&lon=${rectangle.center_lon}`
  );
  const tideData = await tideResponse.json();

  // Enrich conditions
  const enrichedConditions = {
    wind_speed_kts: conditions.wind_speed_kts,
    wave_height_m: conditions.wave_height_m,
    current_speed_ms: conditions.current_speed_ms,
    kd490: conditions.kd490,
    sea_temp_c: conditions.sea_temp_c,
    tide_stage: getTideStage(tideData.data),
    time_of_day: getTimeOfDayFromCoordinates(rectangle.center_lat, rectangle.center_lon),
  };

  // Map favorites to species format
  const favoriteSpecies = favorites.map(f => ({
    species_code: f.species.species_code,
    name_en: f.species.name_en,
    preferred_habitats: f.species.preferred_habitats,
    effective_techniques: f.species.effective_techniques,
    recommended_baits: f.species.recommended_baits,
    confidence_score: predictions?.species_scores?.[f.species_code] || 50,
  }));

  // Generate tactical advice
  const advice = generateFavoritesTacticalAdvice(
    favoriteSpecies,
    enrichedConditions,
    tideData.data,
    {
      name: rectangle.name,
      rectangleCode: rectangle.code,
      lat: rectangle.center_lat,
      lon: rectangle.center_lon,
    }
  );

  return res.json({ success: true, advice });
}
```

### Strategic Advice Endpoint

```typescript
// pages/api/findr/advice/favorites/strategic.ts
import { generateFavoritesStrategicAdvice } from '@/lib/findr/generateFavouritesAdvice';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = getSupabaseServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { rectangleCode } = req.query;

  // Fetch user's favorites (same as tactical)
  const { data: favorites } = await supabase
    .from('user_favourites')
    .select('...')
    .eq('user_id', user.id);

  // Fetch 7-day forecast (hourly or 3-hourly)
  const weeklyForecast = await fetchWeeklyForecast(rectangleCode);

  // Generate strategic advice
  const advice = generateFavoritesStrategicAdvice(
    favoriteSpecies,
    weeklyForecast,
    { name: rectangle.name, rectangleCode: rectangle.code }
  );

  return res.json({ success: true, advice });
}
```

---

## React Hooks

```typescript
// hooks/useFavoritesTacticalAdvice.ts
import { useQuery } from '@tanstack/react-query';
import type { FavoritesTacticalAdvice } from '@/lib/findr/generateFavouritesAdvice';

export function useFavoritesTacticalAdvice(rectangleCode: string | null) {
  return useQuery({
    queryKey: ['favorites-tactical', rectangleCode],
    queryFn: async () => {
      if (!rectangleCode) return null;
      const res = await fetch(`/api/findr/advice/favorites/tactical?rectangleCode=${rectangleCode}`);
      const data = await res.json();
      return data.advice as FavoritesTacticalAdvice;
    },
    enabled: !!rectangleCode,
    refetchInterval: 5 * 60 * 1000,  // Refresh every 5 minutes
  });
}

// hooks/useFavoritesStrategicAdvice.ts
export function useFavoritesStrategicAdvice(rectangleCode: string | null) {
  return useQuery({
    queryKey: ['favorites-strategic', rectangleCode],
    queryFn: async () => {
      if (!rectangleCode) return null;
      const res = await fetch(`/api/findr/advice/favorites/strategic?rectangleCode=${rectangleCode}`);
      const data = await res.json();
      return data.advice;
    },
    enabled: !!rectangleCode,
    staleTime: 60 * 60 * 1000,  // 1 hour
  });
}
```

---

## UI Components

### Tactical Advice Card

```tsx
// components/findr/FavoritesTacticalCard.tsx
export function FavoritesTacticalCard({ advice }: { advice: FavoritesTacticalAdvice }) {
  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Your Favorites Today</h2>
        <p className="text-lg">{advice.summary}</p>

        {/* Active now */}
        {advice.activeNow.length > 0 && (
          <div>
            <h3 className="font-bold text-success flex items-center gap-2">
              <span className="text-2xl">🟢</span> Active Now
            </h3>
            <div className="space-y-3 mt-2">
              {advice.activeNow.map((species, i) => (
                <div key={i} className="card bg-success/10 border border-success/20">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{species.species.name}</h4>
                        <p className="text-sm opacity-70">{species.approach?.habitat}</p>
                      </div>
                      <span className="badge badge-success badge-lg">
                        {species.approach?.score}/100
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm">
                        <strong>🎣 {species.approach?.technique}</strong>
                      </p>
                      <p className="text-sm opacity-70">{species.approach?.explanation}</p>
                      <p className="text-sm mt-1">
                        🪱 {species.baits.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority advice */}
        <div className="divider" />
        <div className="bg-primary/10 p-4 rounded-lg">
          <h3 className="font-bold mb-2">🎯 Your Action Plan:</h3>
          <p className="mb-2">1️⃣ {advice.priorityAdvice.topChoice}</p>
          {advice.priorityAdvice.secondChoice && (
            <p className="mb-2">2️⃣ {advice.priorityAdvice.secondChoice}</p>
          )}

          <div className="mt-4">
            <h4 className="font-semibold mb-2">🎒 What to Bring:</h4>
            <div className="flex flex-wrap gap-2">
              {advice.priorityAdvice.whatToBring.map((item, i) => (
                <span key={i} className="badge badge-outline">{item}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming soon */}
        {advice.upcomingSoon.length > 0 && (
          <div className="mt-4">
            <h3 className="font-bold text-warning flex items-center gap-2">
              <span className="text-2xl">🟡</span> Worth Waiting For
            </h3>
            <ul className="list-disc list-inside mt-2 opacity-70">
              {advice.upcomingSoon.map((species, i) => (
                <li key={i}>{species.species.name} - {species.timing}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Strategic Weekly View

```tsx
// components/findr/FavoritesWeeklyView.tsx
export function FavoritesWeeklyView({ advice }: { advice: FavoritesStrategicAdvice }) {
  return (
    <div className="space-y-6">
      {/* Week overview */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">📅 {advice.timeframe}</h2>
          <p className="text-lg">{advice.summary}</p>

          {/* Best days */}
          <div className="mt-4">
            <h3 className="font-bold mb-3">⭐ Best Days This Week:</h3>
            <div className="grid gap-3">
              {advice.weekOverview.bestDays.slice(0, 3).map((day, i) => (
                <div key={i} className="card bg-primary/10 border border-primary/20">
                  <div className="card-body p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{day.dayOfWeek} {day.date}</p>
                        <p className="text-sm opacity-70">
                          {day.species.length} species: {day.species.join(', ')}
                        </p>
                      </div>
                      <span className="badge badge-primary badge-lg">
                        {day.score}/100
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shopping list */}
          <div className="divider" />
          <div className="bg-success/10 p-4 rounded-lg">
            <h3 className="font-bold mb-3">🛒 Shopping List for the Week:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Baits:</h4>
                <div className="flex flex-wrap gap-2">
                  {advice.weekOverview.shoppingList.baits.map((bait, i) => (
                    <span key={i} className="badge badge-success">{bait}</span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Techniques:</h4>
                <div className="flex flex-wrap gap-2">
                  {advice.weekOverview.shoppingList.techniques.map((tech, i) => (
                    <span key={i} className="badge badge-info">{tech}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Planning tips */}
          <div className="mt-4">
            <h3 className="font-bold mb-2">💡 Planning Tips:</h3>
            <ul className="list-disc list-inside space-y-1 opacity-70">
              {advice.planningTips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Individual species forecasts */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold">🐟 Species-by-Species Breakdown:</h3>
        {advice.weeklyForecasts.map((forecast, i) => (
          <div key={i} className="card bg-base-100 shadow">
            <div className="card-body">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{forecast.species.name}</h4>
                  <p className="text-sm opacity-70">{forecast.outlook}</p>
                </div>
                <span className="badge badge-lg">{forecast.averageScore}/100</span>
              </div>

              {forecast.bestWindows.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold mb-2">
                    Best Windows ({forecast.bestWindows.length}):
                  </p>
                  <div className="space-y-2">
                    {forecast.bestWindows.slice(0, 3).map((window, j) => (
                      <div key={j} className="text-sm bg-base-200 p-2 rounded">
                        <div className="flex justify-between items-center">
                          <span>
                            {window.dayOfWeek} {window.date} at {window.time}
                          </span>
                          <span className="badge badge-sm">{window.score}/100</span>
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {window.habitat} + {window.technique}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Page Integration

### Add Tab to Findr Page

```tsx
// pages/findr/index.tsx
export default function FindrPage() {
  const [activeTab, setActiveTab] = useState<'now' | 'week'>('now');
  const { rectangleCode } = useFindrSettings();

  const { data: tacticalAdvice } = useFavoritesTacticalAdvice(rectangleCode);
  const { data: strategicAdvice } = useFavoritesStrategicAdvice(rectangleCode);

  return (
    <div>
      {/* Tab navigation */}
      <div className="tabs tabs-boxed mb-4">
        <button
          className={`tab ${activeTab === 'now' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('now')}
        >
          🎯 Fishing Now
        </button>
        <button
          className={`tab ${activeTab === 'week' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('week')}
        >
          📅 Week Ahead
        </button>
      </div>

      {/* Content */}
      {activeTab === 'now' && tacticalAdvice && (
        <FavoritesTacticalCard advice={tacticalAdvice} />
      )}

      {activeTab === 'week' && strategicAdvice && (
        <FavoritesWeeklyView advice={strategicAdvice} />
      )}
    </div>
  );
}
```

---

## Key Benefits

✅ **User-centric** - Focused on THEIR favorite species, not all species
✅ **Actionable** - "Target Sea Bass first at Rocky Shore with Spinning"
✅ **Planning-focused** - Shopping list, transport needs, best days
✅ **Time-saving** - Don't show species they don't care about
✅ **Practical** - "Bring: Spinning rod, Crab, Worms"

---

## Demo

Run the demo to see it in action:

```bash
npx tsx scripts/demo-favourites-advice.ts
```

**Shows:**
- Tactical advice for 7 favorite species
- Strategic weekly forecast
- Shopping list generation
- Best days identification
- Priority recommendations

---

**Status:** ✅ Ready to integrate with favorites system
