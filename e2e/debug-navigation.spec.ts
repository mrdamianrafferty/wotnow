import { test, expect } from '@playwright/test';

test.describe('Debug Navigation Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const testProfile = {
        homeLocation: 'Dublin, Ireland',
        homeSpot: { name: 'Dublin', lat: 53.3498, lon: -6.2603 },
        marineLocation: '',
        coastalSpot: null,
        selectedActivities: ['hiking', 'cycling', 'surfing']
      };
      localStorage.setItem('profile.v1', JSON.stringify(testProfile));
    });
  });

  test('should inspect all navigation elements on homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    console.log('\n=== INSPECTING HOMEPAGE NAVIGATION ===\n');
    
    // Check for all links to /activities
    const activitiesLinks = page.locator('a[href="/activities"]');
    const activitiesCount = await activitiesLinks.count();
    console.log(`\nFound ${activitiesCount} links to /activities`);
    
    for (let i = 0; i < activitiesCount; i++) {
      const link = activitiesLinks.nth(i);
      const isVisible = await link.isVisible();
      const text = await link.textContent();
      console.log(`  [${i}] Visible: ${isVisible}, Text: "${text}"`);
    }
    
    // Check for all links to /weather
    const weatherLinks = page.locator('a[href="/weather"]');
    const weatherCount = await weatherLinks.count();
    console.log(`\nFound ${weatherCount} links to /weather`);
    
    for (let i = 0; i < weatherCount; i++) {
      const link = weatherLinks.nth(i);
      const isVisible = await link.isVisible();
      const text = await link.textContent();
      console.log(`  [${i}] Visible: ${isVisible}, Text: "${text}"`);
    }
    
    // Check for all links to /account or /interests
    const accountLinks = page.locator('a[href="/account"], a[href="/interests"]');
    const accountCount = await accountLinks.count();
    console.log(`\nFound ${accountCount} links to /account or /interests`);
    
    for (let i = 0; i < accountCount; i++) {
      const link = accountLinks.nth(i);
      const isVisible = await link.isVisible();
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      console.log(`  [${i}] Visible: ${isVisible}, Href: ${href}, Text: "${text}"`);
    }
    
    // Check hamburger menu
    const hamburger = page.locator('[aria-label="Open menu"]');
    const hamburgerCount = await hamburger.count();
    console.log(`\nFound ${hamburgerCount} hamburger menus`);
    
    if (hamburgerCount > 0) {
      const isVisible = await hamburger.first().isVisible();
      console.log(`  Hamburger visible: ${isVisible}`);
      
      if (isVisible) {
        console.log('\n  Opening hamburger menu...');
        await hamburger.first().click();
        await page.waitForTimeout(500);
        
        // Check dropdown menu links
        const dropdownActivities = page.locator('.dropdown-content a[href="/activities"]');
        const dropdownWeather = page.locator('.dropdown-content a[href="/weather"]');
        const dropdownAccount = page.locator('.dropdown-content a[href="/account"], .dropdown-content a[href="/interests"]');
        
        console.log(`\n  In dropdown:`);
        console.log(`    Activities links: ${await dropdownActivities.count()}, visible: ${await dropdownActivities.first().isVisible().catch(() => false)}`);
        console.log(`    Weather links: ${await dropdownWeather.count()}, visible: ${await dropdownWeather.first().isVisible().catch(() => false)}`);
        console.log(`    Account/Interests links: ${await dropdownAccount.count()}, visible: ${await dropdownAccount.first().isVisible().catch(() => false)}`);
      }
    }
    
    console.log('\n=== END INSPECTION ===\n');
    
    // Test passes if we got this far
    expect(true).toBe(true);
  });
  
  test('should inspect header and footer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    console.log('\n=== INSPECTING HEADER & FOOTER ===\n');
    
    // Check for header
    const headers = page.locator('header');
    const headerCount = await headers.count();
    console.log(`Found ${headerCount} <header> elements`);
    
    for (let i = 0; i < headerCount; i++) {
      const header = headers.nth(i);
      const isVisible = await header.isVisible();
      console.log(`  [${i}] Visible: ${isVisible}`);
    }
    
    // Check for footer
    const footers = page.locator('footer');
    const footerCount = await footers.count();
    console.log(`\nFound ${footerCount} <footer> elements`);
    
    for (let i = 0; i < footerCount; i++) {
      const footer = footers.nth(i);
      const isVisible = await footer.isVisible();
      console.log(`  [${i}] Visible: ${isVisible}`);
    }
    
    // Check footer links
    const supportLink = page.locator('footer a[href="/support"]');
    const aboutLink = page.locator('footer a[href="/AboutUs"]');
    const faqLink = page.locator('footer a[href="/FAQs"]');
    
    console.log(`\nFooter navigation links:`);
    console.log(`  Support: count=${await supportLink.count()}, visible=${await supportLink.first().isVisible().catch(() => false)}`);
    console.log(`  About Us: count=${await aboutLink.count()}, visible=${await aboutLink.first().isVisible().catch(() => false)}`);
    console.log(`  FAQs: count=${await faqLink.count()}, visible=${await faqLink.first().isVisible().catch(() => false)}`);
    
    console.log('\n=== END INSPECTION ===\n');
    
    expect(true).toBe(true);
  });
});
