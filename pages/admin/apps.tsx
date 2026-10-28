/**
 * /admin/apps — the family dashboard: Go Daisy, Rise Daisy, Findr, Fly Cast
 * and Grewp side by side, from GET /api/admin/apps-summary, which asks each
 * app's metrics-summary endpoint server-side. Same admins as
 * /admin/dashboard (GODAISY_ADMIN_EMAILS).
 *
 * In development, ?sample=1 renders made-up figures for all five apps.
 */

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Inter, Manrope } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import s from '@/components/admin/FamilyDashboard.module.css';
import type { FamilySummary } from '@/lib/admin-dashboard/family';

// The Grewp Design System's pair, self-hosted by next/font for this page only
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--font-manrope' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-inter' });

async function load(accessToken: string, refresh = false): Promise<{ data: FamilySummary } | { error: string }> {
  const res = await fetch(`/api/admin/apps-summary${refresh ? '?refresh=1' : ''}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const body = (await res.json().catch(() => ({}))) as FamilySummary & { error?: string };
  return res.ok ? { data: body } : { error: body.error ?? 'Could not load the family dashboard' };
}

export default function AdminAppsPage() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const [data, setData] = useState<FamilySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const sample = process.env.NODE_ENV !== 'production' && router.query.sample === '1';

  useEffect(() => {
    if (!router.isReady) return;
    if (sample) {
      import('@/lib/admin-dashboard/family-sample').then((m) => setData(m.sampleFamilySummary(new Date(), { withVercel: true })));
      return;
    }
    if (loading || !session) return;
    let cancelled = false;
    load(session.access_token).then((r) => {
      if (cancelled) return;
      if ('error' in r) setError(r.error);
      else setData(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, [router.isReady, sample, loading, session]);

  // Refresh keeps the current figures on screen until the new ones arrive
  const onRefresh = useCallback(async () => {
    if (!session) return;
    setRefreshing(true);
    const r = await load(session.access_token, true);
    setRefreshing(false);
    if ('error' in r) setError(r.error);
    else {
      setError(null);
      setData(r.data);
    }
  }, [session]);

  const head = (
    <Head>
      <title>All apps — Daisy family admin</title>
      <meta name="robots" content="noindex" />
    </Head>
  );

  const root = `${s.root} ${manrope.variable} ${inter.variable}`;

  if (!sample && (loading || !user)) {
    return (
      <>
        {head}
        <div className={`${root} ${s.center}`}>
          {loading ? <span className="loading loading-spinner loading-lg" /> : <p className={s.meta}>Sign in to access admin tools.</p>}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className={root}>
        {data ? (
          <FamilyDashboard
            data={data}
            notice={
              sample ? (
                <p className={`${s.banner} ${s.bannerInfo}`}>Sample data, not real figures.</p>
              ) : error ? (
                <p className={`${s.banner} ${s.bannerError}`}>{error}</p>
              ) : null
            }
            refresh={sample ? undefined : { onRefresh, refreshing }}
          />
        ) : (
          <div className={s.center}>
            {error ? <p className={`${s.banner} ${s.bannerError}`}>{error}</p> : <span className="loading loading-spinner loading-md" />}
          </div>
        )}
      </div>
    </>
  );
}
