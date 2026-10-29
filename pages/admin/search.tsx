/**
 * /admin/search — Search Console beyond the family dashboard's top five: per
 * site, the pages worth rewriting first, the top pages and queries, the
 * queries behind one page, and an indexing check on a sample of its sitemap.
 * Same admins as /admin/apps (GODAISY_ADMIN_EMAILS); the data comes from
 * GET /api/admin/search-explorer.
 *
 * In development, ?sample=1 renders made-up figures so the layout can be seen
 * without Google credentials.
 */

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { SEARCH_SITE_LIST } from '@/lib/admin-dashboard/search-site-list';
import type { ExplorerRow, ExplorerView, IndexingReport } from '@/lib/admin-dashboard/search-explorer';
import type { SearchRow } from '@/lib/admin-dashboard/search-console';

type Failure = { state: 'not_configured' | 'error'; message: string };
type Loaded<T> = { state: 'ok'; data: T } | Failure;

const n = (v: number) => v.toLocaleString('en-GB');
const path = (url: string) => url.replace(/^https?:\/\/[^/]+/, '') || '/';

async function get<T>(token: string | undefined, params: Record<string, string>): Promise<Loaded<T>> {
  const res = await fetch(`/api/admin/search-explorer?${new URLSearchParams(params)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body: unknown = await res.json().catch(() => null);
  if (body && typeof body === 'object' && 'state' in body) return body as Loaded<T>;
  const error = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : null;
  return { state: 'error', message: error ?? `Request failed (${res.status})` };
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>{head.map((h, i) => <th key={h} className={i > 0 ? 'text-right' : ''}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function PageRow({ r, onPick, active }: { r: ExplorerRow; onPick: (url: string) => void; active: boolean }) {
  const under = r.impressions >= 30 && r.ctr < r.expectedCtr * 0.6;
  return (
    <tr className={active ? 'bg-base-200' : undefined}>
      <td className="max-w-[26rem] truncate">
        <button className="link link-hover text-left" title={r.key} onClick={() => onPick(r.key)}>{path(r.key)}</button>
      </td>
      <td className="text-right">{n(r.impressions)}</td>
      <td className="text-right">{n(r.clicks)}</td>
      <td className={`text-right ${under ? 'text-error font-semibold' : ''}`}>{r.ctr}%</td>
      <td className="text-right text-base-content/60">{r.expectedCtr}%</td>
      <td className="text-right">{r.position}</td>
      <td className="text-right">{r.missedClicks > 0 ? `~${n(r.missedClicks)}` : ''}</td>
    </tr>
  );
}

const PAGE_HEAD = ['Page', 'Impressions', 'Clicks', 'CTR', 'Typical at this rank', 'Position', 'Clicks left on the table'];

function QueryTable({ rows }: { rows: SearchRow[] }) {
  return (
    <Table head={['Query', 'Impressions', 'Clicks', 'CTR', 'Position']}>
      {rows.map((q) => (
        <tr key={q.key}>
          <td className="max-w-[26rem] truncate" title={q.key}>{q.key}</td>
          <td className="text-right">{n(q.impressions)}</td>
          <td className="text-right">{n(q.clicks)}</td>
          <td className="text-right">{q.ctr}%</td>
          <td className="text-right">{q.position}</td>
        </tr>
      ))}
    </Table>
  );
}

function Indexing({ report }: { report: IndexingReport }) {
  const pct = report.checked ? Math.round((report.indexed / report.checked) * 100) : 0;
  return (
    <div className="space-y-3">
      <p>
        <strong>{report.indexed} of {report.checked}</strong> sampled pages are indexed ({pct}%), from a sitemap of {n(report.sitemapUrls)} URLs.
        {report.failed > 0 ? ` ${report.failed} could not be checked.` : ''}
      </p>
      <ul className="flex flex-wrap gap-2">
        {report.byCoverage.map((c) => (
          <li key={c.coverage} className="badge badge-lg badge-outline">{c.coverage}: {c.count}</li>
        ))}
      </ul>
      <Table head={['Page', 'What Google says', 'Last crawl', 'Notes']}>
        {report.urls.map((u) => (
          <tr key={u.url}>
            <td className="max-w-[26rem] truncate" title={u.url}>{path(u.url)}</td>
            <td className={u.indexed ? '' : 'text-error'}>{u.error ?? u.coverage}</td>
            <td className="text-right">{u.lastCrawl ? u.lastCrawl.slice(0, 10) : 'never'}</td>
            <td className="text-right text-base-content/60">
              {[u.canonicalMismatch ? `Google picked ${path(u.canonicalMismatch)}` : null, u.robots && u.robots !== 'ALLOWED' ? `robots: ${u.robots}` : null].filter(Boolean).join(' · ')}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

const SAMPLE_PAGES: SearchRow[] = [
  { key: 'https://example.com/learn/london-trout', clicks: 12, impressions: 614, ctr: 2, position: 8.2 },
  { key: 'https://example.com/learn/manchester-trout', clicks: 2, impressions: 569, ctr: 0.4, position: 9.5 },
  { key: 'https://example.com/learn/glasgow-trout', clicks: 4, impressions: 550, ctr: 0.7, position: 12.2 },
];

export default function AdminSearchPage() {
  const router = useRouter();
  const { user, session, loading } = useAuth();
  const sample = process.env.NODE_ENV !== 'production' && router.query.sample === '1';
  const [site, setSite] = useState('risedaisy');
  const [view, setView] = useState<Loaded<ExplorerView> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [pageQueries, setPageQueries] = useState<Loaded<{ page: string; queries: SearchRow[] }> | null>(null);
  const [indexing, setIndexing] = useState<Loaded<IndexingReport> | 'running' | null>(null);
  const token = session?.access_token;

  useEffect(() => {
    if (!router.isReady) return;
    setPicked(null);
    setPageQueries(null);
    setIndexing(null);
    if (sample) {
      const pages = SAMPLE_PAGES.map((r) => ({ ...r, expectedCtr: 3.2, missedClicks: Math.max(0, Math.round(r.impressions * 0.032 - r.clicks)) }));
      setView({
        state: 'ok',
        data: { site: 'risedaisy', name: 'Rise Daisy (sample)', property: 'sc-domain:example.com', window: { from: '2026-09-29', to: '2026-10-26' }, pages, queries: [{ key: 'trout fishing near me', clicks: 2, impressions: 73, ctr: 2.7, position: 6.7 }], opportunities: pages.slice(1), totals: { pages: 3, queries: 1 } },
      });
      return;
    }
    if (loading || !session) return;
    let cancelled = false;
    setView(null);
    get<ExplorerView>(token, { site, limit: '50' }).then((r) => !cancelled && setView(r));
    return () => {
      cancelled = true;
    };
  }, [router.isReady, sample, loading, session, token, site]);

  const pick = useCallback(
    async (url: string) => {
      setPicked(url);
      setPageQueries(null);
      if (sample) return setPageQueries({ state: 'ok', data: { page: url, queries: [{ key: 'trout fishing london', clicks: 3, impressions: 120, ctr: 2.5, position: 8 }] } });
      setPageQueries(await get(token, { site, page: url }));
    },
    [sample, token, site],
  );

  const runIndexing = useCallback(async () => {
    setIndexing('running');
    setIndexing(await get<IndexingReport>(token, { site, view: 'indexing', count: '20' }));
  }, [token, site]);

  const head = (
    <Head>
      <title>Search — Daisy family admin</title>
      <meta name="robots" content="noindex" />
    </Head>
  );

  if (!sample && (loading || !user)) {
    return (
      <>
        {head}
        <main className="mx-auto max-w-5xl p-6">
          {loading ? <span className="loading loading-spinner loading-lg" /> : <p><Link href="/login?returnTo=/admin/search" className="link">Sign in</Link> to access admin tools.</p>}
        </main>
      </>
    );
  }

  return (
    <>
      {head}
      <main className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
        <header className="space-y-3">
          <p className="text-sm"><Link href="/admin/apps" className="link">← All apps</Link></p>
          <h1 className="text-3xl font-bold">Search</h1>
          <p className="text-base-content/70">Google search for each site over the last 28 days that Google has settled, beyond the top five on the family page.</p>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Site">
            {SEARCH_SITE_LIST.map((s) => (
              <button key={s.id} role="tab" aria-selected={s.id === site} className={`btn btn-sm ${s.id === site ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSite(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </header>

        {!view ? (
          <span className="loading loading-spinner loading-md" />
        ) : view.state !== 'ok' ? (
          <div className="alert alert-warning"><span>{view.message}</span></div>
        ) : (
          <>
            <p className="text-sm text-base-content/70">
              {view.data.name} · {view.data.property} · {view.data.window.from} to {view.data.window.to} · {n(view.data.totals.pages)} pages and {n(view.data.totals.queries)} queries with impressions
            </p>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Worth rewriting first</h2>
              <p className="text-sm text-base-content/70">
                Pages Google shows often but people rarely click, for where they rank. “Typical at this rank” is a rough industry curve, so use it to rank pages against each other, not to predict clicks. A page far below it usually has a weak title or description, or something above it in the results.
              </p>
              {view.data.opportunities.length === 0 ? (
                <p>Nothing stands out: no page with at least 30 impressions is far below what its rank usually earns.</p>
              ) : (
                <Table head={PAGE_HEAD}>
                  {view.data.opportunities.map((r) => <PageRow key={r.key} r={r} onPick={pick} active={r.key === picked} />)}
                </Table>
              )}
            </section>

            {picked && (
              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Queries for {path(picked)}</h2>
                {!pageQueries ? <span className="loading loading-spinner loading-sm" /> : pageQueries.state !== 'ok' ? <div className="alert alert-warning"><span>{pageQueries.message}</span></div> : <QueryTable rows={pageQueries.data.queries} />}
              </section>
            )}

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Top pages</h2>
              <Table head={PAGE_HEAD}>
                {view.data.pages.map((r) => <PageRow key={r.key} r={r} onPick={pick} active={r.key === picked} />)}
              </Table>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Top queries</h2>
              <QueryTable rows={view.data.queries} />
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-semibold">Is it in Google?</h2>
              <p className="text-sm text-base-content/70">
                Asks Google about 20 pages spread evenly across the sitemap and reports what it says about each. Google allows 2,000 of these a day per site.
              </p>
              <button className="btn btn-sm btn-primary" disabled={indexing === 'running' || sample} onClick={runIndexing}>
                {indexing === 'running' ? 'Checking…' : 'Check 20 pages'}
              </button>
              {indexing && indexing !== 'running' && (indexing.state === 'ok' ? <Indexing report={indexing.data} /> : <div className="alert alert-warning"><span>{indexing.message}</span></div>)}
            </section>
          </>
        )}
      </main>
    </>
  );
}
