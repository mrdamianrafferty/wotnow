/**
 * Google search on /admin/apps: one card per family site from Search
 * Console, with the last 28 days against the 28 before and the top five
 * queries and pages. A site the service account cannot read says which
 * property to grant, rather than showing zeros. See
 * lib/admin-dashboard/search-console.ts.
 */

import type { ReactNode } from 'react';
import type { SearchConsoleSummary, SearchRow, SearchSite, SiteSearch } from '@/lib/admin-dashboard/search-console';
import type { Section } from '@/lib/admin-dashboard/types';
import { fmt } from './DashboardParts';
import f from './FamilyDashboard.module.css';
import s from './SearchConsolePanel.module.css';

type Tone = 'up' | 'down' | 'flat';

function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/** % change, where up is good. */
function pctChange(delta: number | null, previous: number): { text: string; tone: Tone } {
  if (delta === null) return { text: previous === 0 ? 'none before' : '', tone: 'flat' };
  if (delta === 0) return { text: 'no change', tone: 'flat' };
  return { text: `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)}%`, tone: delta > 0 ? 'up' : 'down' };
}

/** CTR change in percentage points. */
function ptChange(value: number, previous: number): { text: string; tone: Tone } {
  const d = Math.round((value - previous) * 10) / 10;
  if (d === 0) return { text: 'no change', tone: 'flat' };
  return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} pt`, tone: d > 0 ? 'up' : 'down' };
}

/** Position change: a smaller number is better, so falling is "up". */
function positionChange(value: number | null, previous: number | null): { text: string; tone: Tone } {
  if (value === null || previous === null) return { text: '', tone: 'flat' };
  const d = Math.round((previous - value) * 10) / 10;
  if (d === 0) return { text: 'no change', tone: 'flat' };
  return { text: `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} place${Math.abs(d) === 1 ? '' : 's'}`, tone: d > 0 ? 'up' : 'down' };
}

function Stat({ label, value, change }: { label: string; value: string; change: { text: string; tone: Tone } }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <strong className={s.statValue}>{value}</strong>
      {change.text ? <span className={`${s.change} ${s[change.tone]}`}>{change.text}</span> : null}
    </div>
  );
}

/** A page URL without its scheme or "www.": the host stays, since a Domain property spans subdomains. */
export function shortPage(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '');
}

function TopList({ title, rows, page }: { title: string; rows: SearchRow[]; page?: boolean }) {
  return (
    <div className={s.list}>
      <h4 className={s.listTitle}>{title}</h4>
      {rows.length === 0 ? (
        <p className={f.small}>None in this window.</p>
      ) : (
        <ol className={s.rows}>
          {rows.map((r) => (
            <li key={r.key} className={s.row} title={`${fmt(r.impressions)} impressions · CTR ${r.ctr}% · position ${r.position}`}>
              <span className={s.rowKey}>{page ? shortPage(r.key) : r.key}</span>
              <span className={s.rowValue}>
                {fmt(r.clicks)} <span className={f.muted}>/ {fmt(r.impressions)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SiteFigures({ d }: { d: SiteSearch }) {
  return (
    <>
      <div className={s.stats}>
        <Stat label="Impressions" value={fmt(d.impressions.value)} change={pctChange(d.impressions.delta, d.impressions.previous)} />
        <Stat label="Clicks" value={fmt(d.clicks.value)} change={pctChange(d.clicks.delta, d.clicks.previous)} />
        <Stat label="CTR" value={`${d.ctr.value}%`} change={ptChange(d.ctr.value, d.ctr.previous)} />
        <Stat
          label="Avg position"
          value={d.position.value === null ? '—' : String(d.position.value)}
          change={positionChange(d.position.value, d.position.previous)}
        />
      </div>
      <TopList title="Top queries · clicks / impressions" rows={d.topQueries} />
      <TopList title="Top pages · clicks / impressions" rows={d.topPages} page />
    </>
  );
}

function SiteCard({ site }: { site: SearchSite }) {
  const r = site.result;
  let body: ReactNode;
  if (r.state === 'ok') body = <SiteFigures d={r.data} />;
  else if (r.state === 'not_configured') body = <p className={s.notice}>Not connected. {r.hint}</p>;
  else body = <p className={`${s.notice} ${s.error}`}>Search Console error: {r.message}</p>;

  return (
    <div className={`${f.card} ${r.state === 'ok' ? '' : f.cardDashed}`}>
      <div className={f.cardHead}>
        <h3 className={f.h3}>{site.name}</h3>
        <p className={`${f.meta} ${s.property}`}>{site.property}</p>
      </div>
      {body}
    </div>
  );
}

export function SearchConsolePanel({ section }: { section: Section<SearchConsoleSummary> | undefined }) {
  if (!section) return null;
  return (
    <section id="search" className={f.section} aria-labelledby="search-h">
      <div className={f.sectionHead}>
        <h2 id="search-h" className={f.h2}>
          Google search
        </h2>
        {section.state === 'ok' ? (
          <span className={f.meta}>
            {dayLabel(section.data.window.from)} – {dayLabel(section.data.window.to)}, against the 28 days before · Search Console, kept for up to 6 h
          </span>
        ) : null}
      </div>
      {section.state === 'ok' ? (
        <div className={f.grid3}>
          {section.data.sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      ) : (
        <div className={`${f.card} ${f.cardDashed}`}>
          <p className={`${s.notice} ${section.state === 'error' ? s.error : ''}`}>
            {section.state === 'not_configured'
              ? `Not connected. ${section.hint ?? `Set ${section.missing.join(', ')}.`}`
              : `Search Console error: ${section.message}`}
          </p>
        </div>
      )}
    </section>
  );
}
