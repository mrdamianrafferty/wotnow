/**
 * /admin/apps: family totals, each app's share of this week's downloads, and
 * one card per app with downloads, revenue, users and health. Pure
 * presentation of a FamilySummary. A part an app could not report says why
 * in place, in small type, rather than showing a zero.
 */

import type { ReactNode } from 'react';
import type { AppSnapshot, FamilySummary, FamilyTotals, Part, Trend } from '@/lib/admin-dashboard/family';
import { Sparkline, StatCard, fmt, money } from './DashboardParts';

function change(t: Trend): string {
  if (t.delta === null) return t.value === 0 ? 'none either week' : 'none the week before';
  if (t.delta === 0) return 'same as the week before';
  return `${t.delta > 0 ? '▲' : '▼'} ${Math.abs(t.delta)}% on the week before`;
}

const of5 = (n: number, total: number) => (n === total ? '' : ` · ${n} of ${total} apps`);

function Totals({ totals, appCount }: { totals: FamilyTotals; appCount: number }) {
  const subs = totals.activeSubscriptions;
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mt-4">
      <StatCard label="Downloads · 7 days" value={fmt(totals.downloads.value)} sub={`${change(totals.downloads)}${of5(totals.downloads.apps, appCount)}`}>
        <Sparkline values={totals.downloads.daily} label="Family downloads" />
      </StatCard>
      <StatCard
        label="MRR"
        value={totals.mrr.length === 0 ? '—' : money(totals.mrr[0].value, totals.mrr[0].currency)}
        sub={
          totals.mrr.length > 1
            ? `+ ${totals.mrr.slice(1).map((m) => money(m.value, m.currency)).join(' + ')} (not converted)`
            : totals.mrr.length === 1
              ? `${totals.mrr[0].apps} of ${appCount} apps`
              : 'no app reporting'
        }
      />
      <StatCard
        label="Subscriptions"
        value={subs.apps === 0 ? '—' : fmt(subs.value)}
        sub={subs.apps === 0 ? 'no app reporting' : `${fmt(totals.activeTrials.value)} in trial${of5(subs.apps, appCount)}`}
      />
      <StatCard
        label="Active users · 7 days"
        value={totals.activeUsers.apps === 0 ? '—' : fmt(totals.activeUsers.value)}
        sub={totals.activeUsers.apps === 0 ? 'no app reporting' : `${change(totals.activeUsers)} · summed per app${of5(totals.activeUsers.apps, appCount)}`}
      >
        <Sparkline values={totals.activeUsers.daily} label="Family active users" />
      </StatCard>
      <StatCard
        label="Error events · 7 days"
        value={totals.errors.apps === 0 ? '—' : fmt(totals.errors.value)}
        sub={totals.errors.apps === 0 ? 'no app reporting' : `${change(totals.errors)}${of5(totals.errors.apps, appCount)}`}
      />
    </div>
  );
}

function DownloadShare({ share }: { share: FamilyTotals['downloadShare'] }) {
  const total = share.reduce((a, s) => a + s.value, 0);
  if (total === 0) return null;
  return (
    <div className="mt-4">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-base-200" role="img" aria-label="Share of this week's downloads by app">
        {share.map((s) => (
          <div key={s.id} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.name}: ${fmt(s.value)}`} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/70">
        {share.map((s) => (
          <li key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.name} {Math.round((s.value / total) * 100)}%
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Why a part has no figures, in one short line. */
function Missing({ part }: { part: Exclude<Part<unknown>, { state: 'ok' }> }) {
  if (part.state === 'error') return <p className="text-xs text-error">Error: {part.message}</p>;
  const text = part.note ?? (part.missing.length ? `Not configured (${part.missing.join(', ')})` : 'Not configured');
  return <p className="text-xs text-base-content/50 break-words">{text}</p>;
}

function Row<T>({ label, part, children }: { label: string; part: Part<T>; children: (d: T) => ReactNode }) {
  return (
    <div className="py-2.5 border-t border-base-200 first:border-t-0">
      <p className="text-xs font-medium uppercase tracking-wide text-base-content/60">{label}</p>
      <div className="mt-0.5">{part.state === 'ok' ? children(part.data) : <Missing part={part} />}</div>
    </div>
  );
}

const Big = ({ children }: { children: ReactNode }) => <span className="text-lg font-semibold tabular-nums">{children}</span>;
const Small = ({ children }: { children: ReactNode }) => <span className="text-xs text-base-content/70">{children}</span>;

function AppCard({ app }: { app: AppSnapshot }) {
  const badge =
    app.status === 'ok' ? null : (
      <span className={`badge badge-sm ${app.status === 'unavailable' ? 'badge-warning' : 'badge-ghost'}`}>
        {app.status === 'unavailable' ? 'Unavailable' : 'Not connected'}
      </span>
    );
  return (
    // rounded-box, not .card: styles force .card padding with !important below 640px, which would inset the colour bar
    <div className="rounded-box bg-base-100 border border-base-300 overflow-hidden min-w-0">
      <div className="h-1.5" style={{ background: app.color }} aria-hidden />
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: app.color }} aria-hidden />
            {app.name}
          </h2>
          {badge}
        </div>

        {app.status !== 'ok' ? (
          <div className="mt-3 text-sm text-base-content/70">
            <p>{app.message}</p>
            {app.missing?.length ? (
              <p className="mt-1 text-xs">
                Set {app.missing.map((m) => <code key={m} className="mr-1 break-all">{m}</code>)}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="mt-2">
            <Row label="Downloads · 7 days" part={app.downloads}>
              {(d) => (
                <>
                  <Big>{fmt(d.total.value)}</Big> <Small>{change(d.total)}</Small>
                  <p className="text-xs text-base-content/70">
                    iOS {d.ios ? fmt(d.ios.value) : '—'} · Android {d.android ? fmt(d.android.value) : '—'}
                  </p>
                  <Sparkline values={d.total.daily} label={`${app.name} downloads`} color={app.color} />
                </>
              )}
            </Row>
            <Row label={`Revenue${app.revenue.state === 'ok' && app.revenue.data.source !== 'unknown' ? ` · ${app.revenue.data.source === 'revenuecat' ? 'RevenueCat' : app.revenue.data.source === 'stripe' ? 'Stripe' : app.revenue.data.source}` : ''}`} part={app.revenue}>
              {(d) => (
                <>
                  <Big>{d.mrr === null || !d.currency ? '—' : money(d.mrr, d.currency)}</Big> <Small>MRR</Small>
                  <p className="text-xs text-base-content/70">
                    {d.activeSubscriptions === null ? '—' : fmt(d.activeSubscriptions)} subscriptions · {d.activeTrials === null ? '—' : fmt(d.activeTrials)} trials
                    {d.revenue28d !== null && d.currency ? ` · ${money(d.revenue28d, d.currency)} in 28 days` : ''}
                  </p>
                </>
              )}
            </Row>
            <Row label="Active users · 7 days" part={app.analytics}>
              {(d) =>
                d.activeUsers ? (
                  <>
                    <Big>{fmt(d.activeUsers.value)}</Big> <Small>{change(d.activeUsers)}</Small>
                    {d.sessions ? <p className="text-xs text-base-content/70">{fmt(d.sessions.value)} sessions</p> : null}
                    {!d.sessions && d.pageViews ? <p className="text-xs text-base-content/70">{fmt(d.pageViews.value)} page views</p> : null}
                  </>
                ) : (
                  <Small>No user count reported</Small>
                )
              }
            </Row>
            <Row label="Health · Sentry" part={app.health}>
              {(d) => (
                <>
                  <Big>{d.errors ? fmt(d.errors.value) : '—'}</Big> <Small>errors{d.errors ? `, ${change(d.errors)}` : ''}</Small>
                  <p className="text-xs text-base-content/70">
                    {d.crashFreeRate === null ? 'no crash-free data' : `${d.crashFreeRate}% crash-free`} · {d.topIssues} open issue{d.topIssues === 1 ? '' : 's'} in its top list
                  </p>
                </>
              )}
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}

export function FamilyDashboard({ data }: { data: FamilySummary }) {
  return (
    <>
      <Totals totals={data.totals} appCount={data.apps.length} />
      <DownloadShare share={data.totals.downloadShare} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 items-start mt-6">
        {data.apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </>
  );
}
