# Copernicus Migration – Pre-flight Checklist (2025-09-28)

While account access is pending, the codebase now carries scaffolding that lets us plug in the official Copernicus Marine Service feeds with minimal friction once credentials arrive. This document tracks what is already prepared and what needs real API connectivity before going live.

## ✅ Completed groundwork

- **Data model** – `lib/copernicus/types.ts` defines shared types covering physics, biogeochemical and wave datasets plus the Findr-facing snapshot structure.
- **Mock provider** – `MockCopernicusProvider` (in `lib/copernicus/mockClient.ts`) returns deterministic Asturias-style samples so we can progress transformation logic and UI work without live downloads.
- **Transform pipeline** – `lib/copernicus/transformers.ts` translates the raw bundle into depth-aware snapshots (`CopernicusMarineData`). Jest coverage lives in `__tests__/copernicus/transformers.test.ts`.
- **Fixtures** – `lib/copernicus/__fixtures__/asturias-mock.json` mirrors the metrics we expect from the BGC/PHY/WAV datasets around Gijón.
- **Environment knobs** – `.env.example` (see update notes) now includes placeholders for Copernicus toggles and credentials.

## 🧩 Next steps once credentials work

1. **Implement real fetcher**  
   - Swap the mock provider for an HTTP/Toolbox-backed client (`CopernicusProvider`).  
   - Pipe results through the existing transformers and cache layer.

2. **Hook into marine pipelines**  
   - Replace direct Stormglass calls in `services/weatherService.ts`/`utils/mergeWeather.ts` with the provider abstraction, while keeping Stormglass as fallback if the Copernicus env flag is disabled or errors occur.

3. **Expand tests & monitoring**  
   - Add integration tests comparing Copernicus output against stored Stormglass baselines for Cantabrian rectangles.  
   - Instrument logging/metrics to watch response times and dataset freshness.

4. **ETL + Supabase alignment**  
   - Update Supabase procedures to accept depth profiles and nutrient statistics; seed with the mock data for UI development until real feeds land.

5. **Frontend wiring**  
   - With the mock data available, UI components (depth selector, productivity badges) can be developed and QA’d before swapping to live feeds.

## Notes

- Keep `COPERNICUS_ENABLED=false` until the live provider is validated; Stormglass remains the production default.  
- The mock bundle can be swapped or expanded to simulate additional regions—drop new JSON files into `lib/copernicus/__fixtures__` and extend the provider if needed.  
- When the official access is confirmed, document the CLI/API commands in this file so the onboarding path stays single-source.
