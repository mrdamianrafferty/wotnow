# Astro Highlights (WotNow)



## Dark Sky Score (new)

The tool now computes a **Dark Sky Score** per night (0–100), combining:
- **Astronomical darkness duration** (more dark time = better)
- **Moonlight penalty** (darker moon = better; sampled at mid-dark interval)
- **Cloud cover** (if provided; clearer skies = better)

### Inputs for cloud cover
- Pass a simple average with `--cloud-avg  (0–100)` **or**
- Provide an hourly series via `--cloud-file` JSON:
  ```json
  {
    "hourly": [
      {"time": "2025-08-18T22:00:00Z", "cloud": 40},
      {"time": "2025-08-18T23:00:00Z", "cloud": 30}
    ]
  }
  ```

### Scoring (weights)
- Darkness duration normalised vs a 8-hour reference (weight 0.4)
- Moonlight darkness = (1 - illumination_fraction) (weight 0.4)
- Clear-sky factor = (1 - cloud_fraction) (weight 0.2) — optional

The score is clamped to 0–100 and included as:
```jsonc
{
  "night": { "date": "YYYY-MM-DD", "dark_sky": { "score": 82, "components": {...} } }
}
```
