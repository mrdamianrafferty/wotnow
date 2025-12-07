import { Page } from '@playwright/test';

/**
 * Location helpers for E2E tests
 */

export interface TestLocation {
  name: string;
  lat: number;
  lon: number;
  rectangleCode?: string;
}

/**
 * Common test locations
 */
export const TEST_LOCATIONS = {
  DUBLIN: {
    name: 'Dublin, Ireland',
    lat: 53.3498,
    lon: -6.2603,
    rectangleCode: '36E5',
  },
  LONDON: {
    name: 'London, UK',
    lat: 51.5074,
    lon: -0.1278,
    rectangleCode: '32F2',
  },
  BARCELONA: {
    name: 'Barcelona, Spain',
    lat: 41.3851,
    lon: 2.1734,
    rectangleCode: '38E0',
  },
  LISBON: {
    name: 'Lisbon, Portugal',
    lat: 38.7223,
    lon: -9.1393,
    rectangleCode: '34D9',
  },
} as const;

/**
 * Set a location in the app
 */
export async function setLocation(page: Page, location: TestLocation) {
  // Look for location selector button
  const locationButton = page.locator(
    'button:has-text("Location"), button:has-text("Set Location"), [data-testid="location-button"]'
  );
  
  if (await locationButton.isVisible({ timeout: 5000 })) {
    await locationButton.click();
    await page.waitForTimeout(500);

    // Try to find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="location"], input[placeholder*="Location"]');
    
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill(location.name);
      await page.waitForTimeout(500);

      // Click first result
      const firstResult = page.locator('[role="option"], .location-result, .search-result').first();
      if (await firstResult.isVisible({ timeout: 2000 })) {
        await firstResult.click();
      }
    }
  }
  
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Mock geolocation for the browser
 */
export async function mockGeolocation(page: Page, location: TestLocation) {
  await page.context().grantPermissions(['geolocation']);
  
  await page.context().setGeolocation({
    latitude: location.lat,
    longitude: location.lon,
  });
}

/**
 * Wait for location to be set
 */
export async function waitForLocationSet(page: Page, timeout = 10000) {
  // Wait for location indicator or predictions to load
  await page.waitForFunction(
    () => {
      const body = document.body.textContent || '';
      return body.includes('Rectangle') || 
             body.includes('Predictions') || 
             body.includes('Loading predictions') ||
             document.querySelector('[data-testid="predictions"]') !== null;
    },
    { timeout }
  );
}
