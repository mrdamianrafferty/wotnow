/**
 * /admin/dashboard — Go Daisy's store downloads, revenue, traffic and
 * platform health, all from GET /api/admin/metrics-summary.
 *
 * Each panel says "not configured" (naming the env vars) or shows its
 * source's error rather than zeros. Admins are the emails in
 * GODAISY_ADMIN_EMAILS; everyone else gets the API's 403.
 *
 * In development, ?sample=1 renders made-up figures without calling the API
 * (add &unconfigured=1 to see a panel's not-configured state).
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { StoreDownloads } from '@/components/admin/StoreDownloads';
import { RevenuePanel } from '@/components/admin/RevenuePanel';
import { AnalyticsPanel } from '@/components/admin/AnalyticsPanel';
import { PlatformHealthPanel } from '@/components/admin/PlatformHealthPanel';
import { PanelHeading, SectionBody } from '@/components/admin/DashboardParts';
import type { MetricsSummary } from '@/lib/admin-dashboard/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const [data, setData] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sample = process.env.NODE_ENV !== 'production' && router.query.sample === '1';

  useEffect(() => {
    if (!router.isReady) return;
    if (sample) {
      import('@/lib/admin-dashboard/sample').then((m) => setData(m.sampleMetrics(new Date(), { unconfigured: router.query.unconfigured === '1' })));
      return;
    }
    if (loading || !session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/metrics-summary', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await res.json().catch(() => ({}))) as MetricsSummary & { error?: string };
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? 'Could not load the dashboard');
      else setData(body);
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query.unconfigured, sample, loading, session]);

  const head = (
    <Head>
      <title>Dashboard — Go Daisy Admin</title>
      <meta name="robots" content="noindex" />
    </Head>
  );

  if (!sample && (loading || !user)) {
    return (
      <>
        {head}
        <div className="flex items-center justify-center min-h-screen bg-base-100 px-4">
          {loading ? (
            <span className="loading loading-spinner loading-lg text-primary" />
          ) : (
            <p className="text-base-content/60">
              <Link href="/login?returnTo=/admin/dashboard" className="link">
                Sign in
              </Link>{' '}
              to access admin tools.
            </p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <main className="max-w-5xl mx-auto px-4 py-8 bg-base-100 min-h-screen">
        <h1 className="text-2xl font-semibold">Go Daisy dashboard</h1>
        <p className="text-sm text-base-content/70 mt-1">
          Stores, revenue, traffic and errors. The stores report a day late, so their newest day is yesterday.
        </p>
        {sample ? <div className="alert alert-info mt-4 text-sm">Sample data, not real figures.</div> : null}
        {error ? <div className="alert alert-error mt-4">{error}</div> : null}
        {data === null && !error ? <span className="loading loading-spinner loading-md mt-6" /> : null}

        {data ? (
          <>
            <PanelHeading title="Store downloads" source="App Store Connect · Google Play" />
            <SectionBody section={data.storeDownloads}>{(d) => <StoreDownloads data={d} />}</SectionBody>
            <RevenuePanel revenue={data.revenue} />
            <AnalyticsPanel analytics={data.analytics} />
            <PlatformHealthPanel platformHealth={data.platformHealth} now={new Date(data.generatedAt)} />
            <p className="mt-10 text-xs text-base-content/50">Generated {new Date(data.generatedAt).toLocaleString('en-GB')}.</p>
          </>
        ) : null}
      </main>
    </>
  );
}
