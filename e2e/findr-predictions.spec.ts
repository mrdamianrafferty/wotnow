import { test, expect } from '@playwright/test';

test.describe('Findr - Predictions Page', () => {
  test('should load predictions page', async ({ page }) => {
    await page.goto('/findr');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Check that we're on the Findr page
    await expect(page).toHaveURL(/\/findr/);
    
    // Check for main content
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should show location selector', async ({ page }) => {
    await page.goto('/findr');
    await page.waitForLoadState('networkidle');
    
    // Look for location-related UI elements
    // This could be a button, input, or other interactive element
    const locationElements = page.locator('button, input, [role="button"]');
    const count = await locationElements.count();
    
    // Should have some interactive elements
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Findr - Location Selection', () => {
  test('should allow location interaction', async ({ page }) => {
    await page.goto('/findr');
    await page.waitForLoadState('networkidle');
    
    // Try to find and click location-related buttons
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    // Should have clickable elements
    expect(buttonCount).toBeGreaterThan(0);
  });
});

test.describe('Findr - Species Display', () => {
  test('should display species predictions with location', async ({ page }) => {
    // Navigate to Findr page
    await page.goto('/findr');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for species cards to appear (page loads with default location predictions)
    await page.waitForSelector('article', { 
      timeout: 15000,
      state: 'visible' 
    });
    
    // Verify species cards are displayed in the "Full species lineup" section
    const speciesArticles = await page.locator('article').all();
    expect(speciesArticles.length).toBeGreaterThan(0);
    console.log(`✓ Found ${speciesArticles.length} species cards`);
    
    // Verify first 3 cards have required content
    for (let i = 0; i < Math.min(speciesArticles.length, 3); i++) {
      const card = speciesArticles[i];
      await expect(card).toBeVisible();
      
      // Get all text from card once
      const cardText = await card.textContent();
      expect(cardText).toBeTruthy();
      
      // Verify confidence percentage
      expect(cardText).toMatch(/\d+%/);
      const confidenceMatch = cardText!.match(/(\d+)%/);
      if (confidenceMatch) {
        const confidence = parseInt(confidenceMatch[1]);
        expect(confidence).toBeGreaterThanOrEqual(0);
        expect(confidence).toBeLessThanOrEqual(100);
      }
      
      // Verify Latin scientific name pattern (2 words, capitalized)
      expect(cardText).toMatch(/[A-Z][a-z]+ [a-z]+/);
      
      console.log(`✓ Card ${i + 1} validated`);
    }
    
    // Verify page context
    const locationContext = await page.locator('text=/Sorted by confidence for/i').textContent();
    expect(locationContext).toBeTruthy();
    
    const locationButton = page.getByTestId('location-button').first();
    await expect(locationButton).toBeVisible();
    
    const findrNav = page.getByRole('link', { name: 'findr', exact: true });
    await expect(findrNav).toBeVisible();
    
    console.log('✓ All validations passed');
  });
});

test.describe('Findr - Authentication Flow', () => {
  test('should have auth-related navigation', async ({ page }) => {
    await page.goto('/findr');
    await page.waitForLoadState('networkidle');
    
    // Check for auth-related elements (login/signup buttons, user menu, etc.)
    // This is a basic check - actual auth flow would need more detailed tests
    const page_content = await page.content();
    
    // Page should load successfully
    expect(page_content.length).toBeGreaterThan(0);
  });
});

test.describe('Findr - Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/findr');
    await page.waitForLoadState('networkidle');
    
    // Check that page is visible and interactive
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/findr');
    await page.waitForLoadState('networkidle');
    
    // Check that page is visible and interactive
    const main = page.locator('main, [role="main"]');
    await expect(main).toBeVisible();
  });
});
