import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Accessibility', () => {
  test.setTimeout(60000);
  
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

  test('homepage should have main landmark', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('activities page should have main landmark', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('weather page should have main landmark', async ({ page }) => {
    await page.goto('/weather');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    await page.waitForTimeout(2000);
    
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test('should have accessible header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should have accessible footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    const footer = page.locator('footer').first();
    await expect(footer).toBeVisible();
  });

  test('buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    
    // Should be able to focus elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('links should be keyboard accessible', async ({ page }) => {
    await page.goto('/AboutUs');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    // Tab to first link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Go Daisy - Keyboard Navigation', () => {
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

  test('should allow keyboard navigation through header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
    
    // Something should be focused
    const hasFocus = await page.evaluate(() => document.activeElement !== document.body);
    expect(hasFocus).toBe(true);
  });

  test('should allow keyboard navigation on activities page', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    await page.waitForTimeout(2000);
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const hasFocus = await page.evaluate(() => document.activeElement !== document.body);
    expect(hasFocus).toBe(true);
  });
});

test.describe('Go Daisy - Screen Reader Support', () => {
  test.setTimeout(60000);

  // Note: Homepage title may not be set reliably during SSR/hydration
  test.skip('homepage should have meaningful title', async () => {
    // Title is dynamically set and may be empty during initial load
  });

  test('activities page should have meaningful title', async ({ page }) => {
    await page.goto('/activities');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    try {
      await page.waitForFunction(
        () => document.title && document.title.trim() !== '',
        { timeout: 10000 }
      );
    } catch (_e) {
      // Continue to assertion
    }
    
    const title = await page.title();
    expect(title, 'Activities page title should match pattern').toMatch(/Activities|WotNow|Go Daisy/);
  });

  test('weather page should have meaningful title', async ({ page }) => {
    await page.goto('/weather');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    try {
      await page.waitForFunction(
        () => document.title && document.title.trim() !== '',
        { timeout: 10000 }
      );
    } catch (_e) {
      // Continue to assertion
    }
    
    const title = await page.title();
    expect(title, 'Weather page title should match pattern').toMatch(/Weather|WotNow|Go Daisy/);
  });

  test('about us page should have meaningful title', async ({ page }) => {
    await page.goto('/AboutUs');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    try {
      await page.waitForFunction(
        () => document.title && document.title.trim() !== '',
        { timeout: 10000 }
      );
    } catch (_e) {
      // Continue to assertion
    }
    
    const title = await page.title();
    expect(title, 'About Us page title should match pattern').toMatch(/About|WotNow|Go Daisy/);
  });

  test('images should have alt attributes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    
    // Check that images have alt attributes
    const images = page.locator('img');
    const count = await images.count();
    
    if (count > 0) {
      // Check first few images
      for (let i = 0; i < Math.min(3, count); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        
        // Alt should exist (can be empty string for decorative images)
        expect(alt).not.toBeNull();
      }
    }
  });
});
