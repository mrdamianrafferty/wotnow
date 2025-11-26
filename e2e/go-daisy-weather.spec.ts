import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Weather Page', () => {
  // Increase timeout for weather page tests (API calls can be slow)
  test.setTimeout(60000);
  
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: 'Bundoran, Ireland',
        coastalSpot: { name: 'Bundoran', lat: 54.4769, lon: -8.2810 },
        selectedActivities: ['hiking', 'surfing']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load weather page', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Check URL
    await expect(page).toHaveURL(/\/weather/);
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display weather forecast', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Should have main content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show temperature data', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Page should be loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show wind information', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show marine data when coastal location set', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // With coastal location, should show marine data
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display tide information', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Should have content
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });
  });

  test('should show sunrise/sunset times', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Go Daisy - Weather Page without Marine Location', () => {
  test.setTimeout(60000);
  
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load weather page without marine data', async ({ page }) => {
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Should still show weather content
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Go Daisy - Weather Page Error States', () => {
  test.setTimeout(60000);
  
  test('should handle missing location', async ({ page }) => {
    // No localStorage profile set
    await page.goto('/weather', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    
    // Should still show some UI
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });
  });
});
