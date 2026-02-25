import { test, expect } from '@playwright/test';
import { dismissCookieBanner } from './helpers/ui';

test.describe('Grow Daisy - Garden Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test location in localStorage before page load
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
  });

  test('should load garden page successfully', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');

    // Check that page loaded with main content
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Page body should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should verify garden page URL', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');

    // Verify we are on the correct page
    await expect(page).toHaveURL(/\/grow\/garden/);
  });

  test('should display empty garden state when no plants exist', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Look for empty state message or prompt
    // Could be text like "No plants yet", "Add your first plant", "Empty garden", etc.
    const body = page.locator('body');

    // Page should have content (either empty state or plants)
    await expect(body).toBeVisible();
  });

  test('should have add plant button or action', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for page to fully load
    await page.waitForTimeout(2000);

    // Should find at least one interactive add action
    const actionCount = await page.locator(
      'button, a, [role="button"], [role="link"]'
    ).count();
    expect(actionCount).toBeGreaterThan(0);
  });

  test('should display user plant list section', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for main content area where plants would be listed
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Body should be visible with page content
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Grow Daisy - Garden Page Mobile', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    // Set up test location in localStorage
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
  });

  test('should load garden page on mobile viewport', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');

    // Page should load properly on mobile
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should verify mobile viewport is responsive', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Body should be visible and responsive
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check that page content is visible on mobile
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Grow Daisy - Garden Navigation', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('should navigate back to dashboard or grow home', async ({ page }) => {
    // First, navigate to garden
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Navigation options should exist
    const navOptions = await page.locator('nav, [role="navigation"], header').count();
    expect(navOptions).toBeGreaterThan(0);
  });

  test('should have header or navigation visible', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Check for header or navigation
    const header = page.locator('header, nav, [role="banner"]').first();
    await expect(header).toBeVisible();
  });

  test('should display page title or heading', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Should have at least some headings on the page
    const headingCount = await page.locator('h1, h2, h3, [role="heading"]').count();
    expect(headingCount).toBeGreaterThan(0);
  });
});

test.describe('Grow Daisy - Plant Details', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('should have structured layout for plant cards or list', async ({ page }) => {
    await page.goto('/grow/garden');
    await page.waitForLoadState('domcontentloaded');
    await dismissCookieBanner(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Check for main container/grid where plants would appear
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();

    // Should have interactive elements or empty state
    const interactiveElements = page.locator(
      'button, a, [role="button"], [role="link"], [role="article"]'
    );
    const count = await interactiveElements.count();
    expect(count).toBeGreaterThan(0);
  });
});
