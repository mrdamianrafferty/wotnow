# QA Test Plan: AI-Assisted Automated Testing
**GoDaisy & Findr Platform**

**Tester**: Junior QA (Learning - AI-Assisted)  
**Date**: October 18, 2025  
**Sprint**: Complete Platform Testing  
**Environment**: Staging + Production

---

## 🎯 Your Mission

You're responsible for automated testing using AI tools to help you write comprehensive test suites. This is a learning opportunity to understand how professional QA automation works.

**Tools at your disposal:**
- GitHub Copilot / ChatGPT / Claude for test generation
- Jest + React Testing Library (already set up)
- Playwright (for E2E tests - you'll set this up)
- Browser DevTools
- Postman/Thunder Client (API testing)

---

## 📚 Phase 1: Understanding the Codebase (Day 1)

### Step 1.1: Read Documentation
- [ ] Read `GETTING_STARTED.md` completely
- [ ] Review `FINDR_FISH_IMAGE_ENHANCEMENT.md` for recent changes
- [ ] Understand the "Top 10 Things That Will Trip You Up" section
- [ ] Map out the application structure in a diagram

### Step 1.2: Run Existing Tests
```bash
# Run all existing tests to see current coverage
npm test

# Run with coverage report
npm run test:ci

# Review coverage report
open coverage/lcov-report/index.html
```

**Document:**
- Current test coverage percentage: ____%
- Files with <50% coverage: ___________
- Failed tests (if any): ___________

### Step 1.3: Manual Exploration (30 minutes each)
- [ ] Navigate through entire GoDaisy app (all pages)
- [ ] Navigate through entire Findr app (all pages)
- [ ] Create a sitemap document listing all routes
- [ ] Note any bugs or unexpected behavior

---

## 🤖 Phase 2: AI-Assisted Unit Test Creation (Days 2-3)

### Step 2.1: Utility Function Tests

**Target Files** (prioritize these):
- `lib/utils/getSuggestionsByDay.ts` (Activity scoring)
- `lib/utils/activityHelpers.ts` (Activity utilities)
- `lib/utils/weatherUtils.ts` (Weather conversions)
- `lib/findr/mapPrediction.ts` (Prediction mapping)

**AI Prompt Template:**
```
I need comprehensive Jest unit tests for this TypeScript function.

[PASTE FUNCTION CODE HERE]

Requirements:
1. Test all happy paths
2. Test edge cases (null, undefined, empty arrays, boundary values)
3. Test error handling
4. Use descriptive test names following "should [expected behavior] when [condition]"
5. Include setup and teardown if needed
6. Mock external dependencies
7. Aim for 100% code coverage

Please generate tests using Jest and @jest/globals.
```

**Your Tasks:**

#### Test: Activity Scoring Algorithm
```bash
# Create test file
touch __tests__/utils/getSuggestionsByDay.comprehensive.test.ts
```

- [ ] Use AI to generate tests for `getSuggestionsByDay()`
- [ ] Verify tests cover:
  - Temperature matching logic
  - Wind condition scoring
  - Precipitation impact
  - Marine conditions (waves, tides)
  - Seasonal appropriateness
  - Edge cases: missing weather data, invalid activity definitions
- [ ] Run tests: `npm test -- getSuggestionsByDay.comprehensive`
- [ ] Achieve >90% coverage for this function

#### Test: Weather Utilities
```bash
touch __tests__/utils/weatherUtils.test.ts
```

- [ ] Generate tests for temperature conversions (C to F)
- [ ] Test wind speed conversions (m/s to mph/knots)
- [ ] Test Beaufort scale calculations
- [ ] Test pressure conversions
- [ ] Verify all edge cases (negative temps, zero wind, etc.)

#### Test: Findr Prediction Mapping
```bash
touch __tests__/findr/mapPrediction.test.ts
```

- [ ] Test prediction response mapping
- [ ] Test species image URL resolution (including SPECIES_CODE_ALIASES)
- [ ] Test confidence score calculations
- [ ] Test environmental factor formatting
- [ ] Test missing data handling

**AI Prompt for Complex Functions:**
```
This function handles [DESCRIBE WHAT IT DOES].

[PASTE CODE]

Edge cases to test:
- [LIST SPECIFIC EDGE CASES YOU IDENTIFIED]

Please generate comprehensive tests with:
1. Mock data fixtures
2. Test cases for each edge case
3. Assertions for data structure validation
4. Error boundary tests
```

---

## 🎭 Phase 3: Component Testing (Days 4-5)

### Step 3.1: React Component Tests

**Target Components:**
- `components/ActivityOutlooks.tsx`
- `components/findr/ActiveSpeciesCard.tsx`
- `components/findr/GoodSpeciesCard.tsx`
- `components/findr/WaitingSpeciesCard.tsx`
- `components/weather-cards/HourlyCard.tsx`

**AI Prompt Template:**
```
I need React Testing Library tests for this component.

[PASTE COMPONENT CODE]

Context:
- Component receives these props: [LIST PROPS]
- Component renders [DESCRIBE WHAT IT SHOWS]
- User interactions: [LIST CLICK/HOVER/KEYBOARD EVENTS]

Please generate tests that:
1. Verify component renders without crashing
2. Test prop variations (different data scenarios)
3. Test user interactions (clicks, hovers, keyboard nav)
4. Test conditional rendering
5. Test accessibility (aria labels, roles, keyboard navigation)
6. Mock any hooks or API calls

Use @testing-library/react and @testing-library/user-event.
```

#### Test: ActiveSpeciesCard
```bash
touch __tests__/components/findr/ActiveSpeciesCard.test.tsx
```

**Test Checklist:**
- [ ] Renders with valid species data
- [ ] Displays correct confidence percentage
- [ ] Shows species image or GradientFish fallback
- [ ] Click opens species modal (verify onAction callback)
- [ ] Priority button toggles correctly
- [ ] Remove button works (verify onRemove callback)
- [ ] Event propagation stops for nested buttons
- [ ] Keyboard navigation (Tab, Enter) works
- [ ] Renders correctly on mobile (responsive classes)
- [ ] Accessibility: proper ARIA labels, roles, tabindex

**Sample Test Structure (use AI to expand):**
```typescript
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveSpeciesCard } from '@/components/findr/ActiveSpeciesCard';

describe('ActiveSpeciesCard', () => {
  const mockSpecies = {
    id: 'bass',
    name: 'European Bass',
    confidence: 95,
    // ... add all required props
  };

  it('should render species name and confidence', () => {
    render(<ActiveSpeciesCard species={mockSpecies} {...} />);
    expect(screen.getByText('European Bass')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });

  // Ask AI to generate 10+ more tests...
});
```

#### Test: Weather Cards
- [ ] Test HourlyCard with various weather conditions
- [ ] Test WindCard with different wind speeds
- [ ] Test WaveCard with different wave heights
- [ ] Test TidesCard with tide data

---

## 🔌 Phase 4: API Integration Tests (Day 6)

### Step 4.1: API Endpoint Testing

**Target Endpoints:**
- `POST /api/findr/predictions`
- `GET /api/weather/forecast`
- `GET /api/findr/favourites`
- `POST /api/findr/favourites`
- `DELETE /api/findr/favourites/:id`

**Setup:**
```bash
# Install if not present
npm install --save-dev supertest @types/supertest

# Create test file
touch __tests__/api/findr/predictions.api.test.ts
```

**AI Prompt for API Tests:**
```
Generate Jest + Supertest tests for this Next.js API route.

[PASTE API ROUTE CODE]

Test scenarios:
1. Successful request with valid data
2. Missing required parameters
3. Invalid parameter types
4. Database errors (mock)
5. External API failures (mock)
6. Response data structure validation
7. HTTP status codes
8. Rate limiting (if applicable)

Mock:
- Supabase client
- External API calls (Copernicus, EMODnet, Met.no)
- Database responses

Use supertest for HTTP requests.
```

**Test Checklist:**

#### Predictions API
- [ ] Returns predictions for valid rectangle code
- [ ] Returns 400 for missing rectangleCode
- [ ] Returns 400 for invalid rectangleCode format
- [ ] Returns empty array for no data (not error)
- [ ] Caches predictions (verify cache hit)
- [ ] Returns correct data structure
- [ ] Handles language parameter (en, da, de)
- [ ] Handles optional predictionDate
- [ ] Returns proper metadata (region, timestamp)
- [ ] Performance: responds within 500ms (with cache)

#### Weather API
- [ ] Returns forecast for valid coordinates
- [ ] Returns 400 for invalid coordinates
- [ ] Returns 400 for missing parameters
- [ ] Includes current, hourly, and daily forecasts
- [ ] Marine data included for coastal locations
- [ ] Handles Met.no API failures gracefully

#### Favourites API
- [ ] GET returns user's favourites (requires auth)
- [ ] POST adds favourite (requires auth)
- [ ] POST prevents duplicates
- [ ] DELETE removes favourite (requires auth)
- [ ] Returns 401 when not authenticated
- [ ] Enforces RLS policies

---

## 🌐 Phase 5: End-to-End Testing with Playwright (Days 7-8)

### Step 5.1: Setup Playwright

```bash
# Install Playwright
npm init playwright@latest

# Select options:
# - TypeScript
# - tests folder: e2e
# - Add GitHub Actions: Yes
```

### Step 5.2: Critical User Journeys

**AI Prompt for E2E Tests:**
```
Generate Playwright E2E tests for this user journey.

Journey: [DESCRIBE STEP BY STEP]
Starting URL: [URL]
Expected outcome: [WHAT SHOULD HAPPEN]

Test should:
1. Navigate through the flow
2. Fill forms if needed
3. Click buttons/links
4. Verify page navigation
5. Check for expected elements
6. Verify data persistence
7. Take screenshots on failure
8. Handle loading states
```

#### Journey 1: GoDaisy Onboarding → Activity Recommendation
```bash
touch e2e/godaisy-onboarding.spec.ts
```

**Test Flow:**
- [ ] Load homepage → redirects to /onboarding (if new user)
- [ ] Select location (e.g., "London, UK")
- [ ] Choose activities (select 5+ activities from different categories)
- [ ] Submit preferences
- [ ] Navigate to homepage
- [ ] Verify activity cards appear
- [ ] Verify weather-based scoring
- [ ] Click activity card → see details
- [ ] Share activity (verify share modal)

#### Journey 2: Findr Predictions Flow
```bash
touch e2e/findr-predictions.spec.ts
```

**Test Flow:**
- [ ] Navigate to /findr
- [ ] Select fishing area (ICES rectangle)
- [ ] Wait for predictions to load
- [ ] Verify species cards appear
- [ ] Verify confidence scores displayed
- [ ] Click species card → modal opens
- [ ] Verify species details modal content
- [ ] Close modal
- [ ] Add species to favourites (requires auth)
- [ ] Navigate to /findr/favourites
- [ ] Verify favourite appears

#### Journey 3: Findr Favourites Management
```bash
touch e2e/findr-favourites.spec.ts
```

**Test Flow:**
- [ ] Sign in (if not authenticated)
- [ ] Navigate to /findr/favourites
- [ ] Verify favourites list loads
- [ ] Verify "Hot Right Now" section
- [ ] Click fish thumbnail → modal opens
- [ ] Toggle priority flag
- [ ] Remove favourite
- [ ] Verify favourite disappears
- [ ] Sort by confidence/catches/recent
- [ ] Verify sort order changes

#### Journey 4: Weather Conditions Check
```bash
touch e2e/weather-conditions.spec.ts
```

**Test Flow:**
- [ ] Navigate to /weather
- [ ] Verify location displayed
- [ ] Verify current conditions card
- [ ] Verify hourly forecast (48 hours)
- [ ] Verify 7-day forecast
- [ ] Click wind card → see details
- [ ] Click wave card (if coastal)
- [ ] Click tide card (if coastal)
- [ ] Change location → data updates

### Step 5.3: Visual Regression Testing

**AI Prompt:**
```
Add visual regression tests to this Playwright test.

[PASTE EXISTING TEST]

Add:
1. Screenshot capture for key states
2. Visual comparison with baseline
3. Responsive testing (mobile, tablet, desktop)
4. Dark mode testing (if applicable)

Use Playwright's screenshot and toHaveScreenshot() APIs.
```

---

## 🔍 Phase 6: Performance Testing (Day 9)

### Step 6.1: Lighthouse CI Setup

```bash
# Install Lighthouse CI
npm install --save-dev @lhci/cli

# Create config
touch lighthouserc.js
```

**Config File:**
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run build && npm start',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/activities',
        'http://localhost:3000/weather',
        'http://localhost:3000/findr',
        'http://localhost:3000/findr/favourites',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
```

**Run Performance Tests:**
```bash
# Build and test
npm run build
npm start

# In another terminal
npx lhci autorun
```

**AI Task:**
- [ ] Ask AI to analyze Lighthouse report
- [ ] Generate performance optimization suggestions
- [ ] Create tickets for issues found

### Step 6.2: Load Testing with k6

```bash
# Install k6
brew install k6

# Create load test script
touch load-tests/predictions-api.js
```

**AI Prompt:**
```
Generate a k6 load test script for this API endpoint.

Endpoint: POST /api/findr/predictions
Payload: { "rectangleCode": "39F3" }

Test scenarios:
1. Ramp-up: 1 → 50 users over 30s
2. Sustained load: 50 users for 2 min
3. Spike: 100 users for 30s
4. Ramp-down: 50 → 1 users over 30s

Metrics to track:
- Response time (p95, p99)
- Requests per second
- Error rate
- Cache hit rate (if detectable)

Thresholds:
- p95 response time < 500ms
- Error rate < 1%
```

**Run Load Tests:**
```bash
k6 run load-tests/predictions-api.js
```

---

## 🐛 Phase 7: Bug Bash & Edge Cases (Day 10)

### Step 7.1: Chaos Testing

Use AI to generate edge case scenarios:

**AI Prompt:**
```
Generate 20 edge case test scenarios for [FEATURE].

Include:
- Boundary values (min/max)
- Invalid inputs
- Missing data
- Race conditions
- Network failures
- Timeout scenarios
- Concurrent operations
- State corruption
- Browser compatibility issues
- Mobile-specific issues

Format as test cases with:
1. Preconditions
2. Steps
3. Expected result
4. Actual result (to be filled)
```

#### Edge Cases to Test:

**GoDaisy Activity Scoring:**
- [ ] All weather data missing/null
- [ ] Temperature at exact boundary (0°C, 40°C)
- [ ] Wind speed = 0, wind speed > 100 km/h
- [ ] 100% precipitation probability
- [ ] Activity with no conditions defined
- [ ] User with 0 activities selected
- [ ] User with 100+ activities selected
- [ ] Location change during loading
- [ ] Stale weather data (>24 hours old)

**Findr Predictions:**
- [ ] Rectangle with no Copernicus data
- [ ] All species inactive (is_active = false)
- [ ] Species with missing images
- [ ] Confidence score = 0, = 100
- [ ] Invalid rectangle code format
- [ ] Rectangle in unsupported region
- [ ] Predictions requested for date 1 year in future
- [ ] Rapid location switching
- [ ] Add same favourite twice
- [ ] Remove favourite while modal open

**Authentication:**
- [ ] Sign in with invalid email
- [ ] Sign in with expired magic link
- [ ] Access protected route without auth
- [ ] Session expires during usage
- [ ] Sign out while API request in flight
- [ ] Multiple tabs with different users

**Caching:**
- [ ] Clear all caches → verify data reloads
- [ ] Cache expires mid-session
- [ ] Network offline → use cached data
- [ ] Stale cache vs fresh data conflict

---

## 📊 Phase 8: Accessibility Testing (Day 11)

### Step 8.1: Automated A11y Tests

```bash
# Install axe-core
npm install --save-dev @axe-core/playwright

# Create test
touch e2e/accessibility.spec.ts
```

**AI Prompt:**
```
Generate Playwright accessibility tests using @axe-core/playwright.

Pages to test:
- Homepage
- Activities page
- Weather page
- Findr predictions
- Findr favourites

Check for:
1. WCAG 2.1 Level AA compliance
2. Keyboard navigation
3. Screen reader compatibility
4. Color contrast
5. Focus indicators
6. ARIA labels
7. Heading hierarchy
8. Form labels
9. Alt text for images
10. Skip links

Generate tests that:
- Run axe on each page
- Verify no critical violations
- Test keyboard-only navigation
- Verify focus trap in modals
```

**Manual Keyboard Testing:**
- [ ] Tab through entire GoDaisy app
- [ ] Tab through entire Findr app
- [ ] Verify all interactive elements focusable
- [ ] Verify focus indicators visible
- [ ] Verify modals trap focus
- [ ] Test Escape key closes modals
- [ ] Test Enter/Space activate buttons

---

## 📱 Phase 9: Mobile & Browser Testing (Day 12)

### Step 9.1: Responsive Testing

**AI Prompt:**
```
Generate Playwright tests for responsive design.

Test viewports:
- Mobile: 375x667 (iPhone SE)
- Mobile large: 414x896 (iPhone 11 Pro)
- Tablet: 768x1024 (iPad)
- Desktop: 1920x1080

For each viewport:
1. Verify layout doesn't break
2. Verify touch targets ≥44x44px
3. Verify navigation appropriate (mobile nav vs desktop)
4. Verify cards stack/grid correctly
5. Verify modals fit screen
6. Test landscape orientation
```

**Test Checklist:**
- [ ] GoDaisy homepage responsive
- [ ] Activities page cards reflow
- [ ] Weather page cards stack on mobile
- [ ] Findr predictions scrollable on mobile
- [ ] Findr favourites touch-friendly
- [ ] Bottom navigation visible on mobile
- [ ] Modals scroll on small screens
- [ ] No horizontal scroll on any page

### Step 9.2: Cross-Browser Testing

Use BrowserStack or similar:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 📝 Phase 10: Documentation & Reporting (Day 13)

### Step 10.1: Test Coverage Report

Generate comprehensive report:

```bash
# Run all tests with coverage
npm run test:ci

# Generate HTML report
npx nyc report --reporter=html

# Open report
open coverage/index.html
```

**Document:**
- Overall coverage: ____%
- Files with <80% coverage:
  - `[FILE]` - ____%
  - `[FILE]` - ____%
- Untested critical paths:
  - `[DESCRIPTION]`

### Step 10.2: Bug Report Template

For each bug found:

```markdown
## Bug #[NUMBER]: [TITLE]

**Severity**: Critical | High | Medium | Low
**Priority**: P0 | P1 | P2 | P3

**Environment:**
- Browser: [e.g., Chrome 118]
- Device: [e.g., iPhone 14, Desktop]
- URL: [e.g., https://godaisy.io/findr]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happens]

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
[Paste console errors]
```

**Additional Context:**
- User type: [Authenticated/Guest]
- Data: [Specific data that triggers bug]
- Frequency: [Always/Intermittent/Rare]
```

### Step 10.3: Test Execution Summary

Create final report:

```markdown
# QA Test Execution Summary
**Date**: [DATE]
**Tester**: [YOUR NAME]
**Sprint**: Complete Platform Testing

## Test Statistics
- Total test cases: [NUMBER]
- Passed: [NUMBER]
- Failed: [NUMBER]
- Blocked: [NUMBER]
- Not executed: [NUMBER]

## Coverage
- Unit tests: [NUMBER] tests, [%] coverage
- Component tests: [NUMBER] tests
- Integration tests: [NUMBER] tests
- E2E tests: [NUMBER] tests
- Total code coverage: [%]

## Bugs Found
- Critical: [NUMBER]
- High: [NUMBER]
- Medium: [NUMBER]
- Low: [NUMBER]

## Performance
- Lighthouse Performance Score: [SCORE]/100
- API Response Time (p95): [MS]ms
- Page Load Time (p95): [MS]ms

## Recommendations
1. [RECOMMENDATION 1]
2. [RECOMMENDATION 2]
3. [RECOMMENDATION 3]
```

---

## 🎓 Learning Resources

### AI Prompting Tips

**Good Prompt:**
```
Generate Jest tests for this function that calculates fish confidence scores.

[CODE]

The function takes:
- Environmental data (temp, salinity, depth)
- Species preferences (min/max ranges)
- Weather conditions

Test scenarios:
1. Perfect match (all values in optimal range) → 100 score
2. Partial match (some values out of range) → 50-80 score
3. No match (all values out of range) → 0 score
4. Missing environmental data → handle gracefully
5. Invalid species preferences → throw error

Use descriptive test names and include edge cases.
```

**Bad Prompt:**
```
Write tests for this code.
[CODE]
```

### When to Ask AI for Help

✅ **Good uses:**
- Generate test boilerplate
- Create mock data
- Suggest edge cases you might miss
- Explain testing patterns
- Debug failing tests

❌ **Don't rely on AI for:**
- Understanding requirements (ask your team)
- Deciding test priority (use manual judgment)
- Final review (you must understand every test)
- Business logic verification (needs human context)

### Daily Checklist

**Every morning:**
- [ ] Pull latest code: `git pull origin main`
- [ ] Install dependencies: `npm install`
- [ ] Run existing tests: `npm test`
- [ ] Check for broken tests

**Every evening:**
- [ ] Commit your test code
- [ ] Update test documentation
- [ ] Log bugs found
- [ ] Plan tomorrow's tests

---

## 🆘 Getting Help

**Stuck? Follow this escalation:**
1. Check `GETTING_STARTED.md` troubleshooting section
2. Search existing test files for patterns
3. Ask AI: "How do I test [SPECIFIC SCENARIO]?"
4. Check documentation: Jest, React Testing Library, Playwright
5. Ask senior QA team member
6. Create detailed question with code examples

**Weekly sync with Senior QA:**
- Monday: Review test plan for the week
- Wednesday: Mid-week check-in, discuss blockers
- Friday: Present findings, get feedback

---

## ✅ Success Criteria

By end of 2 weeks, you should have:
- [ ] 80%+ code coverage
- [ ] 50+ unit tests
- [ ] 20+ component tests
- [ ] 10+ integration tests
- [ ] 15+ E2E test scenarios
- [ ] Accessibility audit passed
- [ ] Performance baseline established
- [ ] Bug report with 10+ issues found
- [ ] Comprehensive test documentation

**You'll know you succeeded when:**
- All critical user journeys have E2E tests
- You can explain every test you wrote
- Tests catch bugs before manual QA
- Senior QA approves your test strategy
- You feel confident in the test coverage

Good luck! Remember: AI is your assistant, not your replacement. Understand every test you commit. 🚀
