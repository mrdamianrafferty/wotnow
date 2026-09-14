/**
 * Which copy of the setup wins when a device signs in.
 *
 * `AuthContext` used to push the device's cookie to the server on every auth
 * event, so the last device to launch decided the account's sports — and a
 * phone that went through `/start` decided them as the five pre-ticked
 * defaults. These pin the rule that replaced it: the account wins, unless this
 * device has a change the account never received.
 */

import { reconcileSetup, saveSetup } from '@/lib/godaisy/call/sync';
import {
  readSetup, writeSetup, DEFAULT_SPORTS, SETUP_COOKIE, type CallSetup,
} from '@/lib/godaisy/call/setup';

const mockGetSession = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
}));

const USER = 'user-1';

const signedIn = () => mockGetSession.mockResolvedValue({
  data: { session: { access_token: 'token', user: { id: USER } } },
});
const signedOut = () => mockGetSession.mockResolvedValue({ data: { session: null } });

const NEWQUAY = { name: 'Newquay', lat: 50.4155, lon: -5.0737 };
const CURATED: CallSetup = { v: 1, sports: ['cycling', 'running', 'surfing'], place: NEWQUAY, hour: 7 };
const DEFAULTS: CallSetup = { v: 1, sports: [...DEFAULT_SPORTS], place: NEWQUAY };

const row = (s: CallSetup) => ({
  call_hour: s.hour ?? null,
  call_place_name: s.place.name,
  call_place_lat: s.place.lat,
  call_place_lon: s.place.lon,
  call_coastal_name: null,
  call_coastal_lat: null,
  call_coastal_lon: null,
  call_sports: s.sports,
});

let fetchMock: jest.Mock;

/** The server: what a GET returns, and whether a PUT is accepted. */
function server(opts: { setup?: CallSetup | null; getStatus?: number; putStatus?: number }) {
  fetchMock = jest.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'PUT') {
      const status = opts.putStatus ?? 200;
      return { ok: status < 400, status, json: async () => ({}) };
    }
    const status = opts.getStatus ?? 200;
    return { ok: status < 400, status, json: async () => ({ setup: opts.setup ? row(opts.setup) : null }) };
  });
  global.fetch = fetchMock as unknown as typeof fetch;
}

const puts = () => fetchMock.mock.calls
  .filter(([, init]) => init?.method === 'PUT')
  .map(([, init]) => JSON.parse(String(init.body)));

beforeEach(() => {
  document.cookie = `${SETUP_COOKIE}=; Max-Age=0; Path=/`;
  localStorage.clear();
  mockGetSession.mockReset();
});

describe('reconcileSetup — the account wins unless this device has news', () => {
  it('puts the account over a device still holding the defaults', async () => {
    signedIn();
    writeSetup(DEFAULTS);
    server({ setup: CURATED });

    await expect(reconcileSetup(USER)).resolves.toBe(true);
    expect(readSetup()?.sports).toEqual(CURATED.sports);
    expect(puts()).toEqual([]);
  });

  it('does the same when the defaults were chosen here while signed out', async () => {
    signedOut();
    server({ setup: null });
    await saveSetup(DEFAULTS);

    signedIn();
    server({ setup: CURATED });
    await reconcileSetup(USER);

    expect(readSetup()?.sports).toEqual(CURATED.sports);
    expect(puts()).toEqual([]);
  });

  it('pushes a change made here under this account that never reached the server', async () => {
    signedIn();
    server({ setup: CURATED, putStatus: 500 });
    await expect(saveSetup({ ...CURATED, sports: ['running'] })).resolves.toBe('local-only');

    server({ setup: CURATED });
    await expect(reconcileSetup(USER)).resolves.toBe(false);
    expect(puts()).toEqual([expect.objectContaining({ sports: ['running'] })]);
    expect(readSetup()?.sports).toEqual(['running']);

    // Delivered, so the marker is gone: the (unchanged) mock account wins now.
    await reconcileSetup(USER);
    expect(readSetup()?.sports).toEqual(CURATED.sports);
  });

  it("does not push another account's unsent change", async () => {
    signedIn();
    server({ setup: CURATED, putStatus: 500 });
    await saveSetup({ ...CURATED, sports: ['running'] });

    server({ setup: CURATED });
    await reconcileSetup('someone-else');

    expect(puts()).toEqual([]);
    expect(readSetup()?.sports).toEqual(CURATED.sports);
  });

  it('mirrors the cookie to an account that has no setup yet', async () => {
    signedIn();
    writeSetup(CURATED);
    server({ setup: null });

    await reconcileSetup(USER);
    expect(puts()).toEqual([expect.objectContaining({ sports: CURATED.sports, hour: 7 })]);
  });

  it('changes nothing when the server cannot be asked', async () => {
    signedIn();
    writeSetup(DEFAULTS);
    server({ getStatus: 500 });

    await expect(reconcileSetup(USER)).resolves.toBe(false);
    expect(readSetup()?.sports).toEqual(DEFAULTS.sports);
    expect(puts()).toEqual([]);
  });

  it('leaves a cookie that already agrees alone', async () => {
    signedIn();
    writeSetup(CURATED);
    server({ setup: CURATED });

    await expect(reconcileSetup(USER)).resolves.toBe(false);
    expect(puts()).toEqual([]);
  });
});
