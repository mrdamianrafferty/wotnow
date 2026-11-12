/**
 * The handwriting on the drawn conditions page.
 *
 * Caveat, self-hosted by next/font so nothing loads from Google at runtime.
 * Latin and Latin Extended cover every language Go Daisy ships. Exposed as
 * `--call-font-hand` from _app, used only by the drawn page.
 */
import { Caveat } from 'next/font/google';

export const caveat = Caveat({
  weight: ['500', '700'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  // Declared app-wide; only the drawn page uses it, so nothing else should
  // pay to preload it. The browser fetches it the first time text needs it.
  preload: false,
  variable: '--call-font-hand',
  fallback: ['Comic Sans MS', 'cursive'],
});
