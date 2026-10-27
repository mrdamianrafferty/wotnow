/**
 * Platform health panel for /admin/dashboard, from Sentry: error events over
 * the last 7 days against the 7 before, crash-free sessions and the most
 * frequent unresolved issues. Pure presentation.
 */

import type { Section, SentrySummary } from '@/lib/admin-dashboard/types';
import { PanelHeading, SectionBody, Sparkline, StatCard, deltaText, fmt } from './DashboardParts';

const LEVEL_BADGE: Record<string, string> = {
  fatal: 'badge-error',
  error: 'badge-error',
  warning: 'badge-warning',
  info: 'badge-info',
};

function ago(iso: string, now: Date): string {
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins)) return '';
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 48 * 60) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} days ago`;
}

export function PlatformHealthPanel({ platformHealth, now }: { platformHealth: Section<SentrySummary>; now: Date }) {
  return (
    <>
      <PanelHeading title="Platform health" source="Sentry · Go Daisy browser errors" />
      <SectionBody section={platformHealth}>
        {(d) => (
          <>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 mt-4">
              <StatCard label="Error events" value={fmt(d.errors.value)} sub={`last 7 days · ${deltaText(d.errors)}`}>
                <Sparkline values={d.errors.daily} label="Error events" />
              </StatCard>
              <StatCard
                label="Crash-free sessions"
                value={d.crashFreeRate === null ? '—' : `${d.crashFreeRate}%`}
                sub={d.crashFreeRate === null ? 'Sentry has no session data for this project' : 'last 14 days'}
              />
            </div>
            <div className="card bg-base-100 border border-base-300 p-4 mt-4 min-w-0">
              <h3 className="text-sm font-semibold text-base-content/80">Most frequent unresolved issues · 14 days</h3>
              {d.topIssues.length === 0 ? (
                <p className="mt-2 text-sm text-base-content/60">No unresolved issues.</p>
              ) : (
                <ul className="mt-2 divide-y divide-base-200">
                  {d.topIssues.map((issue) => (
                    <li key={issue.id} className="py-2 flex items-start gap-3">
                      <span className={`badge badge-sm shrink-0 mt-0.5 ${LEVEL_BADGE[issue.level] ?? 'badge-ghost'}`}>{issue.level}</span>
                      <div className="min-w-0 flex-1">
                        <a href={issue.permalink} target="_blank" rel="noreferrer" className="link link-hover text-sm break-words">
                          {issue.title}
                        </a>
                        <p className="text-xs text-base-content/60">
                          {fmt(issue.count)} events · last seen {ago(issue.lastSeen, now)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </SectionBody>
    </>
  );
}
