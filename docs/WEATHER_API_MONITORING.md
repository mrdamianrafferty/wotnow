# Weather API Monitoring

This repository now exposes a lightweight, in-process monitoring layer for every outbound weather provider call used by Go Daisy. It tracks request volume, latency, success rates, and the most recent error for each upstream endpoint so you can spot outages quickly without relying on Supabase or external observability tooling.

## How it works

- `lib/monitoring/weatherMetrics.ts` keeps an in-memory metrics registry keyed by provider → endpoint → request.
- Every server-side weather integration (OpenWeather, Open-Meteo, MET Norway, NOAA, Stormglass, WorldTides, etc.) calls `monitoredFetch` or `weatherMetrics.start(...)` before hitting the external API. Failures, status codes, and durations are recorded automatically.
- `pages/api/weather-metrics.ts` exposes the live snapshot. `GET` returns metrics, and `POST ?reset=true` clears the counters without restarting the server.
- `pages/weather-metrics.tsx` provides a DaisyUI-styled dashboard that polls the API every 15 seconds (toggleable) and lets you filter by provider or reset counters.

Because metrics live in memory, they reset whenever the server restarts (e.g. Vercel redeploy, `npm run dev` restart). That’s intentional for a simple local/dashboard view—no persistence layer or Supabase tables required.

## Quick start

1. Run the app (`npm run dev`).
2. Hit any weather endpoint (e.g. `/api/weather?lat=51.5&lon=-0.1`).
3. Visit [`/weather-metrics`](http://localhost:3000/weather-metrics) to see live stats.
4. Use the **Reset Metrics** button or `POST /api/weather-metrics?reset=true` to clear streaks.

## Providers covered

| Provider      | Endpoints instrumented (examples)                                      |
|---------------|------------------------------------------------------------------------|
| `openweather` | `onecall3`, `day_summary`, `timemachine`, `overview`, alerts, air AQI |
| `open-meteo`  | `forecast`, `air-quality`, `marine`, astronomy fallback                |
| `metno`       | `locationforecast`, `oceanforecast`, marine enrichment                 |
| `noaa`        | `points`, `forecast`, `forecastHourly`, aggregated `unified` fetch     |
| `stormglass`  | `marine`, `tides`, `astronomy`, `bio`, visibility, cached helpers      |
| `worldtides`  | Tide extremes (`/api/v3`)                                              |

Any new integration can hook into the same system by importing `monitoredFetch` (for simple GETs) or `weatherMetrics.start` when you need custom success/failure handling.

## Notes & limitations

- Metrics are **per process**. Horizontal scaling (multiple server instances) means you see the data for the instance that serves `/weather-metrics`.
- Client-side fetches (e.g. browser requests directly to OpenWeather) are **not** captured. The dashboard reflects only server-side traffic routed through Next.js API handlers and shared service functions.
- Older helper modules that are unused (for example `utils/mergeWeather.ts`) still contain raw `fetch` calls; wire them through `monitoredFetch` if you revive them.

## Useful snippets

```ts
import { monitoredFetch } from '../lib/monitoring/weatherMetrics';

const response = await monitoredFetch('openweather', 'onecall3', url, undefined, JSON.stringify({ units: 'metric' }));
const data = await response.json();
```

```ts
const span = weatherMetrics.start('stormglass', 'tides', JSON.stringify({ lat, lon }));
try {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    span.failure(new Error(`HTTP ${response.status}`), { status: response.status });
    return;
  }
  span.success({ status: response.status });
} catch (error) {
  span.failure(error);
}
```

With this dashboard in place, you can keep an eye on upstream weather providers directly from the Go Daisy control panel and react quickly if any of them start failing or throttling.
