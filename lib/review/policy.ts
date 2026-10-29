/**
 * When Go Daisy may ask for an App Store / Play rating. Pure, so the rules
 * are tested without a phone.
 *
 * The ask itself is the system's own sheet (StoreKit on iOS, Play In-App
 * Review on Android): App Review Guideline 5.6.1 disallows a custom prompt that
 * imitates it, and both stores decide whether it actually appears. So this file
 * never asks a question of its own and never filters by mood ("enjoying Go
 * Daisy?" before sending only the happy to the store). It only decides WHEN a
 * request is allowed to be made, and the answer is "rarely, and after someone
 * has done something that suggests the app worked for them".
 *
 * The stores also throttle the sheet themselves (iOS shows it at most three
 * times in 365 days), so a refusal here is rarely the only thing standing
 * between a person and being nagged; it is the courtesy layer.
 */

export interface ReviewState {
  /** ms since epoch of the first launch we saw. */
  firstSeen: number;
  /** Launches counted, one per app session. */
  sessions: number;
  /** Distinct local days with a session, newest last, capped. */
  days: string[];
  /** How many times a request has been made. */
  asks: number;
  /** ms since epoch of the last request; null if never. */
  lastAsk: number | null;
}

export const POLICY = {
  /** Sessions before anyone is asked: someone who opened it once has not formed a view. */
  minSessions: 5,
  /** On at least this many different days: five opens in an hour is one visit. */
  minDays: 3,
  /** And at least this long after first launch. */
  minAgeMs: 3 * 24 * 3_600_000,
  /** Between requests. */
  cooldownMs: 120 * 24 * 3_600_000,
  /** Over the life of the install. */
  maxAsks: 3,
  /** How many session days are remembered. */
  keepDays: 30,
} as const;

export function emptyState(now: number): ReviewState {
  return { firstSeen: now, sessions: 0, days: [], asks: 0, lastAsk: null };
}

/** YYYY-MM-DD in the device's own timezone: "a different day" means the person's day. */
export function localDay(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function recordSession(state: ReviewState, now: number): ReviewState {
  const today = localDay(now);
  const days = state.days.includes(today) ? state.days : [...state.days, today].slice(-POLICY.keepDays);
  return { ...state, sessions: state.sessions + 1, days };
}

export function shouldAsk(state: ReviewState, now: number): boolean {
  if (state.asks >= POLICY.maxAsks) return false;
  if (state.sessions < POLICY.minSessions) return false;
  if (state.days.length < POLICY.minDays) return false;
  if (now - state.firstSeen < POLICY.minAgeMs) return false;
  if (state.lastAsk !== null && now - state.lastAsk < POLICY.cooldownMs) return false;
  return true;
}

export function recordAsk(state: ReviewState, now: number): ReviewState {
  return { ...state, asks: state.asks + 1, lastAsk: now };
}

/** Reads a stored value defensively: anything malformed is treated as a fresh install. */
export function parseState(raw: string | null | undefined, now: number): ReviewState {
  if (!raw) return emptyState(now);
  try {
    const v = JSON.parse(raw) as Partial<ReviewState>;
    const num = (x: unknown, fallback: number) => (typeof x === 'number' && Number.isFinite(x) ? x : fallback);
    return {
      firstSeen: num(v.firstSeen, now),
      sessions: Math.max(0, Math.floor(num(v.sessions, 0))),
      days: Array.isArray(v.days) ? v.days.filter((d): d is string => typeof d === 'string').slice(-POLICY.keepDays) : [],
      asks: Math.max(0, Math.floor(num(v.asks, 0))),
      lastAsk: v.lastAsk === null || v.lastAsk === undefined ? null : num(v.lastAsk, 0),
    };
  } catch {
    return emptyState(now);
  }
}
