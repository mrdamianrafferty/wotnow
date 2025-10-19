# WotNow Documentation Index

Comprehensive documentation for the WotNow/Go Daisy and Findr applications.

## Testing Documentation

### Overview
- **`../TESTING_BLOCKERS_ANALYSIS.md`** - Detailed blocker analysis and solutions
  - What's blocking 95%+ pass rate and how to fix it
  - Nothing is actually blocking us! Clear path forward
  - Step-by-step implementation guide
  - Time estimates: 2 hours to 95%, 5 hours to 100%
- **`../TESTING_INFRASTRUCTURE_SUMMARY.md`** - Complete testing infrastructure summary
  - Overall achievement: 85% test pass rate (67/79 tests)
  - 6 hours of work to build production-ready infrastructure
  - API + E2E testing, comprehensive documentation
  - Next steps and recommendations

### API Tests (Jest)
## Testing Documentation

### Overview
- [DATA_TESTID_IMPLEMENTATION.md](../DATA_TESTID_IMPLEMENTATION.md) - ✅ **E2E Selectors Added!** Data-testid attributes for reliable testing
- [SPECIES_DETAILS_FIX_SUCCESS.md](../SPECIES_DETAILS_FIX_SUCCESS.md) - ✅ **100% API Tests Achieved!** Species-details fix complete
- [TESTING_BLOCKERS_ANALYSIS.md](../TESTING_BLOCKERS_ANALYSIS.md) - Analysis of what's blocking 95%+ test pass rate
- [TEST_COVERAGE_REPORT.md](../TEST_COVERAGE_REPORT.md) - Comprehensive test coverage analysis (85% overall pass rate)
  - API coverage: 86% pass rate (55/64 tests), 15-48% code coverage per file
  - E2E coverage: 80% pass rate (12/15 tests)
  - Coverage gaps analysis and priorities
  - Recommendations for reaching 95%+ pass rate
- **`../TESTING_FIXES_SUMMARY.md`** - Complete API test suite documentation (86% pass rate, 55/64 tests)
  - Findr API tests: predictions, catch-log, conditions, marine-weather, species-details
  - Mocking patterns: RPC, createClient, serverClient
  - Test execution: `npm test` or `./node_modules/.bin/jest __tests__/api/findr/`
- **`../TRANSLATION_429_FIX.md`** - Translation rate limiting fixes and request deduplication

### E2E Tests (Playwright)
- **`../E2E_TESTING_STATUS.md`** - E2E testing status and achievement summary (12/12 tests passing)
  - Complete setup documentation and test results
  - Key learnings and fixes applied
  - Test patterns and browser compatibility
  - Next steps and priorities
- **`../E2E_TESTING_GUIDE.md`** - Complete Playwright E2E testing guide
  - Multi-browser testing: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
  - Test coverage: Go Daisy (homepage, weather, activities) and Findr (predictions, catch-log)
  - Helper utilities for authentication and location selection
  - Test execution: `npm run test:e2e` or `npm run test:e2e:ui` (interactive)
  - Test files in `e2e/` directory with helper utilities

## Architecture & Setup

- **`FINDR_VALIDATION_SYSTEM.md`** - Catch logging and prediction validation feedback loop
- **`FINDR_AUTH_SETUP.md`** - Authentication setup for Findr
- **`FINDR_SUPABASE_README.md`** - Supabase configuration for Findr
- **`ICES_RECTANGLE_INTEGRATION.md`** - ICES rectangle system integration
- **`FINDR_CONDITIONS_INGESTION.md`** - Marine conditions data ingestion
- **`FINDR_TRANSLATIONS.md`** - Translation system for Findr

## API & Integration Guides

- **`WEATHER_API_ARCHITECTURE.md`** - Weather API architecture
- **`WEATHER_API_REFERENCE.md`** - Weather API reference
- **`WEATHER_API_MONITORING.md`** - Weather API monitoring
- **`OPEN_METEO_API_GUIDE.md`** - Open-Meteo API integration guide
- **`OPEN_METEO_API_IMPLEMENTATION.md`** - Open-Meteo implementation details
- **`COPERNICUS_PREP.md`** - Copernicus Marine Service preparation

## Migration & Refactoring

- **`MIGRATION_GUIDE.md`** - Database migration guide
- **`MIGRATION_IMPLEMENTATION.md`** - Migration implementation details
- **`REFACTORING_SUMMARY.md`** - Code refactoring summary
- **`FINDR_CATCH_LOG_MIGRATION_PLAN.md`** - Catch log migration plan

## Feature Implementation Reports

- **`ENVIRONMENTAL_FALLBACK_IMPLEMENTATION.md`** - Environmental data fallback system
- **`CATEGORY_ADVICE_IMPLEMENTATION_REPORT.md`** - Category advice implementation
- **`POLLEN_INTEGRATION_COMPLETION_REPORT.md`** - Pollen integration
- **`ASTRONOMY_INTEGRATION_GUIDE.md`** - Astronomy features
- **`LOCATION_DIALOG_UNIFICATION_REPORT.md`** - Location dialog unification
- **`HOMEPAGE_RESTORE_REPORT.md`** - Homepage restoration
- **`OPTIMIZATION_COMPLETION_REPORT.md`** - Performance optimization
- **`VISUAL_DISTINCTION_REPORT.md`** - Visual distinction improvements
- **`BUG_FIXES_REPORT.md`** - Bug fixes report
- **`BEACH_RECOMMENDATION_FIX.md`** - Beach recommendation fixes

## Performance & Optimization

- **`VS_CODE_PERFORMANCE.md`** - VS Code performance tips
- **`PHOTO_STORAGE_OPTIMIZATION.md`** - Photo storage optimization
- **`CACHE_CONFIGURATION.md`** - Cache configuration
- **`MOBILE_OPTIMIZATION_PLAN.md`** - Mobile optimization plan

## Geolocation

- **`ADVANCED_GEOLOCATION_REPORT.md`** - Advanced geolocation features
- **`GEOLOCATION_IMPROVEMENTS.md`** - Geolocation improvements
- **`MACOS_GEOLOCATION_FIXES.md`** - macOS geolocation fixes
- **`LOCATION_PERSISTENCE_README.md`** - Location persistence system

## Deployment

- **`VERCEL_DEPLOYMENT.md`** - Vercel deployment guide

## Data Files

Various CSV and data files for species, ICES rectangles, environmental parameters, and more.
