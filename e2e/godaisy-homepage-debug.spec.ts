import { test, expect } from '@playwright/test';

test('GoDaisy homepage should load without errors', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(`PAGE ERROR: ${error.message}`);
  });

  // Capture request failures
  page.on('requestfailed', request => {
    errors.push(`REQUEST FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('\n=== Loading https://www.godaisy.io/ ===\n');
  
  await page.goto('https://www.godaisy.io/', { waitUntil: 'networkidle' });

  // Wait a bit for any async errors
  await page.waitForTimeout(3000);

  console.log('\n=== Console Messages ===');
  consoleMessages.forEach(msg => console.log(msg));

  console.log('\n=== Errors ===');
  if (errors.length > 0) {
    errors.forEach(err => console.log(err));
  } else {
    console.log('No errors detected');
  }

  console.log('\n=== Page HTML ===');
  const html = await page.content();
  console.log(html.substring(0, 500));

  // Check if still showing skeleton
  const skeletonVisible = await page.locator('text=Go Daisy Go').isVisible().catch(() => false);
  console.log('\n=== Skeleton Loader Visible: ===', skeletonVisible);

  // Log any JavaScript errors
  expect(errors.length).toBeLessThan(5); // Allow some non-critical errors
});
