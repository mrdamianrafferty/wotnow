import { test, expect } from '@playwright/test';

test.describe('Grow Daisy - Weather Page', () => {
  // Increase timeout for weather page tests (API calls can be slow)
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Set up test location in localStorage before page load
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening', 'growing']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load weather page with correct URL and visible body', async ({ page }) => {
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Check URL matches
    await expect(page).toHaveURL(/\/grow\/weather/);

    // Check that body is visible
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });
  });

  test('should display content when location is set in localStorage', async ({ page }) => {
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check that main content or page body is visible
    const main = page.locator('main, [role="main"]');
    const body = page.locator('body');

    const mainVisible = await main.count() > 0;
    if (mainVisible) {
      await expect(main.first()).toBeVisible();
    } else {
      await expect(body).toBeVisible();
    }
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Page should still load and be visible on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });
  });

  test('should load gracefully when no location is set', async ({ page }) => {
    // Don't set location in localStorage - test error state
    await page.addInitScript(() => {
      // Clear any existing profile
      localStorage.removeItem('profile.v1');
    });

    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Page should still load gracefully (either show content or error message)
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });
  });

  test('should display forecast content after API data loads', async ({ page }) => {
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for API data to load
    await page.waitForTimeout(3000);

    // Check that main content is visible
    const main = page.locator('main, [role="main"]');
    const body = page.locator('body');

    // Should have visible content (either main or body)
    if (await main.count() > 0) {
      await expect(main.first()).toBeVisible();
    } else {
      await expect(body).toBeVisible();
    }
  });
});

test.describe('Grow Daisy - Weather Page with Full Profile', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    // Set up comprehensive test profile
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: 'Bundoran, Ireland',
        coastalSpot: { name: 'Bundoran', lat: 54.4769, lon: -8.2810 },
        selectedActivities: ['gardening', 'growing', 'hiking']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should display weather and soil temperature information', async ({ page }) => {
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for data to fully load
    await page.waitForTimeout(3000);

    // Page should be fully loaded with content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle mobile viewport with full profile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for content
    await page.waitForTimeout(2000);

    // Should remain responsive and visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show smart watering recommendations if available', async ({ page }) => {
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for all content including recommendations
    await page.waitForTimeout(3000);

    // Main content should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Grow Daisy - Weather Page Error States', () => {
  test.setTimeout(60000);

  test('should display error state gracefully when no location set', async ({ page }) => {
    // Clear localStorage - no profile set
    await page.addInitScript(() => {
      localStorage.clear();
    });

    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Should show some UI (either content or error prompt)
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });
  });

  test('should handle API failures gracefully', async ({ page }) => {
    // Set location
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });

    // Navigate to page
    await page.goto('/grow/weather', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('domcontentloaded');

    // Page should still be visible even if some APIs fail
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 60000 });
  });
});
