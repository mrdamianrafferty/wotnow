# `/api/owm` free-source normalizer — implementation plan

**Status:** scoped, not built (2026-06-27)
**Author:** investigation off the Sentry "OpenWeather feed hit hard" finding
**Prereq:** the cache/breaker fix (commit `2b7d17a6`) should be verified first — if it
pulls the 429 rate down, this build may be unnecessary.

---

## 1. Goal

Let `/api/owm` serve weather from the **free** provider chain (Met.no → Open-Meteo →
NWS) and fall back to paid OpenWeather One Call 3.0 only as a last resort — *without*
changing what the endpoint's consumers receive.

**Why it's not a one-liner:** the free providers already exist in `getWeatherData()`
(`lib/services/weatherService.ts`) but emit provider-shaped objects. `/api/owm`'s
consumers depend on the **OpenWeather One Call shape**. Routing `/api/owm` through the
existing free chain today would blank the app forecast strip and break SEO scoring.
The missing piece is a **normalization layer** that maps each free provider into the
One Call shape.

### Non-goals
- Do **not** modify `getWeatherData()` or its consumers (`/api/weather`,
  `/api/garden/tasks`). They tolerate the free shapes already (garden even reads
  fields `FullWeather` doesn't have and falls back). Keep blast radius to `/api/owm`.
- No marine/tide changes (`/api/marine` is separate).
- Air quality / alerts stay OpenWeather-sourced (already cached 24h at 0dp).

---

## 2. Current state

```
/api/owm  → getCachedFullWeather → getFullWeather → getOneCallData
            → OpenWeather One Call 3.0 (PAID), 2.5 /forecast fallback
            ❌ free chain never touched

getWeatherData (UNCHANGED by this work)
            → NWS (US) → Met.no (EU) → Open-Meteo (global) → OW (paid last resort)
            → consumed by /api/weather, /api/garden/tasks only
```

Post cache-fix, the live-fetch step inside `getCachedFullWeather` is
`fetchFullWeatherOneCallOnly()` (One Call 3.0, throws on 429) with a stale-cache +
2.5 last-resort fallback. This plan replaces *that live-fetch step* with a free-first
geo-routed fetch.

---

## 3. The contract (target shape)

Derived from the **actual** consumers of `/api/owm`. Anything not listed here is not
required and need not be synthesized.

### Consumer A — `lib/useForecastData.ts` (the app forecast strip)
Reads **`.list`** as `OWMForecastSlot[]` (`lib/types.ts`), grouped into 8 day-buckets
(`diff 0..7`). Each slot:
```ts
{
  dt: number;            // Unix seconds
  dt_txt: string;        // "YYYY-MM-DD HH:mm:ss" (UTC)
  main: { temp: number };
  weather: [{ icon: string; description: string }];
  wind: { speed: number; gust?: number };   // m/s
  pop: number;           // 0..1
  rain?: { "3h": number };
  snow?: { "3h": number };
}
```
**Coverage needed:** ~3-hourly slots spanning today→+7 days (~56 slots). Sparser is
tolerable (the UI just shows fewer rows per day) but daily grouping must work.

### Consumer B — `lib/seo/getActivityScore.ts` (SEO scoring)
Reads **`.daily[]`** (One Call daily), falling back to **`.hourly[]`**:
```ts
// daily[]
{ dt: number; temp: { day: number }; rain?: number; wind_speed: number; clouds?: number; humidity?: number }
// hourly[] (fallback)
{ dt: number; temp: number; rain?: { "1h": number }; wind_speed: number; clouds?: number; humidity?: number }
```
**Coverage needed:** 7 daily entries. `temp.day`, `wind_speed` are load-bearing for
scoring; `rain`/`clouds`/`humidity` improve it but degrade gracefully if absent.

### Minimum viable normalized object
```ts
{
  source: 'metno' | 'openmeteo' | 'nws' | 'onecall3' | 'forecast2.5',
  list:    OWMForecastSlot[],   // for Consumer A
  daily:   OneCallDaily[],      // for Consumer B
  hourly:  OneCallHourly[],     // Consumer B fallback + future use
  current: { ... },             // not strictly read by A/B; populate best-effort
  alerts:  [],
}
```

> **Wind units:** `OWMForecastSlot.wind.speed` and `daily.wind_speed` are **m/s**
> (`useForecastData`/`getActivityScore` multiply by 3.6 → km/h). Met.no is m/s native;
> Open-Meteo request must use `wind_speed_unit=ms`; NWS needs mph→m/s (`parseWindSpeed`
> already does this).

---

## 4. Architecture

New module: **`lib/services/weather-normalize.ts`**

```ts
export function metnoToOneCall(raw): NormalizedWeather
export function openMeteoToOneCall(raw): NormalizedWeather
export function nwsToOneCall(raw): NormalizedWeather
```

New private fn in `weatherService.ts`:
```ts
async function fetchFreeFirstNormalized({ lat, lon, apiKey, options }): Promise<FullWeather>
```
Geo-routing identical to `getWeatherData()`:
1. EU (`isEuropeanLocation`) → Met.no `…/2.0/complete` (use `complete` not `compact`
   to get `precipitation_amount` + `cloud_area_fraction` per step).
2. US (`isUSLocation`) → NWS.
3. else → Open-Meteo.
4. On any miss/throw → next source; final last resort → existing
   `fetchFullWeatherOneCallOnly` (paid One Call) then 2.5.

Then `getCachedFullWeather` swaps its live-fetch line:
```diff
- fresh = await fetchFullWeatherOneCallOnly({ lat: latBucket, lon: lonBucket, apiKey, options });
+ fresh = await fetchFreeFirstNormalized({ lat: latBucket, lon: lonBucket, apiKey, options });
```
Cache write, TTL, 1dp/3h key, and the 429 breaker all stay exactly as they are. The
breaker now rarely trips (paid One Call only reached as last resort). Stale-serve still
applies on total failure.

Why a new fn instead of editing `getWeatherData`: keeps `/api/weather` +
`/api/garden/tasks` byte-identical, and lets `/api/owm` keep its own bucketed cache.

---

## 5. Per-provider mapping spec

### Met.no (`…/locationforecast/2.0/complete`) — EU, primary
`properties.timeseries[]`, each has `time`, `data.instant.details`
(`air_temperature`, `wind_speed` m/s, `wind_from_direction`, `cloud_area_fraction` %,
`relative_humidity`), and `data.next_1_hours`/`next_6_hours` with
`details.precipitation_amount` (mm) + `summary.symbol_code`.

- **list:** take steps at 00/03/06/09/12/15/18/21Z (or every 3rd hourly step) →
  `{ dt: epoch(time), dt_txt, main.temp = air_temperature, wind.speed,
     weather:[{ description: symbol_code, icon: mapMetnoSymbol(symbol_code) }],
     pop: next_1_hours.details.probability_of_precipitation/100 ?? 0,
     rain:{ "3h": next_*_hours.details.precipitation_amount } }`.
- **hourly:** first 48 hourly steps → One Call hourly shape.
- **daily:** group steps by local date; per day `temp.day` = value nearest 12:00 local
  (or mean), `wind_speed` = max, `clouds` = mean `cloud_area_fraction`, `humidity` =
  mean, `rain` = Σ precipitation_amount. 7 days.
- **icon:** `mapMetnoSymbol()` — Met.no symbol_code → OWM `01d`/`10n` style. Small
  lookup (~25 codes). If skipped, leave `icon: ''` (UI shows text description).

### Open-Meteo (`/v1/forecast`) — global fallback
Request: `hourly=temperature_2m,precipitation,precipitation_probability,cloud_cover,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code`,
`daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code`,
`wind_speed_unit=ms`, `timezone=auto`, `forecast_days=8`.
Response is **columnar** (parallel arrays) — must zip by index.

- **list:** zip hourly arrays, take every 3rd → slot. `pop` =
  `precipitation_probability/100`, `rain["3h"]` = Σ precipitation over the 3h window.
- **hourly:** zip → One Call hourly shape.
- **daily:** zip daily arrays → `temp.day` = `(max+min)/2` (or add `temperature_2m_mean`
  to request), `wind_speed` = `wind_speed_10m_max`, `rain` = `precipitation_sum`. 7 days.
- **icon:** `mapWmoCode()` — WMO weather_code → OWM icon (~28 codes; also reused for
  text description). Existing code returns `WMO {n}` strings; replace with real map.

### NWS (`api.weather.gov`) — US fallback (messiest)
`/forecast` periods are **day/night** (~14 periods = 7 days); `/forecastHourly` is
proper hourly. Temps °F → C (`fahrenheitToCelsius` exists). Wind is a string
(`parseWindSpeed`). No humidity/clouds/pop in `/forecast`; `/forecastHourly` has
`probabilityOfPrecipitation.value`, `relativeHumidity.value`.

- **list:** from `/forecastHourly`, every 3rd hour → slot (`pop` from
  `probabilityOfPrecipitation/100`; `rain` usually absent → omit).
- **daily:** collapse day/night period pairs → one entry/day; `temp.day` = daytime
  period temp; `wind_speed` from `parseWindSpeed`. `rain`/`clouds`/`humidity` omitted
  (acceptable degrade).
- **icon:** `mapNwsIcon()` from `shortForecast` keywords (~12 buckets) or pass through.

> NWS is lowest priority — US has the least venue density. Acceptable to ship Met.no +
> Open-Meteo first and leave NWS routed to Open-Meteo initially (Open-Meteo covers the
> US fine), deferring `nwsToOneCall` to a later pass.

---

## 6. Edge cases & risks

- **Wind unit drift** — single most likely bug. Assert m/s everywhere; add a unit test
  per provider checking a known input → expected m/s.
- **Timezone** — `dt` epoch seconds (UTC); `dt_txt` UTC string to match OWM. Daily
  grouping uses *local* date (via `timezone=auto` / Met.no local offset) so "today" is
  right for the user. Mismatch here shifts the whole forecast strip by a day.
- **Sparse `list`** — if a provider yields <8 day-buckets the UI shows gaps; ensure at
  least one slot/day for 7 days.
- **`pop` semantics** — OWM `pop` is 0..1; providers give 0..100 or mm. Normalize to
  0..1; default 0 when absent (never `undefined` — UI may render NaN).
- **Cache key sharing** — normalized output is cached under the same `ow3:…` key as
  before. After deploy, existing entries (OW-shaped) coexist fine (same field names);
  no migration, but expect a brief warm-up of misses.
- **`source` field** — set accurately (`metno`/`openmeteo`/`nws`) so Sentry/debug can
  attribute. Some UI may branch on `source === 'onecall3'`; grep before shipping.
- **Provider rate limits** — Met.no requires a real `User-Agent` (current one is a
  placeholder `github.com/yourrepo` — fix it) and is sensitive to abuse; Open-Meteo
  free tier is ~10k/day (fine at our bucketed volume). Add the same monitoredFetch
  wrappers (already present) so these show up in Sentry.

---

## 7. Verification plan

1. **Unit tests** (`__tests__/weather-normalize.test.ts`): feed a captured raw fixture
   per provider → assert `list`/`daily`/`hourly` shape, wind in m/s, `pop` in 0..1,
   `dt` seconds, 7 daily entries, `temp.day` finite.
2. **Contract test**: for each provider's normalized output, run it through
   `getSuggestionsByDay` (same call `getActivityScore` makes) and assert a finite
   score — proves Consumer B works.
3. **Local `/api/owm` smoke**: hit with an EU coord (Met.no), a non-EU/non-US coord
   (Open-Meteo), a US coord; confirm `.list` non-empty and `.daily.length === 7`.
4. **Visual**: load a venue page in the app, confirm the 8-day forecast strip renders
   identically (temps, icons, rain) vs OW baseline. Diff a few values against OW for
   sanity (expect small deltas, not structural gaps).
5. **Post-deploy Sentry**: `span.description:"GET https://api.openweathermap.org/data/3.0/onecall"`
   count should drop toward ~0; free-provider spans (`metno`/`openmeteo`) appear.

---

## 8. Rollout

- Behind env flag **`OWM_FREE_FIRST`** (default off). When off, `getCachedFullWeather`
  uses today's `fetchFullWeatherOneCallOnly` path → byte-identical behaviour.
- Stage 1: Met.no + Open-Meteo only (NWS → Open-Meteo). Flag on in preview, verify
  steps 3–4.
- Stage 2: flag on in prod; watch Sentry onecall count + a few venue pages for 24h.
- Stage 3 (optional): implement `nwsToOneCall`, route US → NWS.
- Keep paid One Call as the final fallback indefinitely (don't remove it).

---

## 9. Effort estimate

| Piece | Est. |
|---|---|
| `weather-normalize.ts` (Met.no + Open-Meteo) + icon/WMO maps | ~0.5–1 day |
| `fetchFreeFirstNormalized` + flag wiring in `getCachedFullWeather` | ~0.5 day |
| Unit + contract tests, fixtures | ~0.5 day |
| Visual verify + preview→prod rollout | ~0.5 day |
| NWS mapper (Stage 3, optional) | +0.5 day |

**~2–3 days** for Met.no + Open-Meteo to prod; +0.5 day for NWS.

---

## 10. Cost model — it scales with *locations*, not *users*

The single most important thing to understand for capacity planning. After the cache
fix, paid OpenWeather calls/day are approximately:

```
OW calls/day  ≈  8 (3h blocks/day)  ×  (distinct ~11km cells requested that day)
```

Cost is **decoupled from request volume and user count** once the cache is warm — a
thousand users on the same venue cost the same as one. What drives cost is the number of
distinct *locations* looked at. That splits the three apps sharply:

| App | Location pattern | Scaling behaviour |
|---|---|---|
| **Findr / Rise Daisy** | venue-centric — finite named spots | distinct cells bounded (hundreds); **cache fix likely holds indefinitely** regardless of user growth. Free chain = nice-to-have. |
| **Go Daisy** | generalist "weather where I am, anywhere" | distinct cells grow with the *geographic spread of the userbase*; **will blow past 1,000/day and keep climbing as users grow.** Free chain is a *fix-before-you-scale* item, not polish. |

### Two distinct "bites" at scale
1. **Cost bite** — One Call 3.0 ≈ 1,000/day free, then ~£0.0012/call (confirm on
   dashboard): 10k/day ≈ £325/mo, 50k/day ≈ £1.76k/mo, 100k/day ≈ £3.56k/mo. Only
   bites if billing is uncapped.
2. **Quality bite** — on the free/capped tier, exceeding the cap means the breaker
   serves **stale** data and the last-resort path serves **degraded 2.5** forecasts.
   For a weather app, the core product silently degrading as you grow is the worse
   outcome.

> **Current mitigation in place:** OpenWeather account is **hard-capped at 1,000
> calls/day** (set by owner). This eliminates the cost bite entirely — but converts all
> overflow into the *quality* bite (429 → stale/degraded). It also means any key abuse
> or uncached client usage *starves real users of the free quota* rather than costing
> money.

The free chain removes **both** bites: Met.no/Open-Meteo are free and full-quality, so
OW drops to a rare last resort. Cost → ~0 and quality stays full at any scale.

## 11. Separate but related: the key is client-exposed (do regardless of this build)

`NEXT_PUBLIC_OPENWEATHER_KEY` is inlined into the client bundle (Pages Router) and used
to call OpenWeather **directly from the browser** — confirmed in
`components/ModernLocationSearch.tsx:102` (Geocoding API), and referenced in other
client-reachable code (`context/UserPreferencesContext.tsx:640`,
`utils/advancedGeolocation.ts:473`, `lib/api/base.ts:12`). Implications:

- The key is visible in any user's DevTools Network tab → **anyone can use it directly
  against OpenWeather, bypassing the cache and `/api/owm` entirely** (invisible to
  Sentry; only the OW dashboard sees it). Against a 1,000/day cap, that means they can
  starve your real users.
- These browser geocoding/weather calls are **uncached** and count toward the same cap —
  a hidden consumer not reflected in `/api/owm` Sentry numbers.

**Actions (independent of the free chain):**
1. Move the key server-only: drop the `NEXT_PUBLIC_` prefix; proxy the geocoding +
   any client OW calls through server API routes (with the same Supabase cache).
2. **Rotate the key** after that — and watch the OW dashboard: a usage drop after
   rotation = the old key was being used externally. This is the definitive test for
   theft.

## 12. Decision gate

- **Go Daisy:** build the free chain **before** any real growth push. Its weather cost
  scales with the userbase's geographic spread; the cap converts that into a degrading
  product. Not optional.
- **Findr / Rise Daisy:** the cache fix is probably sufficient. Build only if Sentry
  shows sustained One Call 3.0 429s attributable to these apps.
- **Regardless:** fix the key exposure (§11) — it's a small, high-value change and a
  prerequisite for trusting any of the cost numbers above.
