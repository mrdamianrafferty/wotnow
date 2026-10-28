/**
 * Revenue panel for /admin/dashboard: Go Daisy's in-app purchases as
 * RevenueCat reports them. Pure presentation.
 */

import type { RevenueFigure, RevenueSummary, Section } from '@/lib/admin-dashboard/types';
import { PanelHeading, SectionBody, StatCard, fmt, money } from './DashboardParts';

const orDash = (n: number | null, f: (n: number) => string) => (n === null ? '—' : f(n));
export const PROJECT_TOTAL_LABEL = 'project total (Go Daisy + Grow Daisy)';

export function RevenuePanel({ revenue }: { revenue: Section<RevenueSummary> }) {
  return (
    <>
      <PanelHeading title="Revenue" source="RevenueCat · Go Daisy app only" />
      <SectionBody section={revenue}>
        {(d) => {
          // A figure RevenueCat would not split per app says so, rather than passing as this app's
          const sub = (f: RevenueFigure, own?: string) => (d.projectTotal?.includes(f) ? PROJECT_TOTAL_LABEL : own);
          return (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 mt-4">
                <StatCard label="MRR" value={orDash(d.mrr, (n) => money(n, d.currency))} sub={sub('mrr', 'monthly recurring revenue')} />
                <StatCard label="Revenue" value={orDash(d.revenue28d, (n) => money(n, d.currency))} sub={sub('revenue28d', 'last 28 days')} />
                <StatCard
                  label="New customers"
                  value={orDash(d.newCustomers28d, fmt)}
                  sub={d.projectTotal?.includes('newCustomers28d') ? `last 28 days · ${PROJECT_TOTAL_LABEL}` : 'last 28 days'}
                />
                <StatCard label="Active subscriptions" value={orDash(d.activeSubscriptions, fmt)} sub={sub('activeSubscriptions')} />
                <StatCard label="Active trials" value={orDash(d.activeTrials, fmt)} sub={sub('activeTrials')} />
              </div>
              <p className="mt-2 text-xs text-base-content/60">Converted to {d.currency}. Grow Daisy shares the RevenueCat project and is filtered out.</p>
            </>
          );
        }}
      </SectionBody>
    </>
  );
}
