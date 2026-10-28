/**
 * The dashboard panels render data, "not configured" and errors, never zeros
 * for a source they could not read.
 */

import { render, screen } from '@testing-library/react';
import { RevenuePanel } from '@/components/admin/RevenuePanel';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { PlatformHealthPanel } from '@/components/admin/PlatformHealthPanel';
import { StoreDownloads } from '@/components/admin/StoreDownloads';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import { sampleMetrics } from '../sample';
import { sampleFamilySummary } from '../family-sample';
import { FAMILY_APPS, familyTotals, readAppSummary, unavailableSnapshot } from '../family';

const now = new Date('2026-10-27T07:00:00Z');

describe('admin dashboard panels', () => {
  const data = sampleMetrics(now);

  it('shows revenue figures', () => {
    render(<RevenuePanel revenue={data.revenue} />);
    expect(screen.getByText('£41.50')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });

  it('names the missing env vars when a source is not configured', () => {
    render(<AnalyticsPanel analytics={sampleMetrics(now, { unconfigured: true }).analytics} />);
    expect(screen.getByText('Not configured')).toBeInTheDocument();
    expect(screen.getByText('GA_PROPERTY_ID')).toBeInTheDocument();
    expect(screen.getByText('GOOGLE_ANALYTICS_CREDENTIALS')).toBeInTheDocument();
  });

  it('shows a source’s error instead of numbers', () => {
    render(<RevenuePanel revenue={{ state: 'error', message: 'RevenueCat mrr chart 500' }} />);
    expect(screen.getByText(/RevenueCat mrr chart 500/)).toBeInTheDocument();
    expect(screen.queryByText('MRR')).not.toBeInTheDocument();
  });

  it('shows traffic', () => {
    render(<AnalyticsPanel analytics={data.analytics} />);
    expect(screen.getByText('Organic Search')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
  });

  it('lists Sentry issues', () => {
    render(<PlatformHealthPanel platformHealth={data.platformHealth} now={now} />);
    expect(screen.getByText('99.42%')).toBeInTheDocument();
    expect(screen.getByText(/ChunkLoadError/)).toBeInTheDocument();
  });

  it('shows both stores', () => {
    if (data.storeDownloads.state !== 'ok') throw new Error('sample store data missing');
    render(<StoreDownloads data={data.storeDownloads.data} />);
    expect(screen.getByText('iOS · App Store')).toBeInTheDocument();
    expect(screen.getByText('Android · Google Play')).toBeInTheDocument();
  });

  it('shows every app in the family, with derived attention items and the audience', () => {
    render(<FamilyDashboard data={sampleFamilySummary(now)} />);
    for (const name of ['Go Daisy', 'Rise Daisy', 'Findr', 'Fly Cast', 'Grewp']) expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    expect(screen.getByText('Errors up 92% in a week')).toBeInTheDocument();
    expect(screen.getByText('Likely automated traffic from Singapore')).toBeInTheDocument();
    expect(screen.getByText('likely automated')).toBeInTheDocument();
    // Headline active users: raw beside the adjusted figure
    expect(screen.getByText('Raw 1,945 → 1,282 adjusted · Singapore excluded')).toBeInTheDocument();
    expect(screen.getByText(/GA4 returned no age or gender rows for any of the 7 apps/)).toBeInTheDocument();
    expect(screen.getByText('6 things need attention')).toBeInTheDocument();
  });

  it('shows an app that did not answer, in its card and in Needs attention', () => {
    const data = sampleFamilySummary(now);
    const apps = data.apps.map((a) => (a.id === 'findr' ? unavailableSnapshot(a, 'unavailable', 'No answer within 8 s') : a));
    render(<FamilyDashboard data={{ ...data, apps, totals: familyTotals(apps) }} />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByText('Didn’t answer')).toBeInTheDocument();
    expect(screen.getAllByText('No answer within 8 s')).toHaveLength(2);
  });

  it('says plainly when nothing needs attention', () => {
    const apps = FAMILY_APPS.map((a) =>
      readAppSummary(a, {
        storeDownloads: { state: 'ok', data: { ios: { week: 3, previousWeek: 2 }, android: { week: 1, previousWeek: 1 }, hasData: true, countries30d: [] } },
        revenue: { state: 'ok', data: { source: 'revenuecat', currency: 'GBP', mrr: 1 } },
        analytics: { state: 'ok', data: { activeUsers: { value: 100, previous: 90 } } },
        platformHealth: { state: 'ok', data: { errors: { value: 4, previous: 4 }, crashFreeRate: 99.9, topIssues: [] } },
      }),
    );
    render(<FamilyDashboard data={{ generatedAt: now.toISOString(), apps, totals: familyTotals(apps) }} />);
    expect(screen.getByText(/^Nothing needs attention/)).toBeInTheDocument();
    expect(screen.getByText('All clear')).toBeInTheDocument();
    expect(screen.getAllByText(/No app reports its audience yet/)).toHaveLength(2);
  });

  it('shows when each card was fetched, and a Refresh that waits out the cooldown', () => {
    const data = sampleFamilySummary(now);
    const apps = data.apps.map((a) => ({ ...a, fetchedAt: '2026-10-27T06:12:00Z' }));
    const later = new Date(Date.now() + 4 * 60_000).toISOString();
    const onRefresh = jest.fn();
    const { rerender } = render(<FamilyDashboard data={{ ...data, apps }} refresh={{ onRefresh, refreshing: false }} />);
    expect(screen.getAllByText(/^as of \d\d:\d\d$/)).toHaveLength(apps.length);
    screen.getByRole('button', { name: 'Refresh' }).click();
    expect(onRefresh).toHaveBeenCalled();
    rerender(<FamilyDashboard data={{ ...data, apps, refresh: { refreshed: true, nextRefreshAt: later } }} refresh={{ onRefresh, refreshing: false }} />);
    expect(screen.getByRole('button', { name: /^Refresh after/ })).toBeDisabled();
  });

  it('labels a revenue figure that is the shared RevenueCat project’s total', () => {
    render(
      <RevenuePanel
        revenue={{
          state: 'ok',
          data: { source: 'revenuecat', currency: 'GBP', mrr: 1, revenue28d: 2, activeSubscriptions: 1, activeTrials: 0, newCustomers28d: 4, projectTotal: ['newCustomers28d'] },
        }}
      />,
    );
    expect(screen.getByText('last 28 days · project total (Go Daisy + Grow Daisy)')).toBeInTheDocument();
  });
});

describe('family dashboard: App Store listing', () => {
  it('shows each app’s conversion and the family rate weighted by views', () => {
    const data = sampleFamilySummary(now);
    // Grewp as it is until grewp#517 deploys: no storeListing key
    const apps = data.apps.map((a) => (a.id === 'grewp' ? readAppSummary(FAMILY_APPS.find((f) => f.id === 'grewp')!, { generatedAt: data.generatedAt }) : a));
    const totals = familyTotals(apps);
    render(<FamilyDashboard data={{ ...data, apps, totals }} />);
    expect(screen.getByText('App Store conversion')).toBeInTheDocument();
    expect(screen.getByText(`${totals.storeListing!.conversionRate!.toFixed(1)}%`)).toBeInTheDocument();
    // Six apps send it; the one that does not says so rather than showing 0%
    expect(screen.getAllByText(/% convert$/)).toHaveLength(6);
    expect(screen.getAllByText('Not reported by this app').length).toBeGreaterThanOrEqual(1);
  });

  it('reads quietly while Apple’s first report has not landed', () => {
    render(<FamilyDashboard data={sampleFamilySummary(now, { listingWaiting: true })} />);
    expect(screen.getByText('Waiting for Apple’s first reports')).toBeInTheDocument();
    expect(screen.getByText('7 apps set up, no report synced yet')).toBeInTheDocument();
    expect(screen.getAllByText(/^Waiting for Apple’s first report\./)).toHaveLength(7);
    expect(screen.queryByText(/% convert$/)).toBeNull();
  });
});
