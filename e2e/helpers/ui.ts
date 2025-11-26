import type { Locator, Page } from '@playwright/test';

/**
 * Dismisses the CookieScript consent dialog if it appears.
 * Safe to call even when the banner is absent.
 */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', { name: /cookie consent/i });
  const dialogCount = await dialog.count();
  if (dialogCount === 0) {
    return;
  }

  const attemptClick = async (locator: Locator) => {
    if (await locator.count()) {
      try {
        await locator.first().click({ timeout: 2000 });
        await dialog.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => undefined);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const acceptButton = dialog.getByRole('button', { name: /accept all/i });
  if (await attemptClick(acceptButton)) {
    return;
  }

  const declineButton = dialog.getByRole('button', { name: /decline all/i });
  if (await attemptClick(declineButton)) {
    return;
  }

  const closeButton = dialog.getByRole('button', { name: /close/i });
  await attemptClick(closeButton);

  // Some variants only show a generic "Cookie settings" bubble without explicit accept buttons
  const settingsButton = dialog.getByRole('button', { name: /cookie settings/i });
  if (await attemptClick(settingsButton)) {
    return;
  }

  const genericButton = dialog.locator('button, [role="button"]');
  if (await attemptClick(genericButton)) {
    return;
  }

  // Last resort: dismiss by clicking the dialog itself if it's clickable
  try {
    await dialog.first().click({ timeout: 1000 });
    await dialog.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => undefined);
    return;
  } catch {
    // ignore
  }

  // If everything else failed, forcibly hide the overlay so it doesn't block clicks
  try {
    await page.evaluate(() => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
      for (const el of dialogs) {
        const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.toLowerCase();
        if (label.includes('cookie')) {
          el.style.display = 'none';
        }
      }
    });
  } catch {
    // ignore - nothing else we can do
  }
}
