/**
 * Fold app_store_finance_periods / _rows into what /admin/dashboard shows:
 * proceeds by fiscal period and by product, plus one status line. Amounts stay
 * in the currency Apple paid them in; nothing is converted. Pure, so it is
 * tested without a database.
 */

export interface FinancePeriodInput {
  fiscal_year: number;
  fiscal_period: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  detail: string | null;
  row_count: number;
  fetched_at: string;
}

export interface FinanceRowInput {
  fiscal_year: number;
  fiscal_period: number;
  apple_identifier: string;
  sku: string;
  title: string;
  quantity: number;
  extended_partner_share: number;
  partner_share_currency: string;
}

export interface FinanceAmount {
  currency: string;
  /** Net units: sales less returns */
  units: number;
  /** Extended Partner Share, what Apple pays out, in `currency` */
  proceeds: number;
}

export interface FinanceProduct extends FinanceAmount {
  appleIdentifier: string;
  sku: string;
  title: string;
}

export interface FinancePeriodSummary {
  fiscalYear: number;
  fiscalPeriod: number;
  startDate: string | null;
  endDate: string | null;
  /** 'mismatch' when the stored rows disagreed with Apple's own totals */
  status: 'ok' | 'mismatch';
  detail: string | null;
  totals: FinanceAmount[];
  products: FinanceProduct[];
}

export type FinanceState = 'ok' | 'waiting' | 'no_access' | 'error';

export interface StoreFinanceSummary {
  state: FinanceState;
  /** One plain sentence for the status line */
  statusText: string;
  /** Newest first */
  periods: FinancePeriodSummary[];
  hasData: boolean;
}

/** How many fiscal periods the dashboard lists. */
export const FINANCE_PERIODS_SHOWN = 6;
/** An attempt older than this is not evidence of the key's current state. */
const RECENT_MS = 3 * 86_400_000;

const round2 = (n: number) => Math.round(n * 100) / 100;
const periodKey = (fy: number, p: number) => `${fy}-${p}`;
const periodName = (fy: number, p: number) => `FY${fy} P${p}`;

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function periodDates(p: { startDate: string | null; endDate: string | null }): string {
  return p.startDate && p.endDate ? `${shortDate(p.startDate)} – ${shortDate(p.endDate)}` : '';
}

export function summariseFinance(periods: FinancePeriodInput[], rows: FinanceRowInput[], now = new Date()): StoreFinanceSummary {
  const stored = periods
    .filter((p) => p.status === 'ok' || p.status === 'mismatch')
    .sort((a, b) => b.fiscal_year - a.fiscal_year || b.fiscal_period - a.fiscal_period)
    .slice(0, FINANCE_PERIODS_SHOWN);

  const byPeriod = new Map<string, FinanceRowInput[]>();
  for (const r of rows) {
    const k = periodKey(r.fiscal_year, r.fiscal_period);
    byPeriod.set(k, [...(byPeriod.get(k) ?? []), r]);
  }

  const summaries: FinancePeriodSummary[] = stored.map((p) => {
    const totals = new Map<string, FinanceAmount>();
    const products = new Map<string, FinanceProduct>();
    for (const r of byPeriod.get(periodKey(p.fiscal_year, p.fiscal_period)) ?? []) {
      const t = totals.get(r.partner_share_currency) ?? { currency: r.partner_share_currency, units: 0, proceeds: 0 };
      t.units += r.quantity;
      t.proceeds += Number(r.extended_partner_share);
      totals.set(r.partner_share_currency, t);

      const key = `${r.apple_identifier}|${r.sku}|${r.partner_share_currency}`;
      const prod = products.get(key) ?? { appleIdentifier: r.apple_identifier, sku: r.sku, title: r.title, currency: r.partner_share_currency, units: 0, proceeds: 0 };
      prod.units += r.quantity;
      prod.proceeds += Number(r.extended_partner_share);
      products.set(key, prod);
    }
    const tidy = <T extends FinanceAmount>(x: T): T => ({ ...x, proceeds: round2(x.proceeds) });
    return {
      fiscalYear: p.fiscal_year,
      fiscalPeriod: p.fiscal_period,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status === 'mismatch' ? 'mismatch' : 'ok',
      detail: p.detail,
      totals: [...totals.values()].map(tidy).sort((a, b) => a.currency.localeCompare(b.currency)),
      products: [...products.values()].map(tidy).sort((a, b) => b.proceeds - a.proceeds || a.title.localeCompare(b.title)),
    };
  });

  const recent = periods.filter((p) => now.getTime() - new Date(p.fetched_at).getTime() <= RECENT_MS);
  const noAccess = recent.find((p) => p.status === 'no_access');
  const failed = recent.find((p) => p.status === 'error');
  const latest = summaries[0];
  const last = latest ? `Last period fetched: ${periodName(latest.fiscalYear, latest.fiscalPeriod)}${periodDates(latest) ? ` (${periodDates(latest)})` : ''}.` : '';

  let state: FinanceState = latest ? 'ok' : 'waiting';
  let statusText = latest ? last : 'Waiting for Apple: no finance report has been published for the last few fiscal periods yet.';
  if (noAccess) {
    state = 'no_access';
    statusText = `The App Store Connect API key lacks Finance access (give it the Finance role). ${last}`.trim();
  } else if (failed) {
    state = 'error';
    statusText = `The last finance fetch failed: ${failed.detail ?? 'unknown error'}. ${last}`.trim();
  } else if (summaries.some((s) => s.status === 'mismatch')) {
    statusText += ' A period’s rows disagreed with Apple’s own totals; see below.';
  }

  return { state, statusText, periods: summaries, hasData: summaries.length > 0 };
}
