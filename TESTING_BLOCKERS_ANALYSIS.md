# Testing Blockers Analysis & Solutions

**Date:** October 19, 2025  
**Goal:** Reach 95%+ test pass rate  
**Current:** 85% (67/79 tests passing)

## 🎯 What's Blocking 95%+?

### Blocker #1: Species-Details API Tests (9 tests failing)

**Issue:** Table name mismatch in mocks  
**Impact:** 9/11 tests fail with 500 errors  
**Complexity:** ⭐ Low (simple fix)  
**Time:** 15-30 minutes

#### Root Cause
```typescript
// ❌ Test is mocking wrong table names
if (table === 'findr_species') { ... }
if (table === 'findr_species_techniques') { ... }

// ✅ Actual API uses these tables
.from('species')
.from('species_technique')
.from('species_bait')
.from('species_substrates')
```

#### Solution
Update the test file to mock the correct table names:

```typescript
(mockSupabaseClient.from as any).mockImplementation((table: string) => {
  if (table === 'species') {  // ✅ Fixed
    return speciesBuilder;
  }
  if (table === 'species_technique') {  // ✅ Fixed
    return techniqueBuilder;
  }
  if (table === 'species_bait') {  // ✅ Fixed
    return baitBuilder;
  }
  if (table === 'species_substrates') {  // ✅ Fixed
    return substrateBuilder;
  }
  return defaultBuilder;
});
```

**Status:** ✅ Can fix immediately - no blockers

---

### Blocker #2: E2E Species Display Test (1 test skipped)

**Issue:** Need to implement location selection + wait for predictions  
**Impact:** 1 skipped test  
**Complexity:** ⭐⭐ Medium  
**Time:** 1-2 hours

#### What's Needed
1. Use location helper to set location
2. Wait for predictions API call to complete
3. Verify species cards appear
4. Check confidence scores display

#### Current State
```typescript
test.skip('should display species predictions with location', async ({ page }) => {
  // TODO: Add location selection
  // TODO: Wait for predictions to load
  // TODO: Verify species cards are displayed
});
```

#### Solution
```typescript
test('should display species predictions with location', async ({ page }) => {
  await page.goto('/findr');
  
  // Set location using helper
  await setLocation(page, TEST_LOCATIONS.DUBLIN);
  
  // Wait for predictions to load
  await page.waitForSelector('[data-testid="species-card"]', { timeout: 10000 });
  
  // Verify species cards
  const speciesCards = page.locator('[data-testid="species-card"]');
  expect(await speciesCards.count()).toBeGreaterThan(0);
  
  // Verify confidence scores
  const firstCard = speciesCards.first();
  await expect(firstCard.locator('[data-testid="confidence-score"]')).toBeVisible();
});
```

**Prerequisite:** Need to add `data-testid` attributes to species cards in UI  
**Status:** ⚠️ Needs UI updates first (30 min) + test implementation (1 hour)

---

### Blocker #3: E2E Auth Tests (2 tests skipped)

**Issue:** Need to mock or use real Supabase auth  
**Impact:** 2 skipped catch-log tests  
**Complexity:** ⭐⭐⭐ Medium-High  
**Time:** 2-3 hours

#### What's Needed
Two approaches available:

##### Approach A: Mock Supabase Auth (Faster, More Brittle)
```typescript
// Intercept Supabase auth API calls
await page.route('**/auth/v1/**', async (route) => {
  const url = route.request().url();
  
  if (url.includes('/token')) {
    // Mock sign in
    await route.fulfill({
      status: 200,
      body: JSON.stringify({
        access_token: 'mock-token',
        refresh_token: 'mock-refresh',
        user: { id: 'test-user-123', email: 'test@example.com' }
      })
    });
  }
});
```

**Pros:** Fast, no test user needed  
**Cons:** Brittle, doesn't test real auth flow

##### Approach B: Use Test User + Real Auth (Slower, More Realistic)
```typescript
// Use real Supabase with test credentials
const TEST_USER = {
  email: 'e2e-test@fishfindr.eu',
  password: process.env.E2E_TEST_PASSWORD
};

test('authenticated catch log', async ({ page }) => {
  // Real sign in
  await page.goto('/findr/auth');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  
  // Wait for redirect
  await page.waitForURL('**/findr');
  
  // Now test authenticated features
  await page.goto('/findr/log');
  // ... test catch logging
});
```

**Pros:** Tests real auth flow, more realistic  
**Cons:** Slower, needs test user in Supabase, credentials management

#### Current State
```typescript
test.skip('should display catch log form when authenticated', async ({ page }) => {
  // TODO: Add authentication helper
  // TODO: Mock or use test user credentials
  // TODO: Verify catch log form is displayed
});

test.skip('should submit catch log successfully', async ({ page: _page }) => {
  // TODO: Authenticate user
  // TODO: Fill out catch log form
  // TODO: Submit and verify success
});
```

**Status:** ⚠️ Need to decide on approach and implement auth setup

---

## 🚧 What's NOT Blocking Us (Common Misconceptions)

### ❌ NOT Blocked: Real Database Access
**Reality:** We mock Supabase completely - no real DB needed  
**For API Tests:** All Supabase calls are mocked  
**For E2E Tests:** Can mock API routes or use test data

### ❌ NOT Blocked: External API Keys
**Reality:** We mock CMEMS, weather APIs, etc.  
**For API Tests:** Mock responses in tests  
**For E2E Tests:** Mock at network layer with Playwright

### ❌ NOT Blocked: Production Environment
**Reality:** Tests run against `localhost:3000`  
**Dev Server:** Playwright automatically starts it  
**Test Data:** Use fixtures and mocks

### ❌ NOT Blocked: Complex Infrastructure
**Reality:** Everything runs locally  
**No Docker needed**  
**No test databases**  
**No external services**

---

## ✅ Action Plan to 95%+

### Phase 1: Quick Wins (1 hour)
1. **Fix Species-Details Tests** (30 min)
   - Update table names in mocks
   - Run tests to verify
   - **Result:** 64/64 API tests passing (100%)

2. **Add data-testid to UI** (30 min)
   - Species cards: `data-testid="species-card"`
   - Confidence scores: `data-testid="confidence-score"`
   - Location button: `data-testid="location-button"`
   - **Result:** Enables stable E2E selectors

### Phase 2: E2E Species Display (1-2 hours)
3. **Implement Species Display Test** (1-2 hours)
   - Use location helper
   - Wait for species cards
   - Verify confidence scores
   - **Result:** 13/15 E2E tests passing (87%)

### Phase 3: E2E Auth Flow (2-3 hours)
4. **Choose Auth Approach** (15 min)
   - Decision: Real auth with test user (more realistic)
   - Create test user in Supabase
   - Add credentials to `.env.test.local`

5. **Implement Auth Tests** (2-3 hours)
   - Update auth helpers with real flow
   - Test catch-log form display
   - Test catch submission
   - **Result:** 15/15 E2E tests passing (100%)

### Expected Outcome
- **Phase 1:** 64/64 API + 12/15 E2E = **76/79 (96%)** ✅ GOAL MET!
- **Phase 2:** 64/64 API + 13/15 E2E = **77/79 (97%)** 🎯
- **Phase 3:** 64/64 API + 15/15 E2E = **79/79 (100%)** 🎉

**Total Time:** 4-6 hours  
**Total Complexity:** Medium (no major blockers)

---

## 🛠️ Detailed Implementation Guide

### Task 1: Fix Species-Details Tests (30 min)

#### Step 1: Identify the Mock Pattern
Current working pattern from catch-log tests:
```typescript
const mockQuery = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
  limit: jest.fn().mockReturnThis(),
};

(mockSupabaseClient.from as Mock).mockImplementation((table) => {
  if (table === 'actual_table_name') return mockQuery;
  return mockQuery;
});
```

#### Step 2: Update Test File
File: `__tests__/api/findr/species-details.api.test.ts`

Change:
- `'findr_species'` → `'species'`
- `'findr_species_techniques'` → `'species_technique'`
- `'findr_species_bait'` → `'species_bait'`
- `'findr_species_substrates'` → `'species_substrates'`

#### Step 3: Handle Nested Joins
The API uses nested joins like:
```typescript
.select(`
  technique_id,
  effectiveness,
  technique!inner (
    id,
    technique_code,
    name_en
  )
`)
```

Mock should return:
```typescript
{
  technique_id: 1,
  effectiveness: 90,
  technique: {  // or technique: [{}] for array
    id: 1,
    technique_code: 'BOTTOM',
    name_en: 'Bottom Fishing'
  }
}
```

#### Step 4: Run Tests
```bash
./node_modules/.bin/jest __tests__/api/findr/species-details.api.test.ts
```

**Expected:** 11/11 passing

---

### Task 2: Add data-testid Attributes (30 min)

#### Files to Update
1. Species cards component
2. Location button/dialog
3. Confidence score display
4. Catch-log form elements

#### Example Changes
```tsx
// Before
<div className="card">
  <h3>{species.name}</h3>
  <p>{species.confidence}%</p>
</div>

// After
<div className="card" data-testid="species-card">
  <h3 data-testid="species-name">{species.name}</h3>
  <p data-testid="confidence-score">{species.confidence}%</p>
</div>
```

#### Strategy
Search for key UI elements:
```bash
# Find species card components
grep -r "className.*card" components/findr/

# Find location buttons
grep -r "location" components/findr/ | grep -i button

# Find confidence display
grep -r "confidence" components/findr/
```

---

### Task 3: Implement Species Display Test (1-2 hours)

#### File: `e2e/findr-predictions.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { setLocation, TEST_LOCATIONS, waitForLocationSet } from './helpers/location';

test('should display species predictions with location', async ({ page }) => {
  // Navigate to Findr
  await page.goto('/findr');
  await page.waitForLoadState('networkidle');
  
  // Set location
  await setLocation(page, TEST_LOCATIONS.DUBLIN);
  
  // Wait for location to be set and predictions to load
  await waitForLocationSet(page);
  
  // Wait for species cards to appear
  const speciesCards = page.locator('[data-testid="species-card"]');
  await expect(speciesCards.first()).toBeVisible({ timeout: 15000 });
  
  // Verify we have multiple species
  const count = await speciesCards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(20); // API returns max 20
  
  // Verify first species has required data
  const firstCard = speciesCards.first();
  await expect(firstCard.locator('[data-testid="species-name"]')).toBeVisible();
  await expect(firstCard.locator('[data-testid="confidence-score"]')).toBeVisible();
  
  // Verify confidence score is a percentage
  const confidenceText = await firstCard.locator('[data-testid="confidence-score"]').textContent();
  expect(confidenceText).toMatch(/\d+%/);
});
```

---

### Task 4: Implement Auth Tests (2-3 hours)

#### Step 1: Create Test User in Supabase
1. Go to Supabase dashboard → Authentication → Users
2. Add user: `e2e-test@fishfindr.eu` / strong password
3. Confirm email manually or disable email confirmation for test env

#### Step 2: Add Credentials
Create `.env.test.local`:
```bash
E2E_TEST_EMAIL=e2e-test@fishfindr.eu
E2E_TEST_PASSWORD=YourSecurePasswordHere123!
```

Add to `.gitignore`:
```
.env.test.local
```

#### Step 3: Update Auth Helper
File: `e2e/helpers/auth.ts`

```typescript
export const TEST_USER = {
  email: process.env.E2E_TEST_EMAIL || 'e2e-test@fishfindr.eu',
  password: process.env.E2E_TEST_PASSWORD || '',
};

export async function signIn(page: Page, user: TestUser = TEST_USER) {
  if (!user.password) {
    throw new Error('E2E_TEST_PASSWORD not set in .env.test.local');
  }
  
  await page.goto('/findr/auth');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to Findr
  await page.waitForURL('**/findr**', { timeout: 10000 });
  
  // Wait for page to stabilize
  await page.waitForLoadState('networkidle');
}
```

#### Step 4: Implement Catch-Log Tests
File: `e2e/findr-catch-log.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { signIn, signOut } from './helpers/auth';
import { setLocation, TEST_LOCATIONS } from './helpers/location';

test.describe('Findr - Catch Log (Authenticated)', () => {
  test('should display catch log form when authenticated', async ({ page }) => {
    // Sign in first
    await signIn(page);
    
    // Navigate to catch log
    await page.goto('/findr/log');
    await page.waitForLoadState('networkidle');
    
    // Verify form elements are present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('[data-testid="species-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="quantity-input"]')).toBeVisible();
  });
  
  test('should submit catch log successfully', async ({ page }) => {
    // Sign in
    await signIn(page);
    
    // Set location first
    await page.goto('/findr');
    await setLocation(page, TEST_LOCATIONS.DUBLIN);
    
    // Go to catch log
    await page.goto('/findr/log');
    await page.waitForLoadState('networkidle');
    
    // Fill out form
    await page.selectOption('[data-testid="species-select"]', { index: 1 });
    await page.fill('[data-testid="quantity-input"]', '2');
    await page.selectOption('[data-testid="size-select"]', 'medium');
    await page.check('[data-testid="followed-advice"]');
    
    // Submit
    await page.click('[data-testid="submit-catch"]');
    
    // Wait for success message
    await expect(page.locator('text=/success|submitted/i')).toBeVisible({ timeout: 10000 });
  });
});
```

---

## 🎯 Success Criteria

### Minimum for 95%+ (Phase 1 + 2)
- ✅ 64/64 API tests passing (100%)
- ✅ 13/15 E2E tests passing (87%)
- ✅ **Total: 77/79 (97.5%)** ✨

### Stretch Goal for 100% (Phase 1 + 2 + 3)
- ✅ 64/64 API tests passing (100%)
- ✅ 15/15 E2E tests passing (100%)
- ✅ **Total: 79/79 (100%)** 🎉

---

## 📋 Summary

### Nothing is Actually Blocking Us! 🎉

The path to 95%+ is clear:
1. ✅ Fix table name mismatch (30 min)
2. ✅ Add data-testid attributes (30 min)  
3. ✅ Implement species display test (1-2 hours)
4. ⏳ Implement auth tests (2-3 hours) - optional for 95%

**Total time to 95%:** ~2 hours  
**Total time to 100%:** ~5 hours

### Key Insights
- ✅ No infrastructure needed
- ✅ No external services needed
- ✅ No production access needed
- ✅ Everything runs locally
- ✅ Mocking handles all complexity

**We can start fixing immediately!** 🚀

---

## 🚀 Let's Start!

**Recommended Order:**
1. Fix species-details tests (quick win)
2. Add data-testid (improves all E2E tests)
3. Species display test (validates core flow)
4. Auth tests (nice to have, completes 100%)

**Would you like to start with #1 (species-details fix)?** It's a 30-minute task that gets us from 86% to 100% on API tests!
