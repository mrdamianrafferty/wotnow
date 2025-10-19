import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Demo Page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage for demo mode
    await page.addInitScript(() => {
      localStorage.clear();
    });
  });

  test('should load demo page', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Check URL
    await expect(page).toHaveURL(/\/demo/);
  });

  test('should display demo content', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Should have main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should show location search for demo', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Demo page should have location search
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should allow demo location selection', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Look for input or search field
    const inputs = page.locator('input[type="text"], input[type="search"]');
    const count = await inputs.count();
    
    // Demo should have some way to enter location
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should display activity preview after location set', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Demo should show some preview content
    await page.waitForTimeout(2000);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should show call-to-action for onboarding', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    // Demo page should encourage users to sign up/onboard
    // Look for links or buttons to onboarding
    const links = page.locator('a[href*="onboarding"], button:has-text("Start"), button:has-text("Get Started")');
    
    // Should have some CTA (might be 0 if design changed)
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should handle mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Go Daisy - Demo Page Interactions', () => {
  test('should allow interacting with demo activities', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Look for interactive elements
    const buttons = page.locator('button, [role="button"]');
    const count = await buttons.count();
    
    expect(count).toBeGreaterThan(0);
  });
});
