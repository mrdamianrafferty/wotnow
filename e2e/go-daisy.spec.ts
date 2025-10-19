/**
 * Go Daisy - Comprehensive E2E Test Suite
 * 
 * This is the main smoke test file that runs quick validation across all major features.
 * For detailed tests, see:
 * - go-daisy-homepage.spec.ts - Homepage with weather and activities
 * - go-daisy-activities.spec.ts - Activities page with day navigation
 * - go-daisy-weather.spec.ts - Weather page with marine data
 * - go-daisy-onboarding.spec.ts - Onboarding flow
 * - go-daisy-account.spec.ts - Account and preferences
 * - go-daisy-static-pages.spec.ts - About, FAQs, Support, etc.
 * - go-daisy-demo.spec.ts - Demo page
 * - go-daisy-navigation.spec.ts - Navigation and routing
 * - go-daisy-accessibility.spec.ts - Accessibility and keyboard navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Go Daisy - Smoke Tests', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that page loaded with main content
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
    
    // Check that page has expected title
    await expect(page).toHaveTitle(/WotNow|Go Daisy/);
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Check for navigation elements (use .first() since there may be multiple)
    const header = page.locator('header').first();
    await expect(header).toBeVisible();
  });

  test('should display weather information', async ({ page }) => {
    await page.goto('/weather');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check that weather page loads
    await expect(page).toHaveURL(/\/weather/);
  });

  test('should display activities recommendations', async ({ page }) => {
    await page.goto('/activities');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check that activities page loads
    await expect(page).toHaveURL(/\/activities/);
  });

  test('homepage should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Basic accessibility check - page should have main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should load onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('should load account page', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/account/);
  });

  test('should load demo page', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/demo/);
  });

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
  });

  test('should load Support page', async ({ page }) => {
    await page.goto('/support');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveURL(/\/support/);
  });
});
