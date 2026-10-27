/**
 * Web traffic panel for /admin/dashboard, from GA4: users, new users, page
 * views and engagement (last 7 days against the 7 before), top pages,
 * channels and devices. Pure presentation.
 */

import type { Ga4Summary, Section } from '@/lib/admin-dashboard/types';
import { PanelHeading, SectionBody, ShareBar, Sparkline, StatCard, deltaText, fmt } from './DashboardParts';

function Body({ d }: { d: Ga4Summary }) {
  return (
    <>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mt-4">
        <StatCard label="Active users" value={fmt(d.activeUsers.value)} sub={deltaText(d.activeUsers)}>
          <Sparkline values={d.activeUsers.daily} label="Active users" />
        </StatCard>
        <StatCard label="New users" value={fmt(d.newUsers.value)} sub={deltaText(d.newUsers)}>
          <Sparkline values={d.newUsers.daily} label="New users" />
        </StatCard>
        <StatCard label="Page views" value={fmt(d.pageViews.value)} sub={deltaText(d.pageViews)}>
          <Sparkline values={d.pageViews.daily} label="Page views" />
        </StatCard>
        <StatCard
          label="Engagement rate"
          value={`${d.engagementRate.value}%`}
          sub={`${d.engagementRate.previous}% the week before · engaged sessions ÷ sessions`}
        />
      </div>
      <p className="mt-2 text-xs text-base-content/60">Last 7 complete days against the 7 before. Faint line: the earlier week.</p>

      <div className="grid gap-4 md:grid-cols-2 mt-4">
        <div className="card bg-base-100 border border-base-300 p-4 min-w-0">
          <h3 className="text-sm font-semibold text-base-content/80">Top pages · 28 days</h3>
          <div className="overflow-x-auto">
            <table className="table table-xs mt-2">
              <tbody>
                {d.topPages.map((p) => (
                  <tr key={p.path}>
                    <td className="max-w-[16rem] truncate" title={p.path}>
                      {p.path}
                    </td>
                    <td className="text-right tabular-nums">{fmt(p.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 min-w-0">
          <h3 className="text-sm font-semibold text-base-content/80">Channels · 28 days</h3>
          <div className="overflow-x-auto">
            <table className="table table-xs mt-2">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th className="text-right">Users</th>
                  <th className="text-right">Sessions</th>
                  <th className="text-right">Engaged</th>
                </tr>
              </thead>
              <tbody>
                {d.channels.map((c) => (
                  <tr key={c.channel}>
                    <td>{c.channel}</td>
                    <td className="text-right tabular-nums">{fmt(c.users)}</td>
                    <td className="text-right tabular-nums">{fmt(c.sessions)}</td>
                    <td className="text-right tabular-nums">{c.engagementRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card bg-base-100 border border-base-300 p-4 min-w-0">
          <h3 className="text-sm font-semibold text-base-content/80">Devices · 28 days</h3>
          <ul className="mt-3 space-y-2">
            {d.devices.map((dev) => (
              <li key={dev.device}>
                <div className="flex justify-between text-sm">
                  <span>{dev.device}</span>
                  <span className="tabular-nums text-base-content/70">
                    {fmt(dev.users)} · {dev.percent}%
                  </span>
                </div>
                <ShareBar percent={dev.percent} />
              </li>
            ))}
          </ul>
        </div>

      </div>
    </>
  );
}

export function AnalyticsPanel({ analytics }: { analytics: Section<Ga4Summary> }) {
  return (
    <>
      <PanelHeading title="Traffic" source="Google Analytics 4 · godaisy.io, web and iOS app" />
      <SectionBody section={analytics}>{(d) => <Body d={d} />}</SectionBody>
    </>
  );
}
