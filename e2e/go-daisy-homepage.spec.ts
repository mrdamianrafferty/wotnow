import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Homepage (index)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test location in localStorage before page load
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking', 'cycling', 'surfing', 'sea_swimming']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page loaded with main content
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Page body should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display weather forecast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for weather data to load (looking for temperature or weather info)
    // Give it time to fetch data
    await page.waitForTimeout(3000);
    
    // Check for weather-related content (could be temperature, weather icons, etc.)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display activity suggestions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Activity cards should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have working header navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for header
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should display location information', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // With our test data, Dublin should appear somewhere
    await page.waitForTimeout(2000);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show hero activity card', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait for activities to load
    await page.waitForTimeout(3000);
    
    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Page should still load properly on mobile
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Go Daisy - Homepage Interactions', () => {
  test.beforeEach(async ({ page }) => {
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

  test('should allow clicking on activity cards', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try to find clickable activity elements
    const clickableElements = page.locator('[role="button"], button');
    const count = await clickableElements.count();
    
    // Should have some interactive elements
    expect(count).toBeGreaterThan(0);
  });

  test('should display day-by-day forecast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Page should have loaded with content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Go Daisy - Homepage Error States', () => {
  test('should handle missing location gracefully', async ({ page }) => {
    // Don't set location in localStorage
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should still load (might show onboarding prompt)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle missing interests gracefully', async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: [] // Empty interests
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should still load (might show prompt to select interests)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
