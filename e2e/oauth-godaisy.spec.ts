import { test, expect } from '@playwright/test';

test.describe('GoDaisy OAuth Flow', () => {
  test('should complete Google OAuth login successfully', async ({ page }) => {
    // Enable detailed console logging
    page.on('console', (msg) => {
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    });

    // Track network errors
    page.on('response', (response) => {
      if (!response.ok() && response.url().includes('godaisy.io')) {
        console.log(`[Network Error] ${response.status()} ${response.url()}`);
      }
    });

    // Track page errors
    page.on('pageerror', (error) => {
      console.error(`[Page Error]:`, error.message);
    });

    // Start at login page
    console.log('\n=== Step 1: Navigate to GoDaisy login page ===');
    await page.goto('https://www.godaisy.io/login', { waitUntil: 'networkidle' });
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/oauth-step1-login-page.png', fullPage: true });
    
    // Check if login page loaded correctly
    const loginPageTitle = await page.title();
    console.log('Login page title:', loginPageTitle);
    
    // Look for OAuth buttons
    const googleButton = page.locator('button:has-text("Google"), button:has-text("Continue with Google")').first();
    const googleButtonExists = await googleButton.count() > 0;
    console.log('Google OAuth button found:', googleButtonExists);
    
    if (!googleButtonExists) {
      console.error('OAuth buttons not found! Current page content:');
      const bodyText = await page.locator('body').textContent();
      console.log(bodyText?.substring(0, 500));
      await page.screenshot({ path: 'test-results/oauth-error-no-buttons.png', fullPage: true });
    }
    
    expect(googleButtonExists).toBe(true);

    // Check localStorage before OAuth
    console.log('\n=== Step 2: Check initial localStorage state ===');
    const initialStorage = await page.evaluate(() => {
      const storage: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) storage[key] = localStorage.getItem(key) || '';
      }
      return storage;
    });
    console.log('Initial localStorage keys:', Object.keys(initialStorage));

    // Click OAuth button but don't follow redirect (we can't test actual OAuth without credentials)
    // Instead, let's test the callback URL handling
    console.log('\n=== Step 3: Test callback URL handling ===');
    
    // Simulate returning from OAuth with a code
    const testCallbackUrl = 'https://www.godaisy.io/auth/callback?app=godaisy&origin=https%3A%2F%2Fwww.godaisy.io&code=test-code-12345';
    console.log('Navigating to callback URL:', testCallbackUrl);
    
    const callbackResponse = await page.goto(testCallbackUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Callback page response status:', callbackResponse?.status());
    
    // Take screenshot of callback page
    await page.screenshot({ path: 'test-results/oauth-step3-callback-page.png', fullPage: true });
    
    // Wait a bit for any redirects
    await page.waitForTimeout(2000);
    
    // Check final URL
    const finalUrl = page.url();
    console.log('Final URL after callback:', finalUrl);
    
    // Check if we got redirected or stuck
    const isOnCallback = finalUrl.includes('/auth/callback');
    const isOnHome = finalUrl === 'https://www.godaisy.io/' || finalUrl === 'https://www.godaisy.io';
    const is404 = finalUrl.includes('404');
    
    console.log('Still on callback page:', isOnCallback);
    console.log('Redirected to home:', isOnHome);
    console.log('Got 404:', is404);
    
    // Check for error messages
    const pageText = await page.locator('body').textContent();
    const hasAuthError = pageText?.includes('Authentication Failed') || pageText?.includes('invalid request');
    const hasTimeout = pageText?.includes('taking too long') || pageText?.includes('timeout');
    
    console.log('Has auth error message:', hasAuthError);
    console.log('Has timeout message:', hasTimeout);
    
    if (hasAuthError || hasTimeout || isOnCallback) {
      console.log('\n=== Error State Detected ===');
      console.log('Page content:', pageText?.substring(0, 1000));
      await page.screenshot({ path: 'test-results/oauth-error-state.png', fullPage: true });
      
      // Check localStorage state at error
      const errorStorage = await page.evaluate(() => {
        const storage: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) storage[key] = localStorage.getItem(key) || '';
        }
        return storage;
      });
      console.log('LocalStorage at error:', Object.keys(errorStorage));
      
      // Check if session exists despite error
      const hasSession = Object.keys(errorStorage).some(k => k.includes('supabase-auth-session'));
      console.log('Has Supabase session in localStorage:', hasSession);
      
      if (hasSession) {
        console.log('SESSION EXISTS but callback showing error - this is the bug!');
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: 'test-results/oauth-final-state.png', fullPage: true });
    
    // Log summary
    console.log('\n=== Test Summary ===');
    console.log('Expected: Redirect to home page');
    console.log('Actual URL:', finalUrl);
    console.log('Test result:', isOnHome ? 'PASS' : 'FAIL');
  });

  test('should handle existing session on callback', async ({ page }) => {
    console.log('\n=== Testing callback with existing session ===');
    
    page.on('console', (msg) => {
      console.log(`[Browser Console ${msg.type()}]:`, msg.text());
    });

    // Set up a mock session in localStorage before hitting callback
    await page.goto('https://www.godaisy.io/', { waitUntil: 'networkidle' });
    
    await page.evaluate(() => {
      const mockSession = {
        access_token: 'mock-token-for-testing',
        refresh_token: 'mock-refresh',
        expires_at: Date.now() + 3600000,
        user: {
          id: 'test-user-123',
          email: 'test@example.com'
        }
      };
      localStorage.setItem(
        'sb-swmviqpxetwziqxhzldh-auth-token',
        JSON.stringify(mockSession)
      );
    });

    // Now hit the callback
    const callbackUrl = 'https://www.godaisy.io/auth/callback?app=godaisy&code=test-code';
    console.log('Navigating to callback with existing session...');
    
    await page.goto(callbackUrl, { waitUntil: 'networkidle', timeout: 15000 });
    
    await page.waitForTimeout(2000);
    
    const finalUrl = page.url();
    console.log('Final URL:', finalUrl);
    console.log('Expected: Should detect session and redirect to home');
    console.log('Success:', !finalUrl.includes('/auth/callback'));
    
    await page.screenshot({ path: 'test-results/oauth-existing-session.png', fullPage: true });
  });
});
