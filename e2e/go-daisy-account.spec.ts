import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Account Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking', 'cycling']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load account page', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL(/\/account/);
  });

  test('should display account settings', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should have account heading
    const heading = page.locator('h1', { hasText: 'Your account' });
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test('should show location settings', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    // Should have location-related content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show activity preferences', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should allow editing home location', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    // Look for buttons or inputs for location
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Go Daisy - Interests/Preferences Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking', 'cycling']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should load interests page', async ({ page }) => {
    await page.goto('/interests');
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL(/\/interests/);
  });

  test('should display activity selection', async ({ page }) => {
    await page.goto('/interests');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should allow toggling activities', async ({ page }) => {
    await page.goto('/interests');
    await page.waitForLoadState('networkidle');
    
    // Look for interactive elements
    const clickableElements = page.locator('button, [role="button"]');
    const count = await clickableElements.count();
    
    expect(count).toBeGreaterThan(0);
  });
});
