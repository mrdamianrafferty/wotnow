/**
 * Store downloads panel for /admin/dashboard: one card per platform with the
 * 7-day total against the week before, a 14-day bar strip, the 30-day total
 * and the top countries. Pure presentation; the page fetches the summary.
 */

import type { PlatformDownloads, StoreDownloadsSummary } from '@/lib/store-stats/summary';

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en-GB'], { type: 'region' }) : null;

function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

const fmt = (n: number) => n.toLocaleString('en-GB');

function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function deltaText(p: PlatformDownloads): string {
  if (p.delta === null) return p.week > 0 ? 'none the week before' : 'none the week before either';
  if (p.delta === 0) return 'same as the week before';
  return `${p.delta > 0 ? '▲' : '▼'} ${Math.abs(p.delta)}% on the week before (${fmt(p.previousWeek)})`;
}

const BAR_W = 14;
const GAP = 4;
const CHART_H = 56;

/** 14 daily bars, oldest first, the second week darker. Hover a bar for its day. */
function DailyBars({ days, label }: { days: PlatformDownloads['sparkline']; label: string }) {
  const peak = Math.max(0, ...days.map((d) => d.downloads));
  const max = Math.max(1, peak);
  const width = days.length * (BAR_W + GAP) - GAP;
  return (
    // A div, not <figure>: DaisyUI lays out any figure inside .card as a flex row.
    <div className="mt-3">
      <svg viewBox={`0 0 ${width} ${CHART_H + 1}`} width="100%" height={CHART_H + 1} role="img" aria-label={`${label}, daily, last 14 days`} preserveAspectRatio="none" className="text-primary">
        {days.map((d, i) => {
          const h = d.downloads === 0 ? 0 : Math.max(2, (d.downloads / max) * CHART_H);
          const x = i * (BAR_W + GAP);
          return (
            <g key={d.date}>
              <title>{`${shortDate(d.date)}: ${fmt(d.downloads)}`}</title>
              {/* Full-height hit target, bigger than the bar */}
              <rect x={x} y={0} width={BAR_W} height={CHART_H} fill="transparent" />
              {h > 0 ? <rect x={x} y={CHART_H - h} width={BAR_W} height={h} rx={2} fill="currentColor" opacity={i < 7 ? 0.45 : 1} /> : null}
            </g>
          );
        })}
        <line x1={0} x2={width} y1={CHART_H + 0.5} y2={CHART_H + 0.5} stroke="currentColor" strokeOpacity={0.2} className="text-base-content" />
      </svg>
      <div className="flex justify-between gap-2 text-xs text-base-content/60 mt-1">
        <span>{shortDate(days[0].date)}</span>
        <span>Darker: last 7 days · busiest {fmt(peak)}</span>
        <span>{shortDate(days[days.length - 1].date)}</span>
      </div>
    </div>
  );
}

function PlatformCard({ title, platform, extra }: { title: string; platform: PlatformDownloads; extra: string }) {
  return (
    <div className="card bg-base-100 border border-base-300 p-4">
      <h2 className="text-sm font-semibold text-base-content/80">{title}</h2>
      <p className="mt-2">
        <span className="text-3xl font-semibold tabular-nums">{fmt(platform.week)}</span>{' '}
        <span className="text-sm text-base-content/70">in the last 7 days</span>
      </p>
      <p className="text-sm text-base-content/70">{deltaText(platform)}</p>
      <DailyBars days={platform.sparkline} label={title} />
      <p className="text-sm text-base-content/70 mt-3">
        <span className="font-semibold text-base-content tabular-nums">{fmt(platform.total30d)}</span> in the last 30 days · {extra}
      </p>
      {platform.topCountries.length > 0 ? (
        <table className="table table-xs mt-2">
          <thead>
            <tr>
              <th>Top countries, 30 days</th>
              <th className="text-right">Downloads</th>
            </tr>
          </thead>
          <tbody>
            {platform.topCountries.map((c) => (
              <tr key={c.country}>
                <td>{countryName(c.country)}</td>
                <td className="text-right tabular-nums">{fmt(c.downloads)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function StoreDownloads({ data }: { data: StoreDownloadsSummary }) {
  if (!data.hasData) {
    return (
      <p className="mt-6 rounded-box border border-dashed border-base-300 px-4 py-6 text-center text-sm text-base-content/60">
        No store data yet. Add the App Store Connect and Google Play report credentials, then the daily sync fills this in.
      </p>
    );
  }
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 mt-6">
        <PlatformCard title="iOS · App Store" platform={data.ios} extra={`${fmt(data.ios.redownloads30d)} re-downloads`} />
        <PlatformCard title="Android · Google Play" platform={data.android} extra={`${fmt(data.android.uninstalls7d)} uninstalls this week`} />
      </div>
      {data.latestDate ? <p className="mt-3 text-xs text-base-content/60">Latest store data: {shortDate(data.latestDate)}.</p> : null}
    </>
  );
}
