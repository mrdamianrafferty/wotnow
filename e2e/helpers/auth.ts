import { Page } from '@playwright/test';

/**
 * Authentication helpers for E2E tests
 */

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Test user for E2E authentication tests
 * Note: Create this user by signing up at /findr/auth first
 */
export const TEST_USER: TestUser = {
  email: 'damian@flyglobalmusic.com',
  password: 'Phenian9',
  displayName: 'E2E Test User',
};

/**
 * Sign in a user via the Findr auth page
 */
export async function signIn(page: Page, user: TestUser = TEST_USER) {
  // Navigate to auth page
  await page.goto('/findr/auth');
  await page.waitForLoadState('domcontentloaded');

  // Fill in email
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ state: 'visible' });
  await emailInput.fill(user.email);

  // Fill in password
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ state: 'visible' });
  await passwordInput.fill(user.password);

  // Click sign in button (wait for it to be enabled)
  const signInButton = page.locator('button[type="submit"]').first();
  await signInButton.waitFor({ state: 'visible' });
  await signInButton.click();

  // Wait for successful navigation to /findr
  await page.waitForURL(/\/findr(?:$|\?)/, { timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Sign out the current user
 */
export async function signOut(page: Page) {
  // Look for the avatar button (user menu trigger)
  const avatarButton = page.locator('.btn-circle.avatar, .avatar').first();
  
  // Wait for avatar to be visible (indicates user is logged in)
  await avatarButton.waitFor({ state: 'visible', timeout: 5000 });
  
  // Click to open dropdown
  await avatarButton.click();
  await page.waitForTimeout(300); // Wait for dropdown animation
  
  // Click sign out button in dropdown menu (use .first() for responsive nav)
  const signOutButton = page.locator('button:has-text("Sign Out")').first();
  await signOutButton.waitFor({ state: 'visible', timeout: 2000 });
  await signOutButton.click();
  
  // Wait for redirect to /findr
  await page.waitForURL(/\/findr(?:$|\?)/, { timeout: 5000 });
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for auth state to clear (avatar disappears, sign in button appears)
  await page.waitForSelector('a:has-text("Sign In")', { state: 'visible', timeout: 5000 });
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for user menu avatar (indicates logged in state) - use .first() for responsive nav
  const userAvatar = page.locator('.avatar, .btn-circle.avatar').first();
  
  try {
    await userAvatar.waitFor({ state: 'visible', timeout: 2000 });
    return true;
  } catch {
    // Check for "Sign In" button (indicates logged out state)
    const signInButton = page.locator('a:has-text("Sign In")').first();
    const isSignInVisible = await signInButton.isVisible({ timeout: 1000 }).catch(() => false);
    return !isSignInVisible;
  }
}

/**
 * Setup authentication state by directly setting cookies/localStorage
 * This is faster than going through the login flow for each test
 */
export async function setupAuthState(page: Page, user: TestUser = TEST_USER) {
  // Navigate to the app first to set the domain
  await page.goto('/findr');
  
  // TODO: Set up auth tokens in localStorage or cookies
  // This requires knowing the Supabase session format
  // For now, use the signIn flow
  await signIn(page, user);
}
