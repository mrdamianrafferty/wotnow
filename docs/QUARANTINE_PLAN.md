Scope: pages/index.tsx, pages/activities.tsx, pages/Weather.tsx, components/Popup.tsx, components/AstronomyCard.tsx, pages/my-weather.tsx, pages/interests.tsx

Keep (required by the above threads)

- pages
  - pages/index.tsx
  - pages/activities.tsx
  - pages/Weather.tsx
  - pages/my-weather.tsx
  - pages/interests.tsx
  - pages/api/weather-with-pollen.ts
  - pages/api/marine.ts
  - pages/api/owm.ts
  - pages/api/tides.ts
  - pages/api/osm-orientation.ts
  - pages/api/astronomy-highlights.ts
- lib/services
  - lib/services/weatherService.ts
  - lib/services/goingOutTonight.ts
- lib
  - lib/openweather.ts
  - lib/googleMaps.ts
  - lib/types.ts
  - lib/useForecastData.ts
- components
  - components/Popup.tsx
  - components/AstronomyCard.tsx
  - components/PopupTemplate.tsx
  - components/EnvironmentalIndicators.tsx
  - components/PollenWarning.tsx
  - components/AirQualityWarning.tsx
  - components/CoastalLocationDialog.tsx
  - components/WindDirectionIcon.tsx
  - components/SwellArrow.tsx
  - components/OptimizedImage.tsx
  - components/OptimizedBackgroundImage.tsx
  - components/MapPicker.tsx
  - components/sharing/NewShareModal.tsx
  - components/sharing/VenueSearch.tsx
- context
  - context/UserPreferencesContext.tsx
- utils and types
  - utils/getSuggestionsByDay.ts
  - utils/activityHelpers.ts
  - utils/buildPopupActivityPayload.ts
  - utils/heroSelector.ts
  - utils/eveningScoring.ts
  - utils/weatherUtils.ts
  - utils/weatherLabels.ts
  - utils/orientation.ts
  - utils/issHelper.ts
  - utils/airQualityUtils.ts
  - utils/pollenUtils.ts
  - utils/beaufort.ts
  - utils/useHasMounted.ts
  - utils/flags.ts
  - utils/marineConditionsSummary.ts
  - types/weatherData.ts
  - types/weatherTypes.ts
- data
  - data/activityTypes.ts
  - data/activityMessages.ts
  - data/bgMap.ts
  - data/bgMapOptimized.ts
  - data/emojiMap.ts
  - data/moonLore.ts

Quarantine candidates (not reachable from the traced threads)

- Weather duplicates/legacy
  - lib/weatherServices.ts
  - lib/services/openMeteoService.ts
  - lib/services/weatherServiceNormalizers.ts
  - lib/services/weatherCache.ts
  - lib/forecastRewriter.ts
  - Tests: lib/services/weatherService.test.ts, lib/services/weatherServiceNormalizers.test.ts, lib/services/openMeteoService.test.ts
- ISS/Astronomy extras not referenced by traced threads
  - app/api/iss-next-night-pass/route.ts
  - pages/api/iss-visible.ts
  - utils/issPasses.ts
  - public/satellite_iss.png
- Sharing experiments (excluding the two kept files above)
  - components/sharing/**, hooks/useSharing.ts, lib/db/sharing.ts, flows/share-flow.yaml
  - pages/invite/[id].tsx, pages/poll/[id].tsx (not pulled by these threads)
- Extra UI components not used by traced pages
  - components/HomepageBanner.tsx, Card.tsx, ForecastCards.tsx, HomeDayTabs.tsx, TopTabs.tsx
  - components/Map.tsx, MarineTable.tsx, MarineDayTabs.tsx, WaterTempKey.tsx
  - components/SceneLayers.tsx, WeatherAnimationLayer.tsx, SmartBackgroundImage.tsx
  - components/MoonNugget.tsx, components/footer.tsx
  - components/PollenWarning.tsx.backup
- Unused/legacy libs/hooks
  - lib/hooks/useWeather.ts, lib/hooks/useCoastalOrientation.ts
  - lib/server/fetchStormglass.ts, lib/placesSearch.ts
- Debug and tooling
  - debug-*.js, deep-cleanup.sh, deploy-to-vercel.sh, git-daily.sh, minimal-deploy.sh
  - img-optimizer/**
- Docs/examples and misc
  - docs/**, README.md, examples/**, index.html
  - api/python/**

Notes

- The keep set includes everything pulled into the popup and AstronomyCard, including ISS helper and moon lore, as well as the API routes they call.
- This list is based on static import scanning and simple URL detection for `/api/...` fetches. It ignores dynamic runtime conditionals and route-level entry points not in the seeds above.
- To widen the keep set, add more seeds and regenerate.

Regenerate

Run:

  node scripts/trace-home-graph.js pages/index.tsx pages/activities.tsx pages/Weather.tsx components/Popup.tsx components/AstronomyCard.tsx pages/my-weather.tsx pages/interests.tsx > HOMEPAGE_DEP_GRAPH.txt

Then update this file accordingly.
