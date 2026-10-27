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
    expect(screen.getByText('Singapore traffic looks automated')).toBeInTheDocument();
    expect(screen.getByText('likely automated')).toBeInTheDocument();
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
});
