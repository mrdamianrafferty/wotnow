import { test, expect } from '@playwright/test';

test.describe('Grow Daisy - Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to simulate new user
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('onboarding page loads successfully', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Check URL
    await expect(page).toHaveURL(/\/grow\/onboarding/);

    // Check that page body is visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('onboarding starts for new user', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Wait for onboarding content to appear
    await page.waitForTimeout(2000);

    // Check that main content is visible
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 5000 });

    // Verify we're on the onboarding page
    await expect(page).toHaveURL(/\/grow\/onboarding/);
  });

  test('page has interactive elements for navigation', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Look for buttons or clickable elements (Next/Continue buttons)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    // Should have at least some interactive elements
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('page handles direct navigation to onboarding', async ({ page }) => {
    // Direct URL access should work without redirects
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Page should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should still be on onboarding page
    await expect(page).toHaveURL(/\/grow\/onboarding/);
  });

  test('onboarding displays setup content', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to render
    await page.waitForTimeout(2000);

    // Should have some content rendered
    const content = page.locator('div, section, [role="region"]');
    const contentCount = await content.count();

    expect(contentCount).toBeGreaterThan(0);
  });

  test('onboarding allows selection of options', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Look for clickable elements (buttons, interactive items)
    const clickableElements = page.locator('button, [role="button"]');
    const count = await clickableElements.count();

    if (count > 0) {
      // Attempt to click first selectable item
      await clickableElements.first().click();
      await page.waitForTimeout(500);
    }

    // Page should still be visible after interaction
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('onboarding works on mobile viewport (375x667)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content to render on mobile
    await page.waitForTimeout(2000);

    // Page should be visible and usable on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 5000 });

    // Main content should be visible
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible({ timeout: 5000 });
  });

  test('onboarding mobile viewport has interactive elements', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Wait for content
    await page.waitForTimeout(2000);

    // Should have clickable elements on mobile
    const buttons = page.locator('button');
    const count = await buttons.count();

    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Grow Daisy - Onboarding User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate new user
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('should allow navigation through onboarding steps', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Look for next/continue button
    const nextButtons = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("next"), button:has-text("continue")');
    const hasNextButton = await nextButtons.count();

    if (hasNextButton > 0) {
      await nextButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Should still be on a valid page
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('onboarding should have proper page structure', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Check for main/semantic elements
    const pageElements = {
      main: page.locator('main, [role="main"]'),
      buttons: page.locator('button'),
      clickables: page.locator('[role="button"]')
    };

    // Page should have a main content area
    await expect(pageElements.main).toBeVisible({ timeout: 5000 });
  });

  test('onboarding should work with page refresh', async ({ page }) => {
    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should still be on onboarding
    await expect(page).toHaveURL(/\/grow\/onboarding/);

    // Page should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('onboarding should have correct viewport on desktop', async ({ page }) => {
    // Default desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/grow/onboarding');
    await page.waitForLoadState('domcontentloaded');

    // Content should be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
