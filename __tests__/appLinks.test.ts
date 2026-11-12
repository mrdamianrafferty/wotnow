/**
 * Which links open the app, and what the app does with them.
 *
 * Shared links from Go Daisy — a call, a drawn conditions card — are ordinary
 * godaisy.io URLs. Until 12 Nov 2026 every one of them opened in the browser
 * even with the app installed: the iOS site association listed only
 * `/auth/callback` for Go Daisy. And had one reached the app, its handler kept
 * the path and dropped the query and hash, so `/weather?n=Newquay&…#tide`
 * would have opened the reader's own place.
 */

import fs from 'node:fs';
import path from 'node:path';

jest.mock('@capacitor/app', () => ({ App: { addListener: jest.fn() } }), { virtual: true });
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }), { virtual: true });
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {} }) }));

import { handleDeepLink } from '@/lib/capacitor/deepLinkHandler';

type Details = Array<{ appID: string; paths: string[] }>;
const AASA = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', '.well-known', 'apple-app-site-association'), 'utf8'));
const details: Details = AASA.applinks.details;

/** Apple's rules for one app: patterns in order, the first that matches decides; `NOT` excludes; `*` is any run of characters. */
function claims(paths: string[], p: string): boolean {
  for (const raw of paths) {
    const not = raw.startsWith('NOT ');
    const pat = not ? raw.slice(4) : raw;
    const re = new RegExp(`^${pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
    if (re.test(p)) return !not;
  }
  return false;
}
const goDaisy = details.find((d) => d.appID.endsWith('io.godaisy.app'))!.paths;
const grow = details.find((d) => d.appID.endsWith('io.growdaisy.app'))!.paths;

describe('the Go Daisy app opens its shared links', () => {
  it.each([
    '/call', '/weather', '/surfing/croyde-bay', '/share/abc123', '/invite/42', '/poll/7', '/auth/callback',
  ])('%s', (p) => expect(claims(goDaisy, p)).toBe(true));
});

describe('and leaves everything else alone', () => {
  it.each([
    '/grow', '/grow/plan', '/grow/species/tomato', '/findr', '/findr/map',
    '/api/unified-weather', '/admin/stats', '/auth/login', '/_next/static/x.js', '/.well-known/assetlinks.json',
    '/', '/privacy', '/terms',
  ])('%s', (p) => expect(claims(goDaisy, p)).toBe(false));

  it('so Grow keeps its own pages', () => {
    expect(claims(grow, '/grow/plan')).toBe(true);
  });
});

describe('a link the app is handed keeps its place, day and section', () => {
  it.each([
    ['https://godaisy.io/weather?n=Newquay&lat=50.4156&lon=-5.0750&c=1&day=2#tide', '/weather?n=Newquay&lat=50.4156&lon=-5.0750&c=1&day=2#tide'],
    ['https://godaisy.io/call?place=croyde-bay&a=surfing', '/call?place=croyde-bay&a=surfing'],
    ['https://godaisy.io/surfing/croyde-bay?from=share', '/surfing/croyde-bay?from=share'],
  ])('%s', async (url, path_) => {
    expect(await handleDeepLink(url)).toEqual({ handled: true, path: path_ });
  });
});
