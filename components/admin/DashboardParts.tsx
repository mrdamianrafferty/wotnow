/**
 * Shared pieces for the /admin/dashboard panels: a section shell that shows
 * "not configured" or a source's error instead of zeros, a stat card and a
 * hand-rolled SVG sparkline. Pure presentation.
 */

import type { ReactNode } from 'react';
import type { Section, WeekMetric } from '@/lib/admin-dashboard/types';

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function money(n: number, currency: string): string {
  try {
    return n.toLocaleString('en-GB', { style: 'currency', currency, maximumFractionDigits: n >= 100 ? 0 : 2 });
  } catch {
    return `${fmt(n, 2)} ${currency}`;
  }
}

export function deltaText(m: WeekMetric, unit = ''): string {
  if (m.delta === null) return m.previous === 0 && m.value === 0 ? 'none either week' : 'none the week before';
  if (m.delta === 0) return 'same as the week before';
  return `${m.delta > 0 ? '▲' : '▼'} ${Math.abs(m.delta)}% on the week before (${fmt(m.previous)}${unit})`;
}

export function PanelHeading({ title, source }: { title: string; source: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      <span className="text-xs text-base-content/60">{source}</span>
    </div>
  );
}

/** Renders a section's data, or says plainly why there is none. */
export function SectionBody<T>({ section, children }: { section: Section<T>; children: (data: T) => ReactNode }) {
  if (section.state === 'ok') return <>{children(section.data)}</>;
  if (section.state === 'error') {
    return <div className="alert alert-warning mt-4 text-sm">Couldn’t read this source: {section.message}</div>;
  }
  return (
    <div className="mt-4 rounded-box border border-dashed border-base-300 px-4 py-5 text-sm text-base-content/70">
      <p className="font-medium text-base-content">Not configured</p>
      {section.hint ? <p className="mt-1">{section.hint}</p> : null}
      {section.missing.length > 0 ? (
        <p className="mt-1">
          Set {section.missing.map((m, i) => (
            <span key={m}>
              {i > 0 ? (i === section.missing.length - 1 ? ' and ' : ', ') : ''}
              <code className="text-xs">{m}</code>
            </span>
          ))}{' '}
          in Vercel production.
        </p>
      ) : null}
    </div>
  );
}

export function StatCard({ label, value, sub, children }: { label: string; value: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="card bg-base-100 border border-base-300 p-4 min-w-0">
      <h3 className="text-sm font-semibold text-base-content/80">{label}</h3>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub ? <p className="text-xs text-base-content/70 mt-0.5">{sub}</p> : null}
      {children}
    </div>
  );
}

/** Line sparkline, oldest first; the last 7 points drawn solid, the 7 before faint. */
export function Sparkline({ values, label, color }: { values: number[]; label: string; color?: string }) {
  if (values.length < 2) return null;
  const W = 140;
  const H = 32;
  const max = Math.max(1, ...values);
  const x = (i: number) => (i / (values.length - 1)) * W;
  const y = (v: number) => H - 1 - (v / max) * (H - 2);
  const path = (from: number, to: number) =>
    values
      .slice(from, to)
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${x(from + i).toFixed(1)},${y(v).toFixed(1)}`)
      .join(' ');
  const split = Math.max(0, values.length - 8);
  return (
    // A div, not <figure>: DaisyUI lays out any figure inside .card as a flex row.
    <div className="mt-2 text-primary" style={color ? { color } : undefined}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img" aria-label={`${label}, daily, last ${values.length} days`}>
        <path d={path(0, split + 1)} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <path d={path(split, values.length)} fill="none" stroke="currentColor" strokeWidth={2} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

/** A horizontal bar for share-of-total rows. */
export function ShareBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-base-200 overflow-hidden" aria-hidden>
      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}
