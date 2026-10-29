const store = new Map<string, string>();
const caps = { native: true, plugin: true, platform: 'ios' };
const requestReview = jest.fn(async () => undefined);
const trackEvent = jest.fn();

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => caps.native,
    isPluginAvailable: () => caps.plugin,
    getPlatform: () => caps.platform,
  },
}));
jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: store.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void store.set(key, value),
  },
}));
jest.mock('@capacitor-community/in-app-review', () => ({ InAppReview: { requestReview: () => requestReview() } }));
jest.mock('@/lib/analytics/events', () => ({ trackEvent: (...a: unknown[]) => trackEvent(...a) }));

import { noteHappyMoment, recordReviewSession, resetReviewSessionForTests } from '../inAppReview';
import { parseState } from '../policy';

const DAY = 24 * 3_600_000;
const t0 = new Date(2026, 9, 1, 12).getTime();
const saved = () => parseState(store.get('gd.review.v1'), 0);

/** Three days of use, two launches each, so the policy is ready to ask on day four. */
async function seasoned() {
  for (let d = 0; d < 3; d++) {
    for (let i = 0; i < 2; i++) {
      resetReviewSessionForTests();
      await recordReviewSession(t0 + d * DAY + i * 60_000);
    }
  }
}

beforeEach(() => {
  store.clear();
  Object.assign(caps, { native: true, plugin: true, platform: 'ios' });
  requestReview.mockClear();
  trackEvent.mockClear();
  resetReviewSessionForTests();
});

describe('in the browser', () => {
  it('counts nothing and asks for nothing', async () => {
    caps.native = false;
    await recordReviewSession(t0);
    expect(store.size).toBe(0);
    expect(await noteHappyMoment('call_shared', t0 + 10 * DAY)).toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
  });
});

describe('in the app', () => {
  it('counts a launch once, however many pages are opened', async () => {
    await recordReviewSession(t0);
    await recordReviewSession(t0 + 1000);
    expect(saved().sessions).toBe(1);
  });

  it('does not ask a new install', async () => {
    await recordReviewSession(t0);
    expect(await noteHappyMoment('call_shared', t0 + 5000)).toBe(false);
    expect(requestReview).not.toHaveBeenCalled();
  });

  it('asks once the policy allows, records it, and says which moment led to it', async () => {
    await seasoned();
    expect(await noteHappyMoment('call_shared', t0 + 3 * DAY)).toBe(true);
    expect(requestReview).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('review_requested', { moment: 'call_shared', platform: 'ios' });
    expect(saved().asks).toBe(1);

    // and not again the same week
    expect(await noteHappyMoment('call_shared', t0 + 3 * DAY + 1000)).toBe(false);
    expect(requestReview).toHaveBeenCalledTimes(1);
  });

  it('spends nothing while the installed build has no review plugin, so the first ask still happens once it does', async () => {
    await seasoned();
    caps.plugin = false;
    expect(await noteHappyMoment('call_shared', t0 + 3 * DAY)).toBe(false);
    expect(saved().asks).toBe(0);
    expect(requestReview).not.toHaveBeenCalled();

    caps.plugin = true;
    expect(await noteHappyMoment('call_shared', t0 + 4 * DAY)).toBe(true);
  });

  it('does not ask again straight away if the sheet itself throws', async () => {
    await seasoned();
    requestReview.mockRejectedValueOnce(new Error('boom'));
    expect(await noteHappyMoment('call_shared', t0 + 3 * DAY)).toBe(false);
    expect(saved().asks).toBe(1);
    expect(await noteHappyMoment('call_shared', t0 + 3 * DAY + 1000)).toBe(false);
  });
});
