/**
 * The setup cookie.
 *
 * This value decides which coordinates the server puts into an outbound
 * forecast request and which activity ids it looks up in the library, and it
 * arrives from the client — so it is hostile input, and most of these tests are
 * about what happens when it is not what we wrote.
 */

import {
  parseSetup, encodeSetup, setupFromCookieHeader, SETUP_COOKIE, type CallSetup,
} from '@/lib/godaisy/call/setup';

const GOOD: CallSetup = {
  v: 1,
  sports: ['running', 'cycling', 'surfing'],
  place: { name: 'Newquay', lat: 50.4155, lon: -5.0737 },
  hour: 7,
};

const cookie = (setup: unknown) =>
  `${SETUP_COOKIE}=${encodeURIComponent(
    Buffer.from(JSON.stringify(setup), 'utf8').toString('base64'),
  )}`;

describe('the setup cookie', () => {
  it('survives the round trip', () => {
    expect(parseSetup(encodeSetup(GOOD))).toEqual(GOOD);
  });

  it('carries a coastal spot when there is one', () => {
    const withCoastal: CallSetup = { ...GOOD, coastal: { name: 'Fistral', lat: 50.4169, lon: -5.0993 } };
    expect(parseSetup(encodeSetup(withCoastal))).toEqual(withCoastal);
  });

  it('survives a place name with a comma, which is why it is base64', () => {
    const s: CallSetup = { ...GOOD, place: { name: 'Kingston upon Hull, England', lat: 53.7, lon: -0.3 } };
    expect(parseSetup(encodeSetup(s))?.place.name).toBe('Kingston upon Hull, England');
  });

  it('reads itself out of a Cookie header with other cookies in it', () => {
    const header = `sb-access-token=xyz; ${cookie(GOOD)}; other=1`;
    expect(setupFromCookieHeader(header)).toEqual(GOOD);
  });

  it('is absent rather than wrong when there is no cookie', () => {
    expect(setupFromCookieHeader(undefined)).toBeNull();
    expect(setupFromCookieHeader('other=1; another=2')).toBeNull();
    expect(parseSetup('')).toBeNull();
    expect(parseSetup('not base64 at all £££')).toBeNull();
  });

  /*
   * An unknown id reaches the scorer, which looks it up in the library and finds
   * nothing. Dropping them here means a tampered cookie degrades to the sports
   * it did get right, rather than to a call about nothing.
   */
  it('drops activity ids that are not in the library', () => {
    const s = parseSetup(encodeSetup({ ...GOOD, sports: ['running', 'quidditch', 'cycling'] } as CallSetup));
    expect(s?.sports).toEqual(['running', 'cycling']);
  });

  it('refuses a setup with no usable sport at all', () => {
    expect(parseSetup(encodeSetup({ ...GOOD, sports: ['quidditch'] } as CallSetup))).toBeNull();
    expect(parseSetup(encodeSetup({ ...GOOD, sports: [] } as CallSetup))).toBeNull();
  });

  /*
   * These coordinates go into a URL the server fetches. Out-of-range values are
   * refused rather than clamped: a clamp turns nonsense into a plausible place
   * on the Greenwich meridian and renders a confident call about it.
   */
  it('refuses coordinates that are not on the planet', () => {
    for (const place of [
      { name: 'X', lat: 91, lon: 0 },
      { name: 'X', lat: -91, lon: 0 },
      { name: 'X', lat: 0, lon: 181 },
      { name: 'X', lat: Number.NaN, lon: 0 },
      { name: 'X', lat: Infinity, lon: 0 },
    ]) {
      expect(parseSetup(encodeSetup({ ...GOOD, place } as CallSetup))).toBeNull();
    }
  });

  it('refuses a place with no name — the kicker would print nothing', () => {
    expect(parseSetup(encodeSetup({ ...GOOD, place: { name: '   ', lat: 50, lon: -5 } } as CallSetup))).toBeNull();
  });

  it('caps a place name, because it is printed and baked into the share card', () => {
    const long = 'A'.repeat(400);
    const s = parseSetup(encodeSetup({ ...GOOD, place: { name: long, lat: 50, lon: -5 } } as CallSetup));
    expect(s?.place.name.length).toBe(60);
  });

  it('ignores an hour that is not one', () => {
    for (const hour of [24, -1, 7.5, Number.NaN]) {
      expect(parseSetup(encodeSetup({ ...GOOD, hour } as CallSetup))?.hour).toBeUndefined();
    }
    expect(parseSetup(encodeSetup({ ...GOOD, hour: 0 } as CallSetup))?.hour).toBe(0);
    expect(parseSetup(encodeSetup({ ...GOOD, hour: 23 } as CallSetup))?.hour).toBe(23);
  });

  /*
   * Half a decision renders a call about the right sports at the wrong place,
   * which is worse than the default because it looks deliberate.
   */
  it('returns nothing rather than half a setup', () => {
    expect(parseSetup(encodeSetup({ v: 1, sports: ['running'] } as unknown as CallSetup))).toBeNull();
    expect(parseSetup(encodeSetup({ v: 1, place: GOOD.place } as unknown as CallSetup))).toBeNull();
  });

  it('drops a cookie written by an older shape rather than misreading it', () => {
    expect(parseSetup(encodeSetup({ ...GOOD, v: 0 } as unknown as CallSetup))).toBeNull();
    expect(parseSetup(encodeSetup({ ...GOOD, v: 2 } as unknown as CallSetup))).toBeNull();
  });

  it('does not choke on a cookie that is valid base64 but not our JSON', () => {
    const junk = Buffer.from('[1,2,3]', 'utf8').toString('base64');
    expect(parseSetup(junk)).toBeNull();
    expect(parseSetup(Buffer.from('null', 'utf8').toString('base64'))).toBeNull();
  });

  it('keeps the sports list to something a call could use', () => {
    const many = Array.from({ length: 40 }, () => 'running');
    const s = parseSetup(encodeSetup({ ...GOOD, sports: many } as CallSetup));
    expect(s?.sports.length).toBeLessThanOrEqual(12);
  });
});
