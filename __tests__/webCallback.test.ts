import { Capacitor } from '@capacitor/core';
import { markWebCallback } from '@/lib/auth/webCallback';
import { readFileSync } from 'fs';
import { join } from 'path';

const aasa = JSON.parse(
  readFileSync(join(__dirname, '../public/.well-known/apple-app-site-association'), 'utf8'),
);

jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn(() => false) } }));
const isNative = Capacitor.isNativePlatform as jest.Mock;

describe('markWebCallback', () => {
  beforeEach(() => isNative.mockReturnValue(false));

  it('marks a browser sign-in so it finishes in the browser', () => {
    expect(markWebCallback('https://godaisy.io/auth/callback')).toBe('https://godaisy.io/auth/callback?via=web');
  });

  it('keeps the query it already has', () => {
    expect(markWebCallback('https://godaisy.io/auth/callback?app=godaisy')).toBe(
      'https://godaisy.io/auth/callback?app=godaisy&via=web',
    );
  });

  it('leaves the native app alone, so app-requested emails still open the app', () => {
    isNative.mockReturnValue(true);
    expect(markWebCallback('https://godaisy.io/auth/callback')).toBe('https://godaisy.io/auth/callback');
  });

  it('leaves custom-scheme deep links alone', () => {
    expect(markWebCallback('growdaisy://auth/callback')).toBe('growdaisy://auth/callback');
  });
});

describe('apple-app-site-association', () => {
  type Component = { '/': string; '?'?: Record<string, string>; exclude?: boolean };
  type Detail = { appID: string; components?: Component[] };
  const details = (aasa as { applinks: { details: Detail[] } }).applinks.details;

  it.each(['T7754BV8QM.io.godaisy.app', 'T7754BV8QM.eu.fishfindr.app'])(
    '%s excludes via=web on /auth/callback before claiming it',
    (appID) => {
      const comps = details.find((d) => d.appID === appID)!.components!;
      const exclude = comps.findIndex((c) => c['/'] === '/auth/callback' && c['?']?.via === 'web' && c.exclude);
      const claim = comps.findIndex((c) => c['/'] === '/auth/callback' && !c['?'] && !c.exclude);
      expect(exclude).toBeGreaterThanOrEqual(0);
      expect(claim).toBeGreaterThan(exclude);
    },
  );
});
