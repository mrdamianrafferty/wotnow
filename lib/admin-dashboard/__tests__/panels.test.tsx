/**
 * The dashboard panels render data, "not configured" and errors, never zeros
 * for a source they could not read.
 */

import { render, screen } from '@testing-library/react';
import { RevenuePanel } from '@/components/admin/RevenuePanel';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { PlatformHealthPanel } from '@/components/admin/PlatformHealthPanel';
import { StoreDownloads } from '@/components/admin/StoreDownloads';
import { sampleMetrics } from '../sample';

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
});
