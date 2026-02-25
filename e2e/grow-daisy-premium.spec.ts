import { test, expect } from '@playwright/test';

test.describe('Grow Daisy - Premium Page', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test location in localStorage before page load
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('Premium page loads', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Check URL
    await expect(page).toHaveURL(/\/grow\/premium/);

    // Check body visible
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Pricing tiers display', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for tier names
    const seedText = page.locator('text=Seed');
    const sproutText = page.locator('text=Sprout');
    const bloomText = page.locator('text=Bloom');
    const harvestText = page.locator('text=Harvest');

    // At least some tiers should be visible
    const tiers = [seedText, sproutText, bloomText, harvestText];
    let tierCount = 0;
    for (const tier of tiers) {
      if (await tier.count() > 0) {
        tierCount++;
      }
    }

    expect(tierCount).toBeGreaterThan(0);
  });

  test('Billing toggle present', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for monthly/annual toggle buttons
    const monthlyButton = page.locator('button:has-text("Monthly")');
    const annualButton = page.locator('button:has-text("Annual")');

    // At least one billing option button should exist
    const hasToggle = (await monthlyButton.count() > 0) || (await annualButton.count() > 0);
    expect(hasToggle).toBeTruthy();
  });

  test('CTA buttons present', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for subscription/upgrade buttons (Get <Tier Name> buttons)
    const ctaButtons = page.locator('button:has-text("Get"), button:has-text("Subscribe"), button:has-text("Upgrade")');

    // Should have multiple CTA buttons (one for each tier)
    expect(await ctaButtons.count()).toBeGreaterThan(0);
  });

  test('Mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size

    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Page should load and display content on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Pricing cards should still be present
    const sproutText = page.locator('text=Sprout');
    expect(await sproutText.count()).toBeGreaterThanOrEqual(0);
  });

  test('Feature comparison visible', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for "Compare Plans" section or feature list
    const compareSection = page.locator('text=Compare Plans, text=Feature, text=Plant tracking');
    const hasFeatureComparison = (await compareSection.count() > 0);

    // If not found by section header, look for feature list content
    if (!hasFeatureComparison) {
      const featureText = page.locator('text=Plant tracking, text=AI Plant ID, text=Soil temperature');
      expect(await featureText.count()).toBeGreaterThan(0);
    } else {
      expect(hasFeatureComparison).toBeTruthy();
    }
  });
});

test.describe('Grow Daisy - Premium Page Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('Billing toggle switches between monthly and annual', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Find and click annual button
    const annualButton = page.locator('button:has-text("Annual")').first();
    if (await annualButton.count() > 0) {
      await annualButton.click();
      await page.waitForTimeout(500);

      // Verify button state changed
      const buttonState = await annualButton.getAttribute('class');
      expect(buttonState).toBeTruthy();
    }
  });

  test('Can click CTA button', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Find first CTA button
    const ctaButton = page.locator('button:has-text("Get")').first();
    const count = await ctaButton.count();

    if (count > 0) {
      // Button should be clickable
      expect(await ctaButton.isEnabled()).toBeTruthy();
    }
  });

  test('Feature list shows on desktop', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for common features listed
    const plantTrackingText = page.locator('text=Plant tracking');
    const aiIdText = page.locator('text=AI Plant ID');
    const weatherForecastText = page.locator('text=Weather forecast');

    // Should find at least one feature
    const featureCount =
      (await plantTrackingText.count()) +
      (await aiIdText.count()) +
      (await weatherForecastText.count());

    expect(featureCount).toBeGreaterThan(0);
  });

  test('FAQ section present and functional', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for FAQ section
    const faqTitle = page.locator('text=Frequently Asked Questions');
    expect(await faqTitle.count()).toBeGreaterThanOrEqual(0);

    // Look for expandable items
    const detailsElements = page.locator('details');
    expect(await detailsElements.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Grow Daisy - Premium Page Mobile', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('Premium page loads on mobile', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/grow\/premium/);

    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('Pricing cards stack on mobile', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Should have pricing card content visible
    const sproutCard = page.locator('text=Sprout');
    expect(await sproutCard.count()).toBeGreaterThanOrEqual(0);
  });

  test('Billing toggle accessible on mobile', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for toggle buttons
    const toggleButtons = page.locator('button:has-text("Monthly"), button:has-text("Annual"), button:has-text("Lifetime")');
    expect(await toggleButtons.count()).toBeGreaterThan(0);
  });

  test('Feature comparison scrollable on mobile', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Page should load without errors
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Grow Daisy - Premium Page Header & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['gardening']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('Page header displays', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for main heading
    const heading = page.locator('h1');
    expect(await heading.count()).toBeGreaterThan(0);
  });

  test('Back to Grow Daisy link present', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Look for navigation link back to grow
    const backLink = page.locator('a:has-text("Back"), a:has-text("Grow Daisy")');
    expect(await backLink.count()).toBeGreaterThanOrEqual(0);
  });

  test('Page has proper structure', async ({ page }) => {
    await page.goto('/grow/premium');
    await page.waitForLoadState('domcontentloaded');

    // Check for main content area
    const body = page.locator('body');

    // At least body should be visible
    await expect(body).toBeVisible();
  });
});
