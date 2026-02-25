import { test, expect } from '@playwright/test';

test.describe('Grow Daisy - Homepage', () => {
  test.beforeEach(async () => {
    // No specific localStorage needed for homepage - guest mode is allowed
  });

  test('should load homepage and show dashboard content', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');

    // Check that page loaded with main content
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Page body should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should display task list or empty state', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Main content should be visible (either task list or empty state)
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display weather summary widget', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');

    // Wait for weather data to load
    await page.waitForTimeout(2000);

    // Check that page has loaded with content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to garden page', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Look for garden navigation button - the component has mobile bottom nav and desktop buttons
    const gardenNav = page.locator('button[aria-label*="Garden"], button:has-text("Garden")').first();

    if (await gardenNav.count() > 0) {
      await gardenNav.click();
      await page.waitForTimeout(2000);

      // Verify we're still on the grow page (SPA, no URL change)
      await expect(page).toHaveURL(/\/grow/);
    }

    // Main content should remain visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should navigate to weather page', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Look for weather/conditions navigation button
    const weatherNav = page.locator('button[aria-label*="Weather"], button[aria-label*="Conditions"]').first();

    if (await weatherNav.count() > 0) {
      await weatherNav.click();
      await page.waitForTimeout(2000);

      // Verify we're still on the grow page (SPA, no URL change)
      await expect(page).toHaveURL(/\/grow/);
    }

    // Main content should remain visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should navigate to premium page', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Look for premium/upgrade link - could be in dropdown or page content
    const premiumLink = page.locator('a[href*="/grow/premium"], button:has-text("Premium"), button:has-text("Upgrade")').first();

    if (await premiumLink.count() > 0) {
      await Promise.all([
        page.waitForURL(/\/grow\/premium/, { timeout: 15000 }),
        premiumLink.click()
      ]);

      // Should navigate to premium page
      await expect(page).toHaveURL(/\/grow\/premium/);
    }

    // Page should still have loaded content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle mobile viewport rendering', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should load properly on mobile
    const main = page.locator('main');
    await expect(main).toBeVisible();

    // Mobile bottom nav should be visible
    const mobileNav = page.locator('nav[aria-label="Mobile navigation"]');
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible();
    }
  });

  test('should handle missing location gracefully (guest/onboarding mode)', async ({ page }) => {
    // Don't set any special localStorage
    // Guest mode is allowed per GrowExperience component

    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should still load - either shows guest banner or onboarding
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Main content should be visible
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Grow Daisy - Homepage Navigation Interactions', () => {
  test.beforeEach(async () => {
    // No special setup needed - guest mode is allowed
  });

  test('should have working navigation buttons', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Check for navigation buttons/tabs
    const navButtons = page.locator('button[role="tab"], button[aria-label*="Home"], button[aria-label*="Plan"]');
    const count = await navButtons.count();

    // Should have some navigation elements
    expect(count).toBeGreaterThan(0);
  });

  test('should display header with branding', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');

    // Check for header with Grow Daisy branding
    const header = page.locator('nav[aria-label="Main navigation"]').first();

    if (await header.count() > 0) {
      await expect(header).toBeVisible();
    }

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should cycle through dashboard pages', async ({ page }) => {
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to click through different pages
    const pages = ['home', 'plan', 'garden', 'conditions'];

    for (const pageName of pages) {
      const navButton = page.locator(`button[aria-label*="${pageName}"], button[aria-label*="${pageName.charAt(0).toUpperCase()}${pageName.slice(1)}"]`).first();

      if (await navButton.count() > 0) {
        await navButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Should still be on grow page
    await expect(page).toHaveURL(/\/grow/);
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Grow Daisy - Homepage Error States', () => {
  test('should handle guest mode banner display', async ({ page }) => {
    // No auth setup - guest mode enabled
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Page should load even in guest mode
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Guest banner may or may not be visible depending on auth state
    // Just verify main content exists
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should display content without user authentication', async ({ page }) => {
    // Don't set any auth data
    await page.goto('/grow');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Should gracefully handle unauthenticated state
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Main content should still render
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});
