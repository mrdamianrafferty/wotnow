# E2E Testing with Playwright

## Overview

End-to-end testing setup for WotNow/Go Daisy and Findr using Playwright. Tests real user workflows across multiple browsers and devices.

**Last Updated:** October 19, 2025  
**Status:** ✅ Configured and ready for test development

## Quick Start

### Installation

Playwright is already installed. If you need to reinstall browsers:

```bash
npx playwright install
```

### Running Tests

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Run specific browser only
npm run test:e2e:chromium

# View test report
npm run test:e2e:report
```

### Run Specific Tests

```bash
# Run single test file
npx playwright test e2e/go-daisy.spec.ts

# Run tests matching pattern
npx playwright test findr

# Run specific test
npx playwright test -g "should load homepage"
```

## Test Structure

### Directory Layout

```
e2e/
├── go-daisy.spec.ts           # Go Daisy homepage & core features
├── findr-predictions.spec.ts   # Findr predictions & location
├── findr-catch-log.spec.ts     # Catch logging (requires auth)
└── helpers/
    ├── auth.ts                 # Authentication utilities
    └── location.ts             # Location selection utilities
```

### Configuration

**`playwright.config.ts`** - Main configuration:
- **Base URL**: `http://localhost:3000` (configurable via `PLAYWRIGHT_BASE_URL`)
- **Test Directory**: `./e2e`
- **Browsers**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Retries**: 2 on CI, 0 locally
- **Workers**: 1 on CI (serial), parallel locally
- **Dev Server**: Automatically starts `npm run dev` before tests
- **Artifacts**: Screenshots on failure, video on failure, trace on retry

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Interact with elements
    const button = page.locator('button:has-text("Click Me")');
    await button.click();
    
    // Assert expectations
    await expect(page.locator('.result')).toBeVisible();
  });
});
```

### Using Helper Functions

#### Authentication

```typescript
import { signIn, signOut, TEST_USER } from './helpers/auth';

test('authenticated feature', async ({ page }) => {
  await signIn(page);
  
  // Test authenticated features
  await page.goto('/findr/catch-log');
  
  await signOut(page);
});
```

#### Location Selection

```typescript
import { setLocation, TEST_LOCATIONS } from './helpers/location';

test('location-based feature', async ({ page }) => {
  await page.goto('/findr');
  
  await setLocation(page, TEST_LOCATIONS.DUBLIN);
  
  // Test location-specific features
});
```

### Best Practices

1. **Use `data-testid` attributes** for stable selectors:
   ```html
   <button data-testid="submit-button">Submit</button>
   ```
   ```typescript
   await page.locator('[data-testid="submit-button"]').click();
   ```

2. **Wait for network idle** before assertions:
   ```typescript
   await page.waitForLoadState('networkidle');
   ```

3. **Use specific locators** over generic ones:
   ```typescript
   // Good
   await page.locator('button:has-text("Sign In")').click();
   
   // Better with data-testid
   await page.locator('[data-testid="sign-in-button"]').click();
   ```

4. **Make tests independent** - each test should work in isolation:
   ```typescript
   test.beforeEach(async ({ page }) => {
     // Reset state before each test
     await page.goto('/');
   });
   ```

5. **Use `test.skip()` for incomplete tests**:
   ```typescript
   test.skip('future feature', async ({ page }) => {
     // TODO: Implement when feature is ready
   });
   ```

## Current Test Coverage

### Go Daisy (`go-daisy.spec.ts`)
- ✅ Homepage loads successfully
- ✅ Navigation is working
- ✅ Weather page displays
- ✅ Activities page displays
- ✅ Basic accessibility checks

### Findr - Predictions (`findr-predictions.spec.ts`)
- ✅ Predictions page loads
- ✅ Location selector present
- ✅ Location interaction available
- ⏳ Species display (skipped - needs location setup)
- ✅ Auth-related navigation
- ✅ Responsive design (mobile & tablet)

### Findr - Catch Log (`findr-catch-log.spec.ts`)
- ✅ Auth requirement for unauthenticated users
- ⏳ Catch log form display (skipped - needs auth)
- ⏳ Catch log submission (skipped - needs auth + API)

## Test Development Priorities

### High Priority (Core User Flows)
1. **Go Daisy Homepage → Weather → Activities**
   - Complete user journey through main features
   - Weather data loading and display
   - Activity recommendations display

2. **Findr Location Selection → Predictions**
   - Select location via search or GPS
   - Wait for predictions to load
   - Verify species cards display with confidence scores
   - Check environmental indicators

3. **Findr Authentication Flow**
   - Sign up new user
   - Sign in existing user
   - Magic link authentication
   - Sign out

4. **Findr Catch Logging (Authenticated)**
   - Navigate to catch log
   - Fill out form with required fields
   - Submit catch log
   - Verify success message

### Medium Priority (Extended Features)
5. **Species Details Modal**
   - Click species card
   - Modal opens with full details
   - Environmental preferences display
   - Techniques and bait display

6. **User Favorites**
   - Add species to favorites
   - Remove from favorites
   - View favorites list

7. **Location Persistence**
   - Set location
   - Navigate away and back
   - Verify location persists

8. **Translation System**
   - Switch language
   - Verify content translates
   - Check caching behavior

### Low Priority (Edge Cases & Performance)
9. **Error Handling**
   - Network failures
   - Invalid inputs
   - API errors

10. **Performance**
    - Page load times
    - API response times
    - Image loading

11. **Cross-Browser Compatibility**
    - Run full suite on all browsers
    - Verify consistent behavior

## Debugging Tests

### Interactive Mode

```bash
# Open Playwright UI
npm run test:e2e:ui
```

Use the UI to:
- Pick specific tests to run
- Step through tests
- View DOM snapshots
- Inspect network requests
- Time travel through test execution

### Debug Mode

```bash
# Run with debugger
npm run test:e2e:debug
```

Playwright Inspector opens:
- Set breakpoints
- Step through code
- Inspect elements with selector picker
- View console logs

### View Test Report

```bash
# Generate and open HTML report
npm run test:e2e:report
```

Report includes:
- Test results summary
- Failed test details
- Screenshots on failure
- Video recordings
- Trace viewer

### Common Issues

**Issue: Tests timing out**
```typescript
// Increase timeout for slow operations
test('slow operation', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  await page.goto('/');
});
```

**Issue: Element not found**
```typescript
// Wait for element with custom timeout
await page.locator('.my-element').waitFor({ timeout: 10000 });

// Or check if element exists
const exists = await page.locator('.my-element').count() > 0;
```

**Issue: Flaky tests**
```typescript
// Use waitForLoadState instead of hardcoded waits
await page.waitForLoadState('networkidle');

// Use auto-waiting assertions
await expect(page.locator('.result')).toBeVisible();
// ✅ Automatically retries until visible or times out

// Avoid this:
await page.waitForTimeout(5000); // ❌ Brittle
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          CI: true
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## Environment Variables

### Available Configuration

```bash
# Override base URL
PLAYWRIGHT_BASE_URL=http://localhost:3001 npm run test:e2e

# Run in CI mode
CI=true npm run test:e2e

# Custom Supabase for testing
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-key
```

## Test Data Management

### Mock Data Strategy

For tests that require data:

1. **Use test fixtures** in `e2e/fixtures/`
2. **Seed test database** before running tests
3. **Mock API responses** with Playwright's route mocking
4. **Use test user accounts** (see `e2e/helpers/auth.ts`)

### Example: Mock API Response

```typescript
test('mocked predictions', async ({ page }) => {
  // Intercept API call and return mock data
  await page.route('**/api/findr/predictions*', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        predictions: [
          { species_name_en: 'Cod', confidence_pct: 85 },
          { species_name_en: 'Haddock', confidence_pct: 72 },
        ],
      }),
    });
  });
  
  await page.goto('/findr');
  
  // Test with mocked data
  await expect(page.locator('text=Cod')).toBeVisible();
});
```

## Accessibility Testing

### Basic Checks

Playwright includes basic accessibility testing:

```typescript
import { test, expect } from '@playwright/test';

test('accessibility', async ({ page }) => {
  await page.goto('/');
  
  // Check for landmarks
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('nav')).toBeVisible();
  
  // Check for heading hierarchy
  const h1Count = await page.locator('h1').count();
  expect(h1Count).toBe(1); // Should have exactly one h1
});
```

### Advanced with @axe-core/playwright

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('full accessibility scan', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: {
      html: true,
    },
  });
});
```

## Performance Testing

### Measure Page Load

```typescript
import { test } from '@playwright/test';

test('page load performance', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const loadTime = Date.now() - startTime;
  
  console.log(`Page loaded in ${loadTime}ms`);
  
  // Assert performance threshold
  expect(loadTime).toBeLessThan(3000); // 3 seconds
});
```

## Next Steps

### Immediate Actions
1. ✅ Playwright installed and configured
2. ✅ Basic test suite created for Go Daisy and Findr
3. ✅ Helper functions for auth and location
4. ⏳ Add `data-testid` attributes to key UI elements
5. ⏳ Implement authentication test helpers with real auth flow
6. ⏳ Create test fixtures for common scenarios

### Future Enhancements
- Visual regression testing with Percy or Playwright snapshots
- Component screenshot testing
- Lighthouse performance audits
- Load testing with Artillery or k6
- Mobile app testing (when native apps are built)

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [VS Code Extension](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Summary

Playwright E2E testing is now fully configured for the WotNow project. The foundation is in place with:
- ✅ Multi-browser testing (Chromium, Firefox, WebKit, Mobile)
- ✅ Automatic dev server startup
- ✅ Helper utilities for common tasks
- ✅ Basic test coverage for core features
- ✅ Comprehensive npm scripts

**Start writing tests with:** `npm run test:e2e:ui`
