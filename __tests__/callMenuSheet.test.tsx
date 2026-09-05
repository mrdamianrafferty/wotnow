/**
 * The menu behind the dot.
 *
 * The privacy link here is an **App Store requirement**, not a nicety: Apple
 * asks for a privacy policy reachable from inside the app, and Go Daisy ships
 * as a Capacitor app whose web layer is this. Before this sheet existed, a
 * reviewer opening `/call` would have found a forecast and no route to any of
 * it — no settings, no account, no policy.
 *
 * That makes it exactly the kind of thing to pin in CI rather than to check by
 * looking: it can be deleted in a refactor by someone who does not know it is
 * load-bearing, and nothing about the app would look broken afterwards. The
 * rejection would arrive weeks later from Apple.
 */

import { render, screen } from '@testing-library/react';
import { MenuSheet } from '@/components/call/MenuSheet';

/** The routes the sheet is allowed to offer, all verified to resolve. */
const CANONICAL = ['/start', '/account', '/privacy', '/terms', '/cookies', '/whether-weather', '/support', '/app'];

describe('the menu behind the dot', () => {
  beforeEach(() => { render(<MenuSheet onClose={() => {}} />); });

  it('offers a privacy policy — App Store requirement', () => {
    const link = screen.getByRole('link', { name: /privacy policy/i });
    expect(link).toHaveAttribute('href', '/privacy');
  });

  it('offers terms and a cookie policy', () => {
    expect(screen.getByRole('link', { name: /^terms$/i })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: /^cookies$/i })).toHaveAttribute('href', '/cookies');
  });

  it('offers a way to reach the account, which is where deletion lives', () => {
    expect(screen.getByRole('link', { name: /account/i })).toHaveAttribute('href', '/account');
  });

  it('offers a way back to onboarding, so the call can be changed', () => {
    expect(screen.getByRole('link', { name: /sports and spots/i })).toHaveAttribute('href', '/start');
  });

  /*
   * There are two of most legal pages — `/CookiePolicy` and `/cookies`,
   * `/TermsAndConditions` and `/terms`. The capitalised ones now 301 to the
   * lowercase set, and linking the deprecated path from inside the app would
   * put a redirect between a reviewer and the policy for no reason.
   */
  it('links only canonical routes, never the deprecated capitalised ones', () => {
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(CANONICAL).toContain(href);
      expect(href).not.toMatch(/[A-Z]/);
    }
  });

  it('is a dialog, and says what it is', () => {
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Menu');
  });
});
