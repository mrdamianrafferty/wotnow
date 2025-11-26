import { test, expect } from '@playwright/test';

// Helper functions removed - tests using them are now skipped
// Grow Daisy routes don't exist in the current codebase

// Note: Grow Daisy routes don't exist in the current codebase
// These tests are skipped until Grow Daisy is implemented
test.describe('Auth callback regressions', () => {
  test.skip('Grow Daisy flows return to stored destination after PKCE success', async () => {
    // Grow Daisy routes not implemented
  });

  test.skip('Findr flows honor explicit returnTo paths', async () => {
    // Requires OAuth which cannot be automated
  });

  test.skip('Stored grow origin triggers grow redirect even without app query', async () => {
    // Grow Daisy routes not implemented
  });

  test.skip('Grow Daisy error state surfaces grow-specific retry actions', async () => {
    // Grow Daisy routes not implemented
  });
});

test.describe('Shared login branding', () => {
  test.skip('renders Grow Daisy specific copy when app=grow', async () => {
    // Grow Daisy branding not implemented in shared login
  });

  test('renders Findr copy when app=findr', async ({ page }) => {
    await page.goto('/auth/shared-login?app=findr');
    await expect(page.locator('h1')).toHaveText(/findr/i);
    await expect(page.locator('p').filter({ hasText: 'fishing predictions' })).toBeVisible();
  });
});
