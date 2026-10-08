/**
 * deepl-budget — the meter and the brake for live DeepL calls.
 *
 * One DeepL Free key (500k characters/month, a tier no longer offered, so worth
 * protecting) is shared by Grewp, Rise Daisy, Findr, Go Daisy and Grow Daisy.
 * Priority, highest first: Grewp, Rise Daisy, Findr, then Go/Grow Daisy.
 * Nothing in DeepL's API says who spent what, so each app keeps its own ledger
 * and applies two independent limits before every live call:
 *
 *   1. APP CAP      this app's own characters this UTC month
 *                   (`DEEPL_APP_MONTHLY_CHAR_CAP`, default 50,000)
 *   2. ACCOUNT CEILING  a fraction of the whole account's limit, read from
 *                   DeepL's own /v2/usage (`DEEPL_ACCOUNT_CEILING_FRACTION`,
 *                   default 0.40). Lower-priority apps set a LOWER fraction, so
 *                   they stop first and the headroom above their ceiling is
 *                   left for the apps ranked above them.
 *
 * Both fail CLOSED: if the ledger or DeepL's usage endpoint can't be read, the
 * answer is "don't spend" and the caller serves the English source. The
 * dictionary lookup (free) runs before any of this, so a closed budget costs
 * only untranslated strings, never a broken page.
 *
 * Characters are RESERVED atomically in `translation_usage_reserve` before the
 * call, so concurrent requests can't overshoot, then settled against DeepL's
 * `billedCharacters`. See docs/reference/deepl-quota-policy.md.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Config ──────────────────────────────────────────────────────────────

export interface BudgetConfig {
  app: string;
  appMonthlyCap: number;
  accountCeilingFraction: number;
  /** Kill switch: DEEPL_LIVE_DISABLED=1 stops all live spend, dictionary still serves. */
  disabled: boolean;
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function getBudgetConfig(env: NodeJS.ProcessEnv = process.env): BudgetConfig {
  const fraction = positiveNumber(env.DEEPL_ACCOUNT_CEILING_FRACTION, 0.40);
  return {
    app: (env.DEEPL_APP_NAME || 'go-daisy').trim(),
    appMonthlyCap: Math.floor(positiveNumber(env.DEEPL_APP_MONTHLY_CHAR_CAP, 50_000)),
    accountCeilingFraction: Math.min(1, fraction),
    disabled: env.DEEPL_LIVE_DISABLED === '1' || env.DEEPL_LIVE_DISABLED === 'true',
  };
}

export function currentPeriod(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ─── Pure decision ───────────────────────────────────────────────────────

export type RefusalReason =
  | 'disabled'
  | 'app_cap'
  | 'account_ceiling'
  | 'ledger_unavailable'
  | 'account_unknown';

export interface RoomInput {
  appUsed: number;
  appCap: number;
  accountUsed: number;
  accountLimit: number;
  ceilingFraction: number;
}

/** Characters this app may still spend, and which limit is the binding one. */
export function computeRoom(i: RoomInput): { room: number; binding: 'app_cap' | 'account_ceiling' } {
  // NaN compares false against everything, so an unusable number would read as
  // "plenty of room". Fail closed instead.
  if (![i.appUsed, i.appCap, i.accountUsed, i.accountLimit, i.ceilingFraction].every(Number.isFinite)) {
    return { room: 0, binding: 'account_ceiling' };
  }
  const appRoom = Math.max(0, i.appCap - i.appUsed);
  const accountRoom = Math.max(0, Math.floor(i.accountLimit * i.ceilingFraction) - i.accountUsed);
  return appRoom <= accountRoom
    ? { room: appRoom, binding: 'app_cap' }
    : { room: accountRoom, binding: 'account_ceiling' };
}

/**
 * Longest prefix of `lengths` whose total fits in `room`. Order is the
 * caller's priority order, so earlier items win when the budget is short.
 */
export function prefixThatFits(lengths: number[], room: number): number {
  let total = 0;
  let n = 0;
  for (const len of lengths) {
    if (total + len > room) break;
    total += len;
    n += 1;
  }
  return n;
}

// ─── Account usage (DeepL's own number, shared by every app) ─────────────

const ACCOUNT_USAGE_TTL_MS = 5 * 60_000;

interface AccountUsage { count: number; limit: number; fetchedAt: number }
let accountUsage: AccountUsage | null = null;

export type UsageFetcher = () => Promise<{ count: number; limit: number }>;

async function getAccountUsage(fetchUsage: UsageFetcher, now = Date.now()): Promise<AccountUsage | null> {
  if (accountUsage && now - accountUsage.fetchedAt < ACCOUNT_USAGE_TTL_MS) return accountUsage;
  try {
    const { count, limit } = await fetchUsage();
    if (!Number.isFinite(count) || !Number.isFinite(limit) || limit <= 0) {
      throw new Error(`unusable usage figures (count ${count}, limit ${limit})`);
    }
    accountUsage = { count, limit, fetchedAt: now };
    return accountUsage;
  } catch (err) {
    warnOnce('account_unknown', `DeepL usage endpoint unreadable: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

/** Keep the cached account count honest between refreshes. */
export function noteAccountSpend(chars: number): void {
  if (accountUsage) accountUsage.count = Math.max(0, accountUsage.count + chars);
}

// ─── Ledger (this app's own meter) ───────────────────────────────────────

type DbResult = PromiseLike<{ data: unknown; error: { message: string } | null }>;
type EqChain = { eq: (...a: [string, string]) => { maybeSingle: () => DbResult } };
interface Rpc {
  rpc: (...a: [string, object]) => DbResult;
  from: (...a: [string]) => { select: (...a: [string]) => { eq: (...a: [string, string]) => EqChain } };
}

let ledgerOverride: Rpc | null = null;
let ledgerClient: Rpc | null = null;

function db(): Rpc {
  if (ledgerOverride) return ledgerOverride;
  if (!ledgerClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase admin credentials are missing for the DeepL budget ledger.');
    // The generated Database types don't know this table or its functions.
    ledgerClient = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) as unknown as Rpc;
  }
  return ledgerClient;
}

async function readAppUsed(cfg: BudgetConfig, period: string): Promise<number | null> {
  try {
    const { data, error } = await db()
      .from('translation_usage')
      .select('chars')
      .eq('app', cfg.app)
      .eq('period', period)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Number((data as { chars?: number | string } | null)?.chars ?? 0);
  } catch (err) {
    warnOnce('ledger_unavailable', `translation_usage unreadable: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function adjust(
  cfg: BudgetConfig, period: string, lang: string,
  delta: number, failed = 0, refused = 0,
): Promise<void> {
  try {
    const { error } = await db().rpc('translation_usage_adjust', {
      p_app: cfg.app, p_period: period, p_lang: lang,
      p_delta_chars: delta, p_failed: failed, p_refused: refused,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    // The meter is best-effort on the way DOWN: a missed settle leaves us
    // over-counting, which errs toward saving quota.
    warnOnce('adjust_failed', `translation_usage_adjust failed: ${err instanceof Error ? err.message : err}`);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────

export type Reservation =
  | { ok: true; period: string; chars: number }
  | { ok: false; reason: RefusalReason; room: number };

/**
 * Ask for `chars` characters. On success they are already counted against
 * the ledger — pair with `settleReservation` or `releaseReservation`.
 * On refusal, `room` is what WOULD fit, so a batch can retry with a prefix.
 */
export async function reserveChars(
  lang: string, chars: number, fetchUsage: UsageFetcher,
  cfg: BudgetConfig = getBudgetConfig(), now: Date = new Date(),
): Promise<Reservation> {
  if (cfg.disabled) return { ok: false, reason: 'disabled', room: 0 };
  if (chars <= 0) return { ok: true, period: currentPeriod(now), chars: 0 };

  const period = currentPeriod(now);
  const appUsed = await readAppUsed(cfg, period);
  if (appUsed === null) return { ok: false, reason: 'ledger_unavailable', room: 0 };

  const account = await getAccountUsage(fetchUsage, now.getTime());
  if (!account) return { ok: false, reason: 'account_unknown', room: 0 };

  const { room, binding } = computeRoom({
    appUsed, appCap: cfg.appMonthlyCap,
    accountUsed: account.count, accountLimit: account.limit,
    ceilingFraction: cfg.accountCeilingFraction,
  });
  if (chars > room) {
    warnOnce(binding, `live translation paused: ${binding} (room ${room}, wanted ${chars})`);
    await adjust(cfg, period, lang, 0, 0, 1);
    return { ok: false, reason: binding, room };
  }

  // Atomic guard against concurrent requests racing past the read above.
  try {
    const { data, error } = await db().rpc('translation_usage_reserve', {
      p_app: cfg.app, p_period: period, p_lang: lang, p_chars: chars, p_cap: cfg.appMonthlyCap,
    });
    if (error) throw new Error(error.message);
    if (data !== true) {
      await adjust(cfg, period, lang, 0, 0, 1);
      return { ok: false, reason: 'app_cap', room: 0 };
    }
  } catch (err) {
    warnOnce('ledger_unavailable', `translation_usage_reserve failed: ${err instanceof Error ? err.message : err}`);
    return { ok: false, reason: 'ledger_unavailable', room: 0 };
  }
  noteAccountSpend(chars);
  return { ok: true, period, chars };
}

/** DeepL answered: correct the ledger to what it actually billed. */
export async function settleReservation(
  r: Extract<Reservation, { ok: true }>, lang: string, billed: number,
  cfg: BudgetConfig = getBudgetConfig(),
): Promise<void> {
  const delta = billed - r.chars;
  if (delta === 0) return;
  noteAccountSpend(delta);
  await adjust(cfg, r.period, lang, delta);
}

/** DeepL failed (nothing billed): give the characters back and count the failure. */
export async function releaseReservation(
  r: Extract<Reservation, { ok: true }>, lang: string,
  cfg: BudgetConfig = getBudgetConfig(),
): Promise<void> {
  noteAccountSpend(-r.chars);
  await adjust(cfg, r.period, lang, -r.chars, 1, 0);
}

export interface BudgetSnapshot {
  app: string;
  period: string;
  appUsed: number | null;
  appCap: number;
  accountUsed: number | null;
  accountLimit: number | null;
  accountCeiling: number | null;
  room: number | null;
  binding: 'app_cap' | 'account_ceiling' | null;
}

/** For the usage script and any admin view. Never throws. */
export async function budgetSnapshot(
  fetchUsage: UsageFetcher, cfg: BudgetConfig = getBudgetConfig(),
): Promise<BudgetSnapshot> {
  const period = currentPeriod();
  const appUsed = await readAppUsed(cfg, period);
  accountUsage = null; // a status read should see DeepL's current number
  const account = await getAccountUsage(fetchUsage);
  const snap: BudgetSnapshot = {
    app: cfg.app, period, appUsed, appCap: cfg.appMonthlyCap,
    accountUsed: account?.count ?? null, accountLimit: account?.limit ?? null,
    accountCeiling: account ? Math.floor(account.limit * cfg.accountCeilingFraction) : null,
    room: null, binding: null,
  };
  if (appUsed !== null && account) {
    const { room, binding } = computeRoom({
      appUsed, appCap: cfg.appMonthlyCap, accountUsed: account.count,
      accountLimit: account.limit, ceilingFraction: cfg.accountCeilingFraction,
    });
    snap.room = room;
    snap.binding = binding;
  }
  return snap;
}

// ─── Logging (once per reason per warm container) ────────────────────────

const warned = new Set<string>();
function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[deepl-budget] ${message}`);
}

/** Test seam: forget cached usage and the warn-once memory, optionally swap the ledger. */
export function __resetBudgetStateForTests(ledger: unknown = null): void {
  accountUsage = null;
  warned.clear();
  ledgerOverride = ledger as Rpc | null;
}
