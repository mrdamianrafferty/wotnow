/**
 * /admin/apps — the family dashboard: Go Daisy, Rise Daisy, Findr, Fly Cast
 * and Grewp side by side, from GET /api/admin/apps-summary, which asks each
 * app's metrics-summary endpoint server-side. Same admins as
 * /admin/dashboard (GODAISY_ADMIN_EMAILS).
 *
 * In development, ?sample=1 renders made-up figures for all five apps.
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import type { FamilySummary } from '@/lib/admin-dashboard/family';

export default function AdminAppsPage() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const [data, setData] = useState<FamilySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sample = process.env.NODE_ENV !== 'production' && router.query.sample === '1';

  useEffect(() => {
    if (!router.isReady) return;
    if (sample) {
      import('@/lib/admin-dashboard/family-sample').then((m) => setData(m.sampleFamilySummary()));
      return;
    }
    if (loading || !session) return;
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/admin/apps-summary', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const body = (await res.json().catch(() => ({}))) as FamilySummary & { error?: string };
      if (cancelled) return;
      if (!res.ok) setError(body.error ?? 'Could not load the family dashboard');
      else setData(body);
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, sample, loading, session]);

  const head = (
    <Head>
      <title>All apps — Daisy family admin</title>
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
            <p className="text-base-content/60">Sign in to access admin tools.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <main className="max-w-6xl mx-auto px-4 py-8 bg-base-100 min-h-screen">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h1 className="text-2xl font-semibold">All apps</h1>
          <Link href="/admin/dashboard" className="link link-hover text-sm">
            Go Daisy in detail →
          </Link>
        </div>
        <p className="text-sm text-base-content/70 mt-1">
          The last 7 complete days against the 7 before. Each app reports its own figures; a card says so when one could not.
        </p>
        {sample ? <div className="alert alert-info mt-4 text-sm">Sample data, not real figures.</div> : null}
        {error ? <div className="alert alert-error mt-4">{error}</div> : null}
        {data === null && !error ? <span className="loading loading-spinner loading-md mt-6" /> : null}

        {data ? (
          <>
            <FamilyDashboard data={data} />
            <p className="mt-8 text-xs text-base-content/50">Generated {new Date(data.generatedAt).toLocaleString('en-GB')}.</p>
          </>
        ) : null}
      </main>
    </>
  );
}
