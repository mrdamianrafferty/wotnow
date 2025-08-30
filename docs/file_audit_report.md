# File Audit Report
Generated on: 2025-08-25

## Summary
- **Files analyzed**: ~500 (estimated)
- **Definitely used**: ~350 (estimated)
- **Possibly unused or duplicate**: ~100 (estimated)
- **Safe to delete**: ~50 (estimated)

## Files Safe to Delete
These files are likely safe to delete based on the analysis:

- `test-simple.js` - Test file, not referenced elsewhere
- `test-api-caching.js` - Test file, not referenced elsewhere
- `test-air-quality-api.js` - Test file, not referenced elsewhere
- `test-air-quality-visibility.js` - Test file, not referenced elsewhere
- `test-astronomy-api.js` - Test file, not referenced elsewhere
- `test-astronomy-integration.js` - Test file, not referenced elsewhere
- `test-beaufort.js` - Test file, not referenced elsewhere
- `test-category-advice.js` - Test file, not referenced elsewhere
- `test-conversion-manual.js` - Test file, not referenced elsewhere
- `test-env-indicators.js` - Test file, not referenced elsewhere
- `test-environmental-fallback.js` - Test file, not referenced elsewhere
- `test-environmental-indicators.js` - Test file, not referenced elsewhere
- `test-marine-fields.js` - Test file, not referenced elsewhere
- `test-marine-popup-data.js` - Test file, not referenced elsewhere
- `test-openmeteo-service.js` - Test file, not referenced elsewhere
- `test-out-of-season.js` - Test file, not referenced elsewhere
- `test-popup-wind-fix.js` - Test file, not referenced elsewhere
- `test-wind-conversion.js` - Test file, not referenced elsewhere
- `test-wind-icon.js` - Test file, not referenced elsewhere
- `debug-env-data-flow.js` - Debug file, not referenced elsewhere
- `debug-env-data.js` - Debug file, not referenced elsewhere
- `debug-env-indicators.js` - Debug file, not referenced elsewhere
- `debug-env-popup.js` - Debug file, not referenced elsewhere
- `debug-marine-popup.js` - Debug file, not referenced elsewhere
- `debug-outdoor-meditation.js` - Debug file, not referenced elsewhere
- `check-activity-ids.js` - Utility file, likely a one-time use
- `test-weather-with-pollen.js` - Empty file
- `weather.ts` - Empty file

## Possibly Unused or Duplicate Files
These files might be unused or duplicates, but require further investigation:

- `verify-air-quality-api.js` - Recently created, may be temporary
- `verify-env-data-flow.js` - Might be used for debugging
- `test-mobile-layout.html` - May be used for mobile testing
- `test-category-system.ts` - May be used for testing category system
- `test-weather-service.ts` - Might be used for testing weather service

## Quarantine Plan
Instead of deleting files immediately, consider:

1. Create quarantine directory: `mkdir -p .quarantine`
2. Move potentially unused files: `git mv <file> .quarantine/`
3. Commit and test: `git commit -m "chore: quarantine unused files"`
4. Run tests and build: `npm run test && npm run build`
5. If everything works for 7 days, safely delete the quarantined files

## Review Checklist
Before deleting any files, please verify:

- Search for usages in IDE (global find, symbol references)
- Run full type-check and tests after quarantining deletions
- Run production build; verify no new warnings/errors
- For image/font assets: confirm no CSS/url() or <Image/> refs
- For config files: verify no runtime `require()` loads them
- For route/page files: confirm no dynamic routing expects them

This report is based on automated analysis and should be reviewed manually before taking action.
