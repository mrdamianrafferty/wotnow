import { test, expect } from '@playwright/test';

test.describe('Auth Test - damian@flyglobalmusic.com', () => {
  test.skip('should sign in with email/password via simple-auth', async ({ page }) => {
    // Navigate to simple-auth page (supports email/password)
    await page.goto('/findr/simple-auth');
    await page.waitForLoadState('domcontentloaded');
    
    // Take screenshot of auth page
    await page.screenshot({ path: 'test-results/auth-simple-auth-page.png', fullPage: true });
    
    // Fill email
    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible' });
    await emailInput.fill('damian@flyglobalmusic.com');
    
    // Fill password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible' });
    await passwordInput.fill('Phenian9');
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'test-results/auth-before-submit.png', fullPage: true });
    
    // Click Sign In button (the submit button with text "Sign In")
    const signInButton = page.locator('button[type="submit"]');
    await signInButton.click();
    
    // Wait for network to settle and give time for auth response
    await page.waitForTimeout(5000);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    
    // Check for any visible error message on the page
    const alertError = page.locator('.alert-error');
    const alertErrorVisible = await alertError.isVisible().catch(() => false);
    if (alertErrorVisible) {
      const errorText = await alertError.textContent();
      console.log('Alert Error Text:', errorText);
    }
    
    // Look for any text containing "error" or "invalid"
    const bodyText = await page.locator('body').textContent();
    if (bodyText?.toLowerCase().includes('invalid') || bodyText?.toLowerCase().includes('error')) {
      console.log('Page contains error-related text');
      // Extract relevant portion
      const errorMatch = bodyText.match(/(invalid|error)[^.]+/gi);
      console.log('Error matches:', errorMatch?.slice(0, 3));
    }
    
    // Check if we're redirected to findr
    const currentUrl = page.url();
    console.log('Current URL after sign in:', currentUrl);
    
    await page.screenshot({ path: 'test-results/auth-after-signin.png', fullPage: true });
    
    // Verify we're authenticated - check for user menu or redirect to /findr
    const isOnFindr = currentUrl.includes('/findr') && !currentUrl.includes('/findr/simple-auth');
    const userAvatar = page.locator('.avatar, .btn-circle');
    const hasUserMenu = await userAvatar.first().isVisible().catch(() => false);
    
    console.log('Is on Findr (not auth page):', isOnFindr);
    console.log('Has user menu:', hasUserMenu);
    
    // Check if there's a success message
    const successMsg = page.locator('.alert-success, .text-success');
    const hasSuccess = await successMsg.isVisible().catch(() => false);
    console.log('Has success message:', hasSuccess);
    
    expect(isOnFindr || hasUserMenu).toBe(true);
  });
});
