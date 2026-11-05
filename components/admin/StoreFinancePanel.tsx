/**
 * App Store finance panel for /admin/dashboard: what Apple paid the vendor
 * account per fiscal period, and per product within it, from the finance
 * reports. Partner share stays in the currency Apple settled it in. Pure
 * presentation.
 *
 * Not the "App Store conversion" tile: that one reads Analytics Reports
 * (listing views), a separate Apple pipeline.
 */

import { periodDates, type StoreFinanceSummary } from '@/lib/store-stats/finance-summary';
import type { Section } from '@/lib/admin-dashboard/types';
import { PanelHeading, SectionBody, fmt, money } from './DashboardParts';

const STATE_CLASS: Record<StoreFinanceSummary['state'], string> = {
  ok: 'text-base-content/70',
  waiting: 'text-base-content/70',
  no_access: 'alert alert-warning',
  error: 'alert alert-warning',
};

export function StoreFinancePanel({ finance }: { finance: Section<StoreFinanceSummary> | undefined }) {
  if (!finance) return null;
  return (
    <>
      <PanelHeading title="App Store proceeds" source="App Store Connect finance reports · whole vendor account" />
      <SectionBody section={finance}>
        {(d) => (
          <>
            <p className={`mt-3 text-sm ${STATE_CLASS[d.state]}`}>{d.statusText}</p>
            {d.periods.map((p) => (
              <div key={`${p.fiscalYear}-${p.fiscalPeriod}`} className="card bg-base-100 border border-base-300 p-4 mt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="text-sm font-semibold text-base-content/80">
                    FY{p.fiscalYear} period {p.fiscalPeriod}
                    {periodDates(p) ? <span className="font-normal text-base-content/60"> · {periodDates(p)}</span> : null}
                  </h3>
                  <span className="text-lg font-semibold tabular-nums">
                    {p.totals.length ? p.totals.map((t) => money(t.proceeds, t.currency)).join(' + ') : '—'}
                  </span>
                </div>
                {p.status === 'mismatch' ? <p className="text-xs text-warning mt-1">Rows did not match Apple’s totals: {p.detail}</p> : null}
                <div className="overflow-x-auto">
                  <table className="table table-xs mt-2">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th className="text-right">Units</th>
                        <th className="text-right">Partner share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.products.map((x) => (
                        <tr key={`${x.appleIdentifier}|${x.sku}|${x.currency}`}>
                          <td>
                            {x.title || x.sku}
                            <span className="text-base-content/50"> · {x.sku}</span>
                          </td>
                          <td className="text-right tabular-nums">{fmt(x.units)}</td>
                          <td className="text-right tabular-nums">{money(x.proceeds, x.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="mt-2 text-xs text-base-content/60">
              Partner share is what Apple pays out after its commission and tax, in the currency it settles in; currencies are not converted. Refunds count as negative units and amounts.
            </p>
          </>
        )}
      </SectionBody>
    </>
  );
}
