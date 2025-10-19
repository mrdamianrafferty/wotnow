# Testing Quick Reference

**Quick commands for daily testing workflow**

## 🚀 Quick Start

```bash
# Run everything
npm test && npm run test:e2e

# Just API tests (fast)
npm test

# Just E2E tests (interactive)
npm run test:e2e:ui
```

## 📊 Status at a Glance

| Test Type | Pass Rate | Speed | Command |
|-----------|-----------|-------|---------|
| **API Tests** | 86% (55/64) | <2s | `npm test` |
| **E2E Tests** | 80% (12/15) | ~15s | `npm run test:e2e` |
| **Overall** | 85% (67/79) | ~17s | Both |

## 🎯 Common Commands

### API Tests (Jest)
```bash
# Run all API tests
npm test

# Run with coverage
npm run test:ci

# Run specific file
./node_modules/.bin/jest __tests__/api/findr/predictions.api.test.ts

# Run specific test
./node_modules/.bin/jest -t "should return predictions"

# Watch mode (for development)
./node_modules/.bin/jest --watch

# Coverage report
open coverage/index.html
```

### E2E Tests (Playwright)
```bash
# Run all (headless)
npm run test:e2e

# Interactive mode (BEST for development)
npm run test:e2e:ui

# See browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific browser
npm run test:e2e:chromium

# View last report
npm run test:e2e:report

# Run specific file
npx playwright test e2e/go-daisy.spec.ts

# Run specific test
npx playwright test -g "should load homepage"
```

## 📝 Writing Tests

### API Test Template
```typescript
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/findr/your-endpoint';

describe('GET /api/findr/your-endpoint', () => {
  it('should return 200', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { param: 'value' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('expectedField');
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test('should do something', async ({ page }) => {
  await page.goto('/path');
  await page.waitForLoadState('networkidle');
  
  const element = page.locator('[data-testid="element"]');
  await expect(element).toBeVisible();
});
```

## 🔍 Debugging

### API Tests
```bash
# Add console.log in test
console.log(JSON.parse(res._getData()));

# Run single test in watch mode
./node_modules/.bin/jest -t "test name" --watch
```

### E2E Tests
```bash
# Debug mode (best option)
npm run test:e2e:debug

# See browser
npm run test:e2e:headed

# Interactive UI
npm run test:e2e:ui

# View screenshots on failure
# Automatically saved to test-results/
```

## 📁 Test File Locations

```
__tests__/
├── api/
│   └── findr/
│       ├── predictions.api.test.ts       ✅ 14/14
│       ├── catch-log.api.test.ts         ✅ 12/12
│       ├── conditions.api.test.ts        ✅ 18/18
│       ├── marine-weather.api.test.ts    ✅ 8/8
│       └── species-details.api.test.ts   ⚠️ 2/11

e2e/
├── go-daisy.spec.ts                      ✅ 5/5
├── findr-predictions.spec.ts             ✅ 6/7
├── findr-catch-log.spec.ts               ✅ 1/3
└── helpers/
    ├── auth.ts                           🛠️ Utilities
    └── location.ts                       🛠️ Utilities
```

## 🎨 Test Patterns

### Mock Supabase RPC
```typescript
function mockPredictionsRpc() {
  (mockSupabaseClient.rpc as Mock).mockResolvedValueOnce({
    data: mockPredictions,
    error: null,
  });
  (mockSupabaseClient.auth.signOut as Mock).mockResolvedValueOnce({
    error: null,
  });
}
```

### Mock Supabase createClient
```typescript
jest.mock('@supabase/supabase-js');
(createClient as Mock).mockReturnValue(mockSupabaseClient);
```

### E2E Auth Helper
```typescript
import { signIn, TEST_USER } from './helpers/auth';

test('authenticated feature', async ({ page }) => {
  await signIn(page);
  // Test authenticated features
});
```

### E2E Location Helper
```typescript
import { setLocation, TEST_LOCATIONS } from './helpers/location';

test('location feature', async ({ page }) => {
  await setLocation(page, TEST_LOCATIONS.DUBLIN);
  // Test location-specific features
});
```

## 🐛 Common Issues

### Issue: Test times out
```typescript
// Increase timeout
test.setTimeout(30000); // 30 seconds
```

### Issue: Element not found (E2E)
```typescript
// Use data-testid
<button data-testid="submit-btn">Submit</button>

// Then select with
await page.locator('[data-testid="submit-btn"]').click();
```

### Issue: Mock not working (API)
```typescript
// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| **TESTING_INFRASTRUCTURE_SUMMARY.md** | Complete overview |
| **TEST_COVERAGE_REPORT.md** | Coverage analysis |
| **TESTING_FIXES_SUMMARY.md** | API test patterns |
| **E2E_TESTING_GUIDE.md** | Playwright guide |
| **E2E_TESTING_STATUS.md** | E2E status |

## ✅ Pre-Commit Checklist

```bash
# 1. Run tests
npm test && npm run test:e2e

# 2. Check coverage
npm run test:ci

# 3. Lint
npm run lint

# 4. Type check
npm run typecheck

# 5. Build
npm run build
```

## 🎯 Current Priorities

1. ⏳ Fix species-details tests (9 tests, 30-45 min)
2. ⏳ Complete E2E prediction flow (1 test, 1-2 hours)
3. ⏳ Add E2E auth flow (2 tests, 1-2 hours)
4. ⏳ CI/CD integration (1 hour)

## 📈 Goals

- **Current:** 85% pass rate
- **Next Milestone:** 95% pass rate
- **Long-term:** 98%+ with full coverage

---

**Questions?** See detailed docs above or check `docs/README.md`
