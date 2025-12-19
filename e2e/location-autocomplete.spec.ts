import { test, expect } from '@playwright/test';

test.describe('Location autocomplete / map access', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { localStorage.clear(); });
  });

  test('home header: CoastalLocationDialog shows suggestions or fallback', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Dismiss cookie consent if present
    const cookieClose = page.locator('dialog:has-text("This website uses cookies") button:has-text("Close")');
    if (await cookieClose.count() > 0) {
      await cookieClose.first().click().catch(() => {});
      await page.waitForTimeout(200);
    }

    // Prefer visible test-id; fall back to accessible role-based name matching
    const headerBtnVisible = page.locator('[data-testid="header-home-location-btn"]:visible').first();
    let opened = false;
    if (await headerBtnVisible.count() > 0) {
      await expect(headerBtnVisible).toBeVisible({ timeout: 5000 });
      await headerBtnVisible.click();
      opened = true;
    } else {
      const headerBtnByRole = page.getByRole('button', { name: /🏡|home|Set home/i }).filter({ has: page.locator(':visible') }).first();
      if (await headerBtnByRole.count() > 0) {
        await expect(headerBtnByRole).toBeVisible({ timeout: 5000 });
        await headerBtnByRole.click();
        opened = true;
      }
    }

    if (!opened) throw new Error('Could not find header home location button');

    // Wait for the CoastalLocationDialog specifically (the dialog that contains our input)
    const coastalDialog = page.locator('div[role="dialog"]').filter({ has: page.getByTestId('location-dialog-input') }).first();
    // As a fallback, try any dialog with a textbox
    const anyDialog = page.getByRole('dialog');

    if ((await coastalDialog.count()) > 0) {
      await expect(coastalDialog).toBeVisible({ timeout: 7000 });
      const input = coastalDialog.locator('[data-testid="location-dialog-input"]').first();
      await expect(input).toBeVisible({ timeout: 7000 });
      await input.fill('Portland');
      await input.press('Enter');
    } else if ((await anyDialog.count()) > 0) {
      // Some pages may render a different dialog; try textbox within any dialog
      const textbox = anyDialog.first().getByRole('textbox').first();
      if ((await textbox.count()) > 0) {
        await expect(textbox).toBeVisible({ timeout: 7000 });
        await textbox.fill('Portland');
        await textbox.press('Enter');
      } else {
        // final fallback: try global test-id
        const fallback = page.getByTestId('location-dialog-input').first();
        await expect(fallback).toBeVisible({ timeout: 7000 });
        await fallback.fill('Portland');
        await fallback.press('Enter');
      }
    } else {
      throw new Error('No dialog found after clicking header button');
    }

    // Wait up to 6s for suggestions (Google or fallback) to appear
    const suggestions = page.locator('ul[role="listbox"] li');
    let suggestionAppeared = false;
    try {
      await expect(suggestions.first()).toBeVisible({ timeout: 6000 });
      suggestionAppeared = true;
    } catch {
      suggestionAppeared = false;
    }

    // Check whether Google Maps script loaded (autocomplete could be available)
    const googleLoaded = await page.evaluate(() => Boolean((window as unknown as { google?: { maps?: unknown } }).google?.maps));

    // Fallback UI: ensure dialog exposes alternate actions when suggestions aren't available
    const hasPickFromMap = (await page.getByRole('button', { name: /Pick from map/i }).count()) > 0;
    const hasUseCurrent = (await page.getByRole('button', { name: /Use current location/i }).count()) > 0;
    const hasFallbackAlert = (await page.getByText(/OpenStreetMap|fallback search|Location search unavailable|Loading location search service/i).count()) > 0;

    // Pass if: suggestions appeared, Google loaded, or fallback UI/actions are visible
    expect(suggestionAppeared || googleLoaded || hasPickFromMap || hasUseCurrent || hasFallbackAlert).toBeTruthy();
  });
});
