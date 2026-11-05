/**
 * Pull App Store finance reports (apple-finance.ts) into app_store_finance_rows
 * and app_store_finance_periods.
 *
 * Each run asks for the last few Apple fiscal periods that are not stored yet.
 * A stored period is final, so it is not asked for again; a period Apple has
 * not published ('not_ready'), one that disagreed with its totals block
 * ('mismatch') or one that failed is retried tomorrow. A key without the
 * Finance role is a status, not a failure, so the other store-stats jobs and
 * the cron's response are unaffected.
 */

import { getSupabaseServerClient } from '@/lib/supabase/serverClient';
import { createAppleToken, type AppleConfig } from './apple';
import { fetchFinanceReport, fiscalPeriodOf, getAppleFinanceConfig, parseFinanceReport, recentFiscalPeriods, type FinanceFetch, type FinanceReport } from './apple-finance';

export type FinanceStatus = 'ok' | 'mismatch' | 'not_ready' | 'no_access' | 'error';

export interface FinanceResult {
  configured: boolean;
  /** Periods stored this run, as "FY2026 P12" */
  stored: string[];
  /** Periods Apple has not published yet */
  notReady: string[];
  /** Set when the key lacks the Finance role; not an error */
  noAccess?: string;
  /** Left at the time budget for the next run */
  timedOut?: boolean;
  error?: string;
}

// Four requests at most, each a few seconds; well inside the cron's 300 s next to the other jobs.
export const FINANCE_PERIODS = 4;
const FINANCE_BUDGET_MS = 60_000;

const label = (fy: number, p: number) => `FY${fy} P${p}`;

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

type Db = ReturnType<typeof getSupabaseServerClient>;

async function writePeriod(
  db: Db,
  vendor: string,
  fy: number,
  period: number,
  fields: { status: FinanceStatus; detail?: string | null; report?: FinanceReport },
): Promise<void> {
  const { report } = fields;
  const { error } = await db.from('app_store_finance_periods').upsert(
    {
      vendor_number: vendor,
      fiscal_year: fy,
      fiscal_period: period,
      status: fields.status,
      detail: fields.detail ?? null,
      row_count: report?.rows.length ?? 0,
      totals: report?.totals ?? null,
      // Keep whatever dates an earlier fetch stored when this attempt has none
      ...(report?.startDate && { start_date: report.startDate }),
      ...(report?.endDate && { end_date: report.endDate }),
      fetched_at: new Date().toISOString(),
    },
    { onConflict: 'vendor_number,fiscal_year,fiscal_period' },
  );
  if (error) throw new Error(error.message);
}

/**
 * Replace a period's detail rows. The period row goes in first as 'error' (the
 * rows reference it), so a failure part-way leaves it marked for retry; the
 * caller then writes the real status.
 */
async function storeRows(db: Db, vendor: string, fy: number, period: number, report: FinanceReport): Promise<void> {
  await writePeriod(db, vendor, fy, period, { status: 'error', detail: 'rows being replaced', report });
  const { error: delError } = await db.from('app_store_finance_rows').delete().eq('vendor_number', vendor).eq('fiscal_year', fy).eq('fiscal_period', period);
  if (delError) throw new Error(delError.message);
  for (let i = 0; i < report.rows.length; i += 500) {
    const chunk = report.rows.slice(i, i + 500).map((r) => ({ ...r, vendor_number: vendor, fiscal_year: fy, fiscal_period: period }));
    const { error } = await db.from('app_store_finance_rows').insert(chunk);
    if (error) throw new Error(error.message);
  }
}

async function storedPeriods(db: Db, vendor: string): Promise<Set<string>> {
  const { data, error } = await db.from('app_store_finance_periods').select('fiscal_year, fiscal_period').eq('vendor_number', vendor).eq('status', 'ok');
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((p) => label(p.fiscal_year, p.fiscal_period)));
}

async function pullPeriod(db: Db, config: AppleConfig, token: string, fy: number, period: number, signal: AbortSignal, result: FinanceResult): Promise<'continue' | 'stop'> {
  const vendor = config.vendorNumber;
  const name = label(fy, period);
  let got: FinanceFetch;
  try {
    got = await fetchFinanceReport(config, token, fy, period, signal);
  } catch (err) {
    if (signal.aborted) {
      result.timedOut = true;
      return 'stop';
    }
    // Recorded so the dashboard can say so; the next period may still work
    result.error ??= message(err);
    await writePeriod(db, vendor, fy, period, { status: 'error', detail: message(err).slice(0, 500) });
    return 'continue';
  }

  if (got.kind === 'not_ready') {
    result.notReady.push(name);
    await writePeriod(db, vendor, fy, period, { status: 'not_ready' });
    return 'continue';
  }
  if (got.kind === 'no_access') {
    // Every period will say the same: record it once and stop
    result.noAccess = `Apple ${got.status}: ${got.detail}`;
    await writePeriod(db, vendor, fy, period, { status: 'no_access', detail: result.noAccess.slice(0, 500) });
    return 'stop';
  }

  const report = parseFinanceReport(got.text);
  if (report.rows.length === 0 && !report.startDate) {
    throw new Error(`Finance report for ${name} had no readable rows or dates`);
  }
  const problems = [...report.mismatches, ...report.warnings];
  if (report.endDate) {
    // The file's own dates say which period it is; a different one means our request guess was off
    const own = fiscalPeriodOf(report.endDate);
    if (own.fiscalYear !== fy || own.fiscalPeriod !== period) problems.push(`file dates are ${report.startDate} to ${report.endDate}, which is ${label(own.fiscalYear, own.fiscalPeriod)}, not ${name}`);
  }
  await storeRows(db, vendor, fy, period, report);
  await writePeriod(db, vendor, fy, period, { status: report.mismatches.length > 0 ? 'mismatch' : 'ok', detail: problems.join('; ').slice(0, 500) || null, report });
  result.stored.push(name);
  return 'continue';
}

export async function syncFinance(periods = FINANCE_PERIODS, now = new Date()): Promise<FinanceResult> {
  const result: FinanceResult = { configured: false, stored: [], notReady: [] };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FINANCE_BUDGET_MS);
  try {
    const config = getAppleFinanceConfig();
    if (!config) return result;
    result.configured = true;
    const token = createAppleToken(config);
    // These tables are granted to service_role only, so this needs SUPABASE_SERVICE_ROLE_KEY
    const db = getSupabaseServerClient();
    const have = await storedPeriods(db, config.vendorNumber);

    for (const { fiscalYear, fiscalPeriod } of recentFiscalPeriods(now, periods)) {
      if (have.has(label(fiscalYear, fiscalPeriod))) continue;
      if (controller.signal.aborted) {
        result.timedOut = true;
        break;
      }
      try {
        if ((await pullPeriod(db, config, token, fiscalYear, fiscalPeriod, controller.signal, result)) === 'stop') break;
      } catch (err) {
        result.error ??= message(err);
      }
    }
  } catch (err) {
    result.error = message(err);
  } finally {
    clearTimeout(timer);
  }
  return result;
}
