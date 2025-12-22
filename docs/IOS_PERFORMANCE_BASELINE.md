# iOS Performance Baseline Guide

## Overview

This document describes how to measure and record baseline performance metrics for Grow Daisy, Findr, and Go Daisy iOS apps.

## Prerequisites

1. **iOS Device**: Use a mid-range iPhone (e.g., iPhone 11, SE 2nd gen, or older) for realistic metrics
2. **Xcode**: Latest version installed
3. **Release Build**: Always profile release builds, not debug
4. **Network**: WiFi or LTE connection for initial load

## Performance Instrumentation

The app includes a performance tracking module at `lib/performance/`. It automatically tracks:

- **Cold start time**: Time from app launch to first content
- **Screen metrics**: Time to first render, first data, and interactive
- **API calls**: Duration, cache status (hit/miss/stale), response size, TTL

## How to View Metrics

### In Safari Web Inspector

1. Connect iPhone to Mac
2. Open Safari > Develop > [Your iPhone] > grow.godaisy.io
3. In Console, run:

```javascript
// View full performance snapshot
window.__perfSnapshot()

// Access metrics directly
window.__perfMetrics.snapshot()

// Reset metrics for fresh measurement
window.__perfMetrics.reset()
```

### Sample Output

```
[Perf] === PERFORMANCE SNAPSHOT ===
Platform: ios
Session: abc123-xyz456
Uptime: 45.2s
Cold Start: 1850ms

Screens:
  WeeklyTaskView: 3 visits, render=120ms, data=1450ms
  GardenPage: 1 visits, render=85ms, data=980ms

API Metrics:
  Total: 12 calls
  Cache Hit Rate: 33.3%
  Avg Duration: 245ms
  P95 Duration: 890ms
[Perf] === END SNAPSHOT ===
```

## Baseline Measurement Procedure

### 1. Prepare Device

```bash
# Kill all background apps
# Disable Low Power Mode
# Connect to stable WiFi
# Wait 30 seconds after connecting
```

### 2. Install Release Build

```bash
# From WotNow directory
cd ios-growdaisy/App
open "Grow Daisy.xcworkspace"

# In Xcode:
# - Select your device
# - Product > Scheme > Edit Scheme > Run > Build Configuration > Release
# - Product > Build
# - Product > Run
```

### 3. Measure Cold Start (3 runs)

For each run:
1. Force quit the app
2. Wait 5 seconds
3. Launch the app
4. Wait for home screen to fully load
5. Open Safari Web Inspector
6. Run `window.__perfSnapshot()`
7. Record cold start time

### 4. Measure Key Screens

Navigate to each screen and wait for data to load:

| Screen | Navigate To | Wait For |
|--------|-------------|----------|
| WeeklyTaskView | Plan tab | Task list appears |
| GardenPage | Garden tab | Plant cards appear |
| ConditionsPage | Conditions tab | Weather data loads |
| SpeciesDetail | Garden > Any plant | Full details visible |

### 5. Record API Performance

After using the app for 2-3 minutes:

```javascript
// Get API metrics summary
const snap = window.__perfMetrics.snapshot();
console.log('API Metrics:', snap.apiMetrics);
```

## Baseline Targets

### Cold Start
- **Target**: < 2000ms meaningful UI
- **Good**: < 1500ms
- **Needs work**: > 2500ms

### Screen Time-to-Data
- **Target**: < 1000ms
- **Good**: < 500ms (from cache)
- **Needs work**: > 2000ms

### API Cache Hit Rate
- **Target**: > 50% (after initial load)
- **Good**: > 70%
- **Needs work**: < 30%

### P95 API Duration
- **Target**: < 1000ms
- **Good**: < 500ms
- **Needs work**: > 2000ms

## Recording Template

Use this template to record baseline measurements:

```
Date: YYYY-MM-DD
Device: iPhone [model], iOS [version]
App: Grow Daisy v[version]
Network: [WiFi/LTE]

COLD START (3 runs):
  Run 1: ____ms
  Run 2: ____ms
  Run 3: ____ms
  Average: ____ms

SCREEN METRICS:
  WeeklyTaskView:
    First Render: ____ms
    First Data: ____ms
    Interactive: ____ms

  GardenPage:
    First Render: ____ms
    First Data: ____ms
    Interactive: ____ms

API METRICS:
  Total Calls: ____
  Cache Hits: ____
  Cache Hit Rate: ____%
  Avg Duration: ____ms
  P95 Duration: ____ms

TOP SLOW ENDPOINTS:
  1. ____ - ____ms (____% cache hit)
  2. ____ - ____ms (____% cache hit)
  3. ____ - ____ms (____% cache hit)

NOTES:
[Any observations, issues, or anomalies]
```

## Next Steps

After recording baseline:

1. Identify slowest screens and endpoints
2. Check cache hit rates - low rates indicate missing caching
3. Compare cold start to target (<2s)
4. Create issues for any metrics exceeding targets
5. Re-measure after each optimization phase

## Troubleshooting

### Metrics not appearing
- Ensure you're connected via Safari Web Inspector
- Check Console for `[Perf] Initialized on ios`
- Try `window.__perfMetrics.logSnapshot()`

### Cold start seems too fast
- Make sure app was fully killed (not just backgrounded)
- Wait 5 seconds before relaunching
- Verify you're measuring from splash screen disappear

### API metrics missing
- Some APIs may not be instrumented yet
- Check if the API uses the standard fetch path
- See `lib/performance/api-tracker.ts` for instrumentation
