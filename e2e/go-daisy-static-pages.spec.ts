import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Static/Info Pages', () => {
  test('should load About Us page', async ({ page }) => {
    await page.goto('/AboutUs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/AboutUs/);
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should load FAQs page', async ({ page }) => {
    await page.goto('/FAQs');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/FAQs/);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load How We Do It page', async ({ page }) => {
    await page.goto('/HowWeDoIt');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/HowWeDoIt/);
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should load Support page', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/support/);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load Whether Weather page', async ({ page }) => {
    await page.goto('/whether-weather');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/whether-weather/);
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load Privacy Policy', async ({ page }) => {
    await page.goto('/PrivacyPolicy');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/PrivacyPolicy/);
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should load Terms and Conditions', async ({ page }) => {
    await page.goto('/TermsAndConditions');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/TermsAndConditions/);
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should load Cookie Policy', async ({ page }) => {
    await page.goto('/CookiePolicy');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/CookiePolicy/);
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Go Daisy - Static Pages Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('should load About Us on mobile', async ({ page }) => {
    await page.goto('/AboutUs');
    await page.waitForLoadState('networkidle');
    
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should load FAQs on mobile', async ({ page }) => {
    await page.goto('/FAQs');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should load Support page on mobile', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Go Daisy - FAQ Interactions', () => {
  test('should allow expanding FAQ items', async ({ page }) => {
    await page.goto('/FAQs');
    await page.waitForLoadState('networkidle');
    
    // Look for accordion/collapsible items (DaisyUI uses collapse class)
    const collapseItems = page.locator('.collapse, [role="button"]');
    const count = await collapseItems.count();
    
    if (count > 0) {
      // Try clicking first item
      await collapseItems.first().click();
      await page.waitForTimeout(300);
    }
    
    // Page should still be visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
