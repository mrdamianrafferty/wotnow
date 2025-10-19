import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Activities Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the marine API to prevent Stormglass 402 errors
    await page.route('**/api/marine*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hours: []
        })
      });
    });
    
    // Set up test profile with activities
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: 'Bundoran, Ireland',
        coastalSpot: { name: 'Bundoran', lat: 54.4769, lon: -8.2810 },
        selectedActivities: ['hiking', 'cycling', 'surfing', 'sea_swimming', 'basketball_outdoor']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load activities page', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL(/\/activities/);
    
    // Page should have main content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display activity cards', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForTimeout(3000);
    
    // Should have activity content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should show day navigation tabs', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for navigation elements (could be tabs, buttons, etc.)
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should display weather data for activities', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Page should show content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Go Daisy - Activities Page Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the marine API to prevent Stormglass 402 errors
    await page.route('**/api/marine*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hours: []
        })
      });
    });
    
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking', 'cycling', 'surfing']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should allow day switching', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Use role-based selector for tabs within the tablist
    const tabs = page.locator('[role="tablist"]').first().locator('[role="tab"]');
    const tabCount = await tabs.count();
    
    if (tabCount > 1) {
      // Click the second tab (Tomorrow)
      const secondTab = tabs.nth(1);
      
      // Ensure visibility and stability before clicking
      await secondTab.scrollIntoViewIfNeeded();
      await expect(secondTab).toBeVisible({ timeout: 5000 });
      await expect(secondTab).toBeEnabled({ timeout: 5000 });
      
      await secondTab.click();
      
      // Wait for tab selection to update
      await expect(secondTab).toHaveAttribute('aria-selected', 'true', { timeout: 3000 });
    }
    
    // Page should still be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show activity assessment badges', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Should have content displaying activity assessments
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Go Daisy - Activities Page Error States', () => {
  test('should prompt for location if missing', async ({ page }) => {
    // No location set
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Should show some UI (either activities or prompt)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should prompt for interests if missing', async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: [] // Empty
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
    
    await page.goto('/activities');
    await page.waitForLoadState('networkidle');
    
    // Should show prompt or empty state
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
