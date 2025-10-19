# Go Daisy E2E Navigation Investigation

**Date**: October 19, 2025  
**Issue**: Navigation tests failing with 30s timeouts  
**Root Cause**: Tests trying to click hidden/non-existent elements

---

## 🔍 Investigation Summary

### What We Found

Using a debug test (`e2e/debug-navigation.spec.ts`), we inspected the actual DOM structure and element visibility on the homepage.

#### Navigation Links - Actual State

**`/activities` links** (9 total):
- ❌ 1 hidden (in closed hamburger dropdown)
- ✅ 8 visible (in day card action buttons)

**`/weather` links** (1 total):
- ❌ 1 hidden (only in hamburger dropdown)
- ✅ 0 visible on page

**`/interests` links** (9 total):
- ❌ 1 hidden (in closed hamburger dropdown)  
- ✅ 8 visible (in day card action buttons)

**`/account` links**:
- ❌ 0 total - **page doesn't exist!**

#### Footer Links

**Existing**:
- ✅ `/support` - visible
- ✅ `/AboutUs` - visible

**Missing**:
- ❌ `/FAQs` - **doesn't exist in footer!**

---

## 🐛 Problems Identified

### 1. Invalid Pseudo-Selector
```typescript
// ❌ DOESN'T WORK - :visible is not a valid Playwright selector
page.locator('a[href="/activities"]:visible')

// ✅ WORKS - Use nth() to skip hidden elements
page.locator('a[href="/activities"]').nth(1) // Skip first (hidden in dropdown)
```

### 2. Non-Existent Pages
Tests were trying to navigate to pages that don't exist:
- `/account` - should use `/interests` instead
- `/FAQs` - link doesn't exist in footer

### 3. Hidden Dropdown Links
Original tests tried to click links that exist but are hidden in the collapsed hamburger menu without opening it first.

---

## ✅ Solutions Applied

### Navigation Tests

**Activities & Interests Pages**:
```typescript
// Use nth(1) to skip first hidden link in dropdown
const activitiesLinks = page.locator('a[href="/activities"]');
await activitiesLinks.nth(1).click(); // Gets first visible link
```

**Weather Page**:
```typescript
// Open hamburger menu first, then click
const hamburger = page.locator('[aria-label="Open menu"]').first();
await hamburger.click();
await page.waitForTimeout(300);

const weatherLink = page.locator('.dropdown-content a[href="/weather"]').first();
await weatherLink.click();
```

**Header/Footer Tests**:
```typescript
// Updated page lists to only include existing pages
const headerPages = ['/', '/activities', '/weather', '/interests']; // Removed /account
const footerPages = ['/', '/activities', '/AboutUs', '/support']; // Removed /FAQs
```

---

## 📊 Test Results

### Before Investigation
- ❌ 5/10 tests failing with 30s timeouts
- Tests trying to click hidden/non-existent elements

### After Fixes
- ✅ 10/10 navigation tests passing
- ✅ 9/9 activities tests passing
- Total: **19/19 passing**

---

## 💡 Key Learnings

1. **Always verify elements exist and are visible** before writing tests
2. **Use debug tests** to inspect actual DOM state
3. **`:visible` pseudo-selector doesn't work** in Playwright - use `nth()` or open menus
4. **Don't assume page structure** - many navigation links are in dropdowns
5. **Hamburger menus require explicit opening** before accessing links

---

## 🛠️ Debug Test

Created `e2e/debug-navigation.spec.ts` for future investigations:
- Inspects all navigation links and their visibility
- Checks hamburger menu and dropdown content
- Verifies header/footer presence
- Can be run anytime to validate navigation structure

```bash
npm run test:e2e -- debug-navigation.spec.ts --project=chromium
```

---

## 📋 Recommendations

### For Future Tests
1. ✅ Use `nth(1)` to skip hidden dropdown links when multiple instances exist
2. ✅ Open hamburger menus before clicking dropdown-only links
3. ✅ Verify pages exist before adding to test iterations
4. ✅ Use explicit waits with reasonable timeouts (5s max)
5. ✅ Add comments explaining why nth(1) is used instead of nth(0)

### For Application Code
Consider adding `data-testid` attributes to make tests more reliable:
```tsx
<Link href="/activities" data-testid="activities-link-visible">
  Activity dashboard
</Link>
```

This would allow tests to use:
```typescript
page.locator('[data-testid="activities-link-visible"]')
```

---

## 🎯 Status

All Go Daisy navigation and activities E2E tests now pass reliably without timeouts.
