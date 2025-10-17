# Weather API Architecture

## Free-provider priority order
The unified weather handler (`pages/api/unified-weather.ts`) now routes requests through a region-aware
priority list before falling back to OpenWeather. The default behaviour is:

| Region            | Free provider chain             |
| ----------------- | -------------------------------- |
| Nordic & Arctic   | MET Norway                       |
| Continental USA   | NOAA / National Weather Service  |
| Canada            | Environment Canada *(planned)*   |
| Mainland Europe   | MET Norway                       |
| Global fallback   | MET Norway → NOAA → Environment Canada |

If `FREE_PROVIDER_ORDER` is configured at runtime, that explicit order wins; otherwise the table above is used.

Successful free-provider responses set diagnostic headers (`X-Weather-Source`) and cache keys so we can see
which service produced the payload. Failures bubble up to the OpenWeather fallback which now honours the
three-decimal (≈110 m) coordinate cache.

## Provider priority test coverage
Jest tests at `lib/services/weatherService.test.ts` exercise the new routing logic without hitting external APIs.

- **Europe**: verifies Paris coordinates trigger a single MET Norway request and never touch OpenWeather.
- **United States**: ensures New York coordinates always fetch NOAA grid metadata first and avoid OpenWeather.

Both tests stub ancillary requests (Open-Meteo pollen/pressure) so we can focus on the primary provider calls
while still allowing the handler to run its enrichment pipeline. Console warnings for missing optional keys are
expected during the test run.
