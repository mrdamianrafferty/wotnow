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
import { useRouter } from 'next/router';
import { Inter, Manrope } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import { FamilyDashboard } from '@/components/admin/FamilyDashboard';
import s from '@/components/admin/FamilyDashboard.module.css';
import type { FamilySummary } from '@/lib/admin-dashboard/family';

// The Grewp Design System's pair, self-hosted by next/font for this page only
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], display: 'swap', variable: '--font-manrope' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '600', '700'], display: 'swap', variable: '--font-inter' });

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
            notice={sample ? <p className={`${s.banner} ${s.bannerInfo}`}>Sample data, not real figures.</p> : null}
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
