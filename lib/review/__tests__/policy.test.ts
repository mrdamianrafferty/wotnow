import { POLICY, emptyState, localDay, parseState, recordAsk, recordSession, shouldAsk, type ReviewState } from '../policy';

const DAY = 24 * 3_600_000;
const t0 = new Date(2026, 9, 1, 12, 0, 0).getTime();

/** An install that has been used on `days` different days, `perDay` times each, starting at t0. */
function usedFor(days: number, perDay = 1): { state: ReviewState; now: number } {
  let state = emptyState(t0);
  let now = t0;
  for (let d = 0; d < days; d++) {
    now = t0 + d * DAY;
    for (let i = 0; i < perDay; i++) state = recordSession(state, now + i * 60_000);
  }
  return { state, now };
}

describe('when a rating may be asked for', () => {
  it('not for someone who has just installed it', () => {
    expect(shouldAsk(emptyState(t0), t0)).toBe(false);
  });

  it('not on five opens in one afternoon: that is one visit, not five', () => {
    const { state, now } = usedFor(1, 5);
    expect(state.sessions).toBe(5);
    expect(shouldAsk(state, now + 4 * DAY)).toBe(false);
  });

  it('not before it has had three days of life, even with enough sessions on enough days', () => {
    const { state } = usedFor(3, 2);
    expect(shouldAsk(state, t0 + 2 * DAY)).toBe(false); // second day's evening: age < 3 days
  });

  it('yes once it has been used on three days, five times, and is three days old', () => {
    const { state } = usedFor(3, 2);
    expect(state.sessions).toBe(6);
    expect(state.days).toHaveLength(3);
    expect(shouldAsk(state, t0 + 3 * DAY)).toBe(true);
  });

  it('then not again for 120 days, and never more than three times', () => {
    let { state } = usedFor(3, 2);
    let now = t0 + 3 * DAY;
    state = recordAsk(state, now);
    expect(shouldAsk(state, now + 119 * DAY)).toBe(false);
    expect(shouldAsk(state, now + POLICY.cooldownMs + 1)).toBe(true);

    now += POLICY.cooldownMs + 1;
    state = recordAsk(state, now);
    now += POLICY.cooldownMs + 1;
    state = recordAsk(state, now);
    expect(state.asks).toBe(3);
    expect(shouldAsk(state, now + 400 * DAY)).toBe(false);
  });
});

describe('the counters', () => {
  it('counts a session on a day once in the day list but every time in the total', () => {
    const s = recordSession(recordSession(emptyState(t0), t0), t0 + 1000);
    expect(s.sessions).toBe(2);
    expect(s.days).toEqual([localDay(t0)]);
  });

  it('remembers a bounded number of days', () => {
    let s = emptyState(t0);
    for (let d = 0; d < POLICY.keepDays + 10; d++) s = recordSession(s, t0 + d * DAY);
    expect(s.days).toHaveLength(POLICY.keepDays);
    expect(s.sessions).toBe(POLICY.keepDays + 10);
  });
});

describe('reading what was stored', () => {
  it('treats nothing, rubbish and the wrong shape as a fresh install', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', '{"sessions":"lots"}']) {
      const s = parseState(raw, t0);
      expect(s).toMatchObject({ firstSeen: expect.any(Number), sessions: 0, asks: 0, lastAsk: null });
    }
  });

  it('round-trips a real state', () => {
    const { state } = usedFor(4, 2);
    expect(parseState(JSON.stringify(recordAsk(state, t0)), 0)).toEqual(recordAsk(state, t0));
  });
});
