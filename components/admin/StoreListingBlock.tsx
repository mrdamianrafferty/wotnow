/**
 * One app card's App Store listing conversion: product-page views → first-time
 * downloads from the page, over 28 complete days ending three days back, with
 * the change on the 28 days before. Rendered inside AppCard (FamilyDashboard.tsx)
 * from AppSnapshot.storeListing (family.ts).
 *
 * Until Apple's first report instance lands every app is "waiting", which is
 * expected rather than wrong, so it reads as a quiet note, not an alarm.
 */

import { listingWaiting, type AppSnapshot, type ListingFigures } from '@/lib/admin-dashboard/family';
import { fmt } from './DashboardParts';
import base from './FamilyDashboard.module.css';
import s from './AppFunnel.module.css';

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "4.2%", or "—" with no views. */
export const rateText = (r: number | null) => (r === null ? '—' : `${fmt(r, 1)}%`);

/** Conversion change in percentage points: "▲ 0.8 pts", "Same", or null when either window has no rate. */
export function pointsChange(cur: number | null, prev: number | null | undefined): string | null {
  if (cur === null || prev === null || prev === undefined) return null;
  const d = Math.round((cur - prev) * 10) / 10;
  return d === 0 ? 'Same' : `${d > 0 ? '▲' : '▼'} ${fmt(Math.abs(d), 1)} pts`;
}

/** Views change as a percentage: "▼ 20%", or null when there were none before. */
function viewsChange(cur: ListingFigures, prev: ListingFigures | null): string | null {
  if (!prev || prev.productPageViews === 0) return null;
  const d = Math.round(((cur.productPageViews - prev.productPageViews) / prev.productPageViews) * 100);
  return d === 0 ? 'views same' : `views ${d > 0 ? '▲' : '▼'} ${Math.abs(d)}%`;
}

/** Why there is no figure, in one quiet sentence. */
export function listingReason(p: AppSnapshot['storeListing']): string {
  if (!p) return 'Not reported by this app';
  if (p.state === 'error') return `Error: ${p.message}`;
  if (p.state === 'ok') return '';
  if (listingWaiting(p)) return 'Waiting for Apple’s first report. Credentials are set; the daily sync picks it up when it lands.';
  if (p.missing.length) return `Not connected: set ${p.missing.join(', ')}`;
  return p.note ?? 'Not reported';
}

export function StoreListingBlock({ app }: { app: AppSnapshot }) {
  const p = app.storeListing;
  const d = p?.state === 'ok' ? p.data : null;
  const change = d ? [pointsChange(d.totals.conversionRate, d.previous?.conversionRate), viewsChange(d.totals, d.previous)].filter(Boolean).join(' · ') : '';

  return (
    <div className={s.block}>
      <div className={base.compareHead}>
        <span className={base.chipsLabel}>App Store listing</span>
        <span className={base.num} title="First-time downloads from the product page ÷ product-page views">
          {d ? `${rateText(d.totals.conversionRate)} convert` : '—'}
        </span>
      </div>
      {d ? (
        <>
          <p className={base.small}>
            <span className={base.num}>
              {fmt(d.totals.productPageViews)} page views → {fmt(d.totals.productPageDownloads)} downloads
            </span>{' '}
            · {fmt(d.totals.firstTimeDownloads)} first-time in all
            {d.window ? `, ${d.window.days} d to ${shortDate(d.window.to)}` : ''}
          </p>
          {change ? <p className={base.small}>{change} on the {d.window?.days ?? 28} days before</p> : null}
        </>
      ) : (
        <p className={s.note}>{listingReason(p)}</p>
      )}
    </div>
  );
}
