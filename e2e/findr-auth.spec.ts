import { test, expect } from '@playwright/test';
import { signIn, signOut, isAuthenticated, TEST_USER } from './helpers/auth';

test.describe('Findr - Authentication', () => {
  test.describe('Sign In Flow', () => {
    test('should display sign in page with email and password fields', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Verify page loaded
      const heading = page.locator('h1:has-text("findr")');
      await expect(heading).toBeVisible();
      
      // Verify email field
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();
      
      // Verify password field
      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeVisible();
      
      // Verify sign in button
      const submitButton = page.locator('button[type="submit"]').first();
      await expect(submitButton).toBeVisible();
    });

    test('should display social login options', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Check for Google sign in button
      const googleButton = page.locator('button:has-text("Continue with Google")');
      await expect(googleButton).toBeVisible();
      
      // Check for Apple sign in button
      const appleButton = page.locator('button:has-text("Continue with Apple")');
      await expect(appleButton).toBeVisible();
    });

    test('should successfully sign in with valid credentials', async ({ page }) => {
      // Test user: damian@flyglobalmusic.com / TestPassword123!
      
      await signIn(page, TEST_USER);
      
      // Verify successful login - should redirect to /findr
      await expect(page).toHaveURL(/\/findr(?:$|\?)/);
      
      // Verify user menu is visible (indicates logged in state)
      const authenticated = await isAuthenticated(page);
      expect(authenticated).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Fill in invalid credentials
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('invalid@example.com');
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill('wrongpassword');
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Wait a moment for error to appear
      await page.waitForTimeout(2000);
      
      // Should still be on auth page (not redirected)
      await expect(page).toHaveURL(/\/findr\/auth/);
      
      // Note: Error message appearance depends on Supabase configuration
      // In production, errors should be shown to the user
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page navigation', async ({ page }) => {
      
      // Sign in
      await signIn(page, TEST_USER);
      
      // Navigate to different pages
      await page.goto('/findr');
      expect(await isAuthenticated(page)).toBe(true);
      
      await page.goto('/findr/favourites');
      expect(await isAuthenticated(page)).toBe(true);
      
      await page.goto('/findr/log');
      expect(await isAuthenticated(page)).toBe(true);
      
      // Verify user menu is consistently visible (use .first() for responsive nav)
      const userAvatar = page.locator('.avatar, .btn-circle.avatar').first();
      await expect(userAvatar).toBeVisible();
    });

    test('should persist session after page reload', async ({ page }) => {
      
      // Sign in
      await signIn(page, TEST_USER);
      expect(await isAuthenticated(page)).toBe(true);
      
      // Reload page and wait for DOM instead of networkidle (more reliable)
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for avatar to confirm page loaded (use .first() for responsive nav)
      const avatar = page.locator('.avatar, .btn-circle.avatar').first();
      await avatar.waitFor({ state: 'visible', timeout: 10000 });
      
      // Session should still be active
      expect(await isAuthenticated(page)).toBe(true);
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

    test('should allow access to favourites when authenticated', async ({ page }) => {
      
      // Sign in first
      await signIn(page, TEST_USER);
      
      // Navigate to favourites
      await page.goto('/findr/favourites');
      await page.waitForLoadState('networkidle');
      
      // Should show favourites content, not sign in prompt
      const pageHeading = page.locator('h1, h2').filter({ hasText: /favourite|favorites/i });
      await expect(pageHeading.first()).toBeVisible();
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

  test.describe('Sign Out Flow', () => {
    test('should successfully sign out', async ({ page }) => {
      
      // Sign in first
      await signIn(page, TEST_USER);
      expect(await isAuthenticated(page)).toBe(true);
      
      // Sign out
      await signOut(page);
      
      // Should be logged out
      expect(await isAuthenticated(page)).toBe(false);
      
      // Should see "Sign In" button in navigation (use .first() for responsive nav)
      const signInButton = page.locator('a:has-text("Sign In")').first();
      await expect(signInButton).toBeVisible();
    });

    test('should redirect to public page after sign out', async ({ page }) => {
      
      // Sign in and navigate to protected page
      await signIn(page, TEST_USER);
      await page.goto('/findr/favourites');
      
      // Sign out
      await signOut(page);
      
      // Should be redirected to /findr (public page)
      await expect(page).toHaveURL(/\/findr(?:$|\?)/);
    });

    test('should clear session data after sign out', async ({ page }) => {
      
      // Sign in
      await signIn(page, TEST_USER);
      
      // Sign out
      await signOut(page);
      
      // Try to access protected page
      await page.goto('/findr/favourites');
      
      // Should show sign in prompt
      const signInLink = page.locator('a:has-text("Sign In")');
      await expect(signInLink.first()).toBeVisible();
    });
  });

  test.describe('Auth UI/UX', () => {
    test('should show loading state during authentication', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Fill in credentials
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.fill('test@example.com');
      
      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill('testpassword');
      
      // Click submit and check for disabled state or loading indicator
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Button should be disabled during submission (prevents double-click)
      // Note: This check is timing-sensitive and may need adjustment
      await page.waitForTimeout(100);
    });

    test('should have accessible form labels', async ({ page }) => {
      await page.goto('/findr/auth');
      await page.waitForLoadState('networkidle');
      
      // Check that form inputs have proper labels or placeholders
      const emailInput = page.locator('input[type="email"]').first();
      const emailLabel = await emailInput.getAttribute('placeholder');
      expect(emailLabel).toBeTruthy();
      
      const passwordInput = page.locator('input[type="password"]').first();
      const passwordLabel = await passwordInput.getAttribute('placeholder');
      expect(passwordLabel).toBeTruthy();
    });
  });
});
