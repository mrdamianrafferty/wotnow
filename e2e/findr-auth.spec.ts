import { test, expect } from '@playwright/test';
import { isAuthenticated } from './helpers/auth';

test.describe('Findr - Authentication', () => {
  test.describe('Sign In Flow', () => {
    test('should display OAuth sign in page', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify page loaded with findr branding
      const heading = page.locator('h1:has-text("findr")');
      await expect(heading).toBeVisible();
      
      // Findr auth page is OAuth-only (no email/password form)
      // Verify Google sign in button
      const googleButton = page.locator('button:has-text("Continue with Google")');
      await expect(googleButton).toBeVisible();
      
      // Verify Apple sign in button
      const appleButton = page.locator('button:has-text("Continue with Apple")');
      await expect(appleButton).toBeVisible();
    });

    test('should show passwordless info text', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify passwordless messaging
      const infoText = page.locator('text=Passwordless');
      await expect(infoText).toBeVisible();
    });

    test('should have back to findr link', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify back link exists
      const backLink = page.locator('a:has-text("Back to findr")');
      await expect(backLink).toBeVisible();
    });
  });

  // Note: Session persistence tests require OAuth sign-in which cannot be automated in E2E
  // These tests are skipped - manual testing recommended for OAuth flows
  test.describe('Session Persistence', () => {
    test.skip('should maintain session across page navigation', async () => {
      // OAuth-only: cannot automate sign-in flow
    });

    test.skip('should persist session after page reload', async () => {
      // OAuth-only: cannot automate sign-in flow
    });
  });

  test.describe('Protected Routes', () => {
    test('should show sign in prompt on favourites page when not authenticated', async ({ page }) => {
      await page.goto('/findr/favourites');
      await page.waitForLoadState('networkidle');
      
      // Should show sign in prompt or redirect to auth
      const signInLink = page.locator('a:has-text("Sign In")');
      const signInButton = page.locator('button:has-text("Sign In")');
      
      const hasSignInPrompt = 
        await signInLink.first().isVisible({ timeout: 2000 }).catch(() => false) ||
        await signInButton.first().isVisible({ timeout: 2000 }).catch(() => false);
      
      expect(hasSignInPrompt).toBe(true);
    });

    test.skip('should allow access to favourites when authenticated', async () => {
      // OAuth-only: cannot automate sign-in flow
    });

    test('should allow unauthenticated access to public pages', async ({ page }) => {
      // Verify public pages are accessible without auth
      const publicPages = ['/findr', '/findr/log'];
      
      for (const url of publicPages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Page should load successfully
        const main = page.locator('main, [role="main"]');
        await expect(main).toBeVisible();
      }
    });
  });

  // Note: Sign out tests require OAuth sign-in which cannot be automated in E2E
  test.describe('Sign Out Flow', () => {
    test.skip('should successfully sign out', async () => {
      // OAuth-only: cannot automate sign-in flow
    });

    test.skip('should redirect to public page after sign out', async () => {
      // OAuth-only: cannot automate sign-in flow
    });

    test.skip('should clear session data after sign out', async () => {
      // OAuth-only: cannot automate sign-in flow
    });
  });

  test.describe('Auth UI/UX', () => {
    test('should have accessible OAuth buttons', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify OAuth buttons are accessible
      const googleButton = page.locator('button:has-text("Continue with Google")');
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
      
      const appleButton = page.locator('button:has-text("Continue with Apple")');
      await expect(appleButton).toBeVisible();
      await expect(appleButton).toBeEnabled();
    });

    test('should display findr branding', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify findr logo/icon is present
      const fishIcon = page.locator('.lucide-fish, svg');
      await expect(fishIcon.first()).toBeVisible();
      
      // Verify findr heading
      const heading = page.locator('h1:has-text("findr")');
      await expect(heading).toBeVisible();
    });
  });
});
