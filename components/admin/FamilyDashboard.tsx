/**
 * /admin/apps in the Grewp Design System: a dark header with the family
 * KPIs, what needs attention, three comparisons, the audience, and one card
 * per app. Pure presentation of a FamilySummary; every figure and every
 * sentence is computed from it, and a part an app could not report says so
 * rather than showing a zero.
 */

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { appAttention, deriveAttention, type AttentionItem } from '@/lib/admin-dashboard/attention';
import {
  FAMILY_APPS,
  appMrr,
  type AppSnapshot,
  type FamilyAppId,
  type FamilyCountry,
  type FamilySummary,
  type Part,
  type Trend,
} from '@/lib/admin-dashboard/family';
import { fmt, money } from './DashboardParts';
import s from './FamilyDashboard.module.css';

// ─── Formatting ──────────────────────────────────────────────────────

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en-GB'], { type: 'region' });
  } catch {
    return null;
  }
})();

export function countryName(code: string | null, fallback = 'Unknown'): string {
  if (!code) return fallback;
  try {
    return regionNames?.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

const SHORT_NAMES: Record<string, string> = { GB: 'UK', US: 'US', AE: 'UAE' };
const shortCountry = (code: string | null, name: string) => (code && SHORT_NAMES[code]) || countryName(code, name);

/** "▲ 92%", "▼ 33%", "Same", "None the week before". */
function arrow(t: Trend): string {
  if (t.delta === null) return t.value === 0 ? 'None either week' : 'None the week before';
  if (t.delta === 0) return 'Same';
  return `${t.delta > 0 ? '▲' : '▼'} ${Math.abs(t.delta)}%`;
}
const onWeekBefore = (t: Trend) => (t.delta === null || t.delta === 0 ? arrow(t) : `${arrow(t)} on the week before`);
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const plural = (n: number, one: string, many = `${one}s`) => `${fmt(n)} ${n === 1 ? one : many}`;
const okData = <T,>(p: Part<T>): T | null => (p.state === 'ok' ? p.data : null);

/** Why a part has no figure, in a couple of words. */
function reason(p: Part<unknown>): string {
  if (p.state === 'error') return 'error';
  // A short note ("No store data yet") reads well in place; a sentence-long hint belongs in Needs attention
  if (p.state === 'not_configured') return p.note && p.note.length <= 24 ? p.note.toLowerCase() : 'not connected';
  return '';
}

const DAY = 86_400_000;
/** "20–26 Oct" or "28 Oct – 3 Nov": the last 7 complete UTC days. */
export function weekLabel(generatedAt: string): string {
  const now = new Date(generatedAt);
  const from = new Date(now.getTime() - 7 * DAY);
  const to = new Date(now.getTime() - DAY);
  const day = (d: Date) => d.getUTCDate();
  const mon = (d: Date) => d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return mon(from) === mon(to) ? `${day(from)}–${day(to)} ${mon(to)}` : `${day(from)} ${mon(from)} – ${day(to)} ${mon(to)}`;
}

const barStyle = (color: string, value: number, max: number): CSSProperties => {
  const w = max > 0 ? (value / max) * 100 : 0;
  return { background: color, width: `${w}%`, minWidth: w > 0 ? 4 : 0 };
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#0a7a3a',
  mobile: '#73e2a0',
  tablet: '#0e7490',
};
const deviceColor = (c: string) => DEVICE_COLORS[c] ?? '#94a3b8';
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// ─── Pieces ──────────────────────────────────────────────────────────

function Card({ title, sub, children, dashed, as: H = 'h2' }: { title: string; sub?: ReactNode; children?: ReactNode; dashed?: boolean; as?: 'h2' | 'h3' }) {
  return (
    <div className={`${s.card} ${dashed ? s.cardDashed : ''}`}>
      <div className={s.cardHead}>
        <H className={s.h3}>{title}</H>
        {sub ? <p className={s.meta}>{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}

function BarRow({
  name,
  value,
  note,
  fill,
  title,
  flag,
}: {
  name: ReactNode;
  value: string;
  note?: string;
  fill: CSSProperties;
  title: string;
  flag?: string;
}) {
  return (
    <div className={s.barRow} title={title}>
      <div className={s.barLabel}>
        <span>
          {name}
          {flag ? <span className={s.flag}>{flag}</span> : null}
        </span>
        <span>
          <strong className={s.strong}>{value}</strong>
          {note ? <span className={s.muted}> {note}</span> : null}
        </span>
      </div>
      <div className={s.barTrack}>
        <div className={s.barFill} style={fill} />
      </div>
    </div>
  );
}

const LEVEL_LABEL = {
  danger: 'Urgent',
  check: 'Check',
  waiting: 'Waiting',
} as const;

function AlertIcon({ level }: { level: AttentionItem['level'] }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (level === 'danger') {
    return (
      <svg {...common} stroke="#b91c1c">
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
    );
  }
  if (level === 'check') {
    return (
      <svg {...common} stroke="#b45309">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    );
  }
  return (
    <svg {...common} stroke="#0e7490">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

// ─── Sections ────────────────────────────────────────────────────────

function Header({ data, attention }: { data: FamilySummary; attention: AttentionItem[] }) {
  const { totals, apps } = data;
  const count = apps.length;
  const ofN = (n: number) => `${n} of ${count} apps reporting`;
  const automated = attention.find((a) => a.rule === 'automated_traffic');
  const androidPending = attention.some((a) => a.rule === 'android_missing');

  const dl = apps.map((a) => okData(a.downloads)).filter((d): d is NonNullable<typeof d> => d !== null);
  const ios = dl.reduce((a, d) => a + (d.ios?.value ?? 0), 0);
  const android = dl.reduce((a, d) => a + (d.android?.value ?? 0), 0);

  const [mrrMain, ...mrrRest] = totals.mrr;
  const mrrByApp = apps
    .flatMap((a) =>
      appMrr(a)
        .filter((m) => m.value > 0)
        .map((m) => ({ a, m })),
    )
    .sort((x, y) => y.m.value - x.m.value)
    .map((x) => `${x.a.name} ${money(x.m.value, x.m.currency)}`);
  // A club app takes no money, so it is not "not reporting" subscriptions
  const payingApps = FAMILY_APPS.filter((f) => !f.noRevenue && apps.some((a) => a.id === f.id)).length;

  const topErrors = apps.map((a) => ({ a, e: okData(a.health)?.errors?.value ?? 0 })).sort((x, y) => y.e - x.e)[0];

  const kpis: { label: string; value: string; change: string; note: string }[] = [
    {
      label: 'Downloads',
      value: totals.downloads.apps ? fmt(totals.downloads.value) : '—',
      change: totals.downloads.apps ? onWeekBefore(totals.downloads) : 'No app reporting',
      note: totals.downloads.apps ? (androidPending ? 'iOS only · Android pending' : `iOS ${fmt(ios)} · Android ${fmt(android)}`) : '',
    },
    {
      label: 'Monthly recurring revenue',
      value: mrrMain ? money(mrrMain.value, mrrMain.currency) : '—',
      change: mrrRest.length
        ? `+ ${mrrRest.map((m) => money(m.value, m.currency)).join(' + ')} not converted`
        : mrrMain
          ? ofN(mrrMain.apps)
          : 'No app reporting',
      note: mrrByApp.length ? mrrByApp.join(' · ') : 'No app has MRR yet',
    },
    {
      label: 'Paying subscriptions',
      value: totals.activeSubscriptions.apps ? fmt(totals.activeSubscriptions.value) : '—',
      change: totals.activeTrials.apps ? `${fmt(totals.activeTrials.value)} in trial` : 'Trials not reported',
      note: `${totals.activeSubscriptions.apps} of ${payingApps} paid apps reporting`,
    },
    {
      label: 'Active users',
      value: totals.activeUsers.apps ? fmt(totals.activeUsers.value) : '—',
      change: totals.activeUsers.apps ? onWeekBefore(totals.activeUsers) : 'No app reporting',
      note: automated?.country
        ? `${automated.country.share}% from ${countryName(automated.country.code, automated.country.name)}, likely automated`
        : `Summed per app · ${ofN(totals.activeUsers.apps)}`,
    },
    {
      label: 'Error events',
      value: totals.errors.apps ? fmt(totals.errors.value) : '—',
      change: totals.errors.apps ? onWeekBefore(totals.errors) : 'No app reporting',
      note: topErrors && topErrors.e > 0 ? `${pct(topErrors.e, totals.errors.value)}% from ${topErrors.a.name}` : ofN(totals.errors.apps),
    },
  ];

  return (
    <header className={s.header}>
      <div className={s.headerInner}>
        <div className={s.headerTop}>
          <div className={s.headerTitle}>
            <p className={s.eyebrow}>Daisy family · last 7 complete days</p>
            <h1 className={s.h1}>All apps</h1>
            <p className={s.headerSub}>
              {weekLabel(data.generatedAt)} against the week before · {count} apps, each reporting its own figures
            </p>
          </div>
          <nav className={s.headerLinks} aria-label="Sections">
            <a href="#apps" className={s.pillLink}>
              Jump to apps
            </a>
            <a href="#audience" className={s.pillLinkOutline}>
              Audience
            </a>
            <a href="#attention" className={s.pillLinkOutline}>
              {attention.length === 0 ? 'All clear' : `${plural(attention.length, 'thing')} need${attention.length === 1 ? 's' : ''} attention`}
            </a>
          </nav>
        </div>
        <div className={s.kpis}>
          {kpis.map((k) => (
            <div key={k.label} className={s.kpi}>
              <span className={s.kpiLabel}>{k.label}</span>
              <span className={s.kpiValue}>{k.value}</span>
              <span className={s.kpiChange}>{k.change}</span>
              {k.note ? <span className={s.kpiNote}>{k.note}</span> : null}
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

function Attention({ items }: { items: AttentionItem[] }) {
  return (
    <section id="attention" className={s.attention} aria-labelledby="attention-h">
      <div className={s.sectionHead}>
        <h2 id="attention-h" className={s.h2}>
          Needs attention
        </h2>
        {items.length ? <span className={s.meta}>Worst first</span> : null}
      </div>
      {items.length === 0 ? (
        <p className={s.allClear}>Nothing needs attention. Every app answered, errors are steady and the traffic looks real.</p>
      ) : (
        <div className={s.alerts}>
          {items.map((it, i) => (
            <div key={`${it.rule}-${it.label}-${i}`} className={`${s.alert} ${s[`alert_${it.level}`]}`}>
              <div className={s.alertHead}>
                <AlertIcon level={it.level} />
                <span className={s.alertLevel}>
                  {LEVEL_LABEL[it.level]} · {it.label}
                </span>
              </div>
              <p className={s.alertTitle}>{it.title}</p>
              <p className={s.alertBody}>{it.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Comparisons({ data, androidPending }: { data: FamilySummary; androidPending: boolean }) {
  const { apps, totals } = data;
  const share = totals.downloadShare;
  const shareTotal = share.reduce((a, x) => a + x.value, 0);

  type Row = { a: AppSnapshot; t: Trend | null; why: string };
  const rows = (pick: (a: AppSnapshot) => { t: Trend | null; part: Part<unknown> }): Row[] =>
    apps
      .map((a) => {
        const { t, part } = pick(a);
        return {
          a,
          t,
          why: a.status !== 'ok' ? 'not connected' : t ? '' : reason(part) || 'not reported',
        };
      })
      .sort((x, y) => (y.t?.value ?? -1) - (x.t?.value ?? -1));
  const users = rows((a) => ({
    t: okData(a.analytics)?.activeUsers ?? null,
    part: a.analytics,
  }));
  const errors = rows((a) => ({
    t: okData(a.health)?.errors ?? null,
    part: a.health,
  }));
  const max = (rs: Row[]) => Math.max(0, ...rs.map((r) => r.t?.value ?? 0));

  const bars = (rs: Row[], unit: string) =>
    rs.map(({ a, t, why }) => (
      <BarRow
        key={a.id}
        name={a.name}
        value={t ? fmt(t.value) : '—'}
        note={t ? arrow(t) : why}
        fill={barStyle(a.color, t?.value ?? 0, max(rs))}
        title={t ? `${a.name}: ${fmt(t.value)} ${unit}, ${arrow(t)} on the week before` : `${a.name}: ${why}`}
      />
    ));

  return (
    <section className={`${s.section} ${s.grid3}`} aria-label="Comparisons">
      <Card
        title="Where downloads came from"
        sub={
          totals.downloads.apps === 0
            ? 'No app reports downloads'
            : `${plural(totals.downloads.value, 'first-time download')}${androidPending ? ', iOS only while Android is pending' : ''}`
        }
      >
        {shareTotal > 0 ? (
          <div className={s.stackBar} role="img" aria-label={`Download share: ${share.map((x) => `${x.name} ${pct(x.value, shareTotal)}%`).join(', ')}`}>
            {share.map((x) => (
              <div
                key={x.id}
                title={`${x.name}: ${fmt(x.value)} downloads (${pct(x.value, shareTotal)}%)`}
                style={{ flex: `${x.value} 1 0`, background: x.color }}
              />
            ))}
          </div>
        ) : null}
        <div className={s.legend}>
          {[...apps]
            .sort((x, y) => (okData(y.downloads)?.total.value ?? -1) - (okData(x.downloads)?.total.value ?? -1))
            .map((a) => {
              const d = okData(a.downloads);
              return (
                <div key={a.id} className={s.legendRow}>
                  <span className={s.dot} style={{ background: a.color }} />
                  <span className={s.grow}>{a.name}</span>
                  <span className={s.strong}>{d ? fmt(d.total.value) : '—'}</span>
                  <span className={s.pct}>{d ? `${pct(d.total.value, shareTotal)}%` : ''}</span>
                </div>
              );
            })}
        </div>
      </Card>

      <Card
        title="Active users"
        sub={totals.activeUsers.apps ? `${fmt(totals.activeUsers.value)} across the family, summed per app` : 'No app reports active users'}
      >
        <div className={s.bars}>{bars(users, 'active users')}</div>
      </Card>

      <Card
        title="Error events"
        sub={
          totals.errors.apps
            ? `${fmt(totals.errors.value)} this week, ${arrow(totals.errors)} · ${totals.errors.apps} of ${apps.length} apps reporting`
            : 'No app reports errors'
        }
      >
        <div className={s.bars}>{bars(errors, 'error events')}</div>
      </Card>
    </section>
  );
}

function Audience({ data, attention }: { data: FamilySummary; attention: AttentionItem[] }) {
  const { apps } = data;
  const aud = data.totals.audience;
  const names = new Map(apps.map((a) => [a.id, a.name]));
  const appNames = (ids: FamilyAppId[]) => ids.map((id) => names.get(id) ?? id).join(', ');
  const flagged = attention.filter((a) => a.rule === 'automated_traffic');
  const flaggedCodes = new Set<string | null>(flagged.flatMap((f) => (f.country ? [f.country.code] : [])));

  const visitors = aud.countries.slice(0, 8);
  const maxVisitors = visitors[0]?.value ?? 0;

  // Eight tiles: the top seven, and the rest folded into the eighth
  const store = aud.storeCountries;
  const tiles: { key: string; name: string; value: number; apps: string }[] =
    store.length <= 8
      ? store.map((c) => ({
          key: c.code ?? c.name,
          name: countryName(c.code, c.name),
          value: c.value,
          apps: appNames(c.apps),
        }))
      : [
          ...store.slice(0, 7).map((c) => ({
            key: c.code ?? c.name,
            name: countryName(c.code, c.name),
            value: c.value,
            apps: appNames(c.apps),
          })),
          {
            key: 'rest',
            name: (() => {
              const rest = store.slice(7).map((c) => countryName(c.code, c.name));
              return rest.length <= 3 ? rest.join(', ') : `${rest.slice(0, 2).join(', ')} and ${rest.length - 2} more`;
            })(),
            value: store.slice(7).reduce((a, c) => a + c.value, 0),
            apps: `${store.length - 7} countries`,
          },
        ];

  const mobileLeader = aud.deviceShare
    .filter((d) => d.visitors >= 50)
    .map((d) => ({ ...d, share: pct(d.mobile, d.visitors) }))
    .sort((a, b) => b.share - a.share)[0];

  const reportingNote = `${aud.reporting} of ${apps.length} apps reporting`;

  return (
    <section id="audience" className={s.section} aria-labelledby="audience-h">
      <div className={s.sectionHead}>
        <h2 id="audience-h" className={s.h2}>
          Audience
        </h2>
        <span className={s.meta}>GA4 web visitors, last 7 days · store downloads, last 30 days · {reportingNote}</span>
      </div>
      <div className={s.grid3}>
        <Card as="h3" title="Visitors by country" sub="Each app’s top countries, summed across the family">
          {visitors.length === 0 ? (
            <p className={s.empty}>{aud.reporting === 0 ? 'No app reports its audience yet.' : 'No country rows this week.'}</p>
          ) : (
            <div className={s.bars}>
              {visitors.map((c: FamilyCountry) => {
                const isFlagged = flaggedCodes.has(c.code);
                return (
                  <BarRow
                    key={c.code ?? c.name}
                    name={countryName(c.code, c.name)}
                    flag={isFlagged ? 'likely automated' : undefined}
                    value={fmt(c.value)}
                    fill={barStyle(isFlagged ? '#94a3b8' : '#0a7a3a', c.value, maxVisitors)}
                    title={`${countryName(c.code, c.name)}: ${fmt(c.value)} active users (${appNames(c.apps)})`}
                  />
                );
              })}
            </div>
          )}
          {flagged.map((f) =>
            f.country ? (
              <p key={f.country.code} className={s.small}>
                {countryName(f.country.code, f.country.name)} is {f.country.share}% of all visitors to {plural(f.apps.length, 'app')} yet sent no store
                downloads in 30 days. Treat it as automated traffic until a GA4 filter proves otherwise.
              </p>
            ) : null,
          )}
        </Card>

        <Card
          as="h3"
          title="Store downloads by country"
          sub={`First-time downloads, last 30 days, top countries${aud.storeReporting < apps.length ? ` · ${aud.storeReporting} of ${apps.length} apps send countries` : ''}`}
        >
          {tiles.length === 0 ? (
            <p className={s.empty}>{aud.storeReporting === 0 ? 'No app sends download countries yet.' : 'No downloads in the last 30 days.'}</p>
          ) : (
            <div className={s.tiles}>
              {tiles.map((t) => (
                <div key={t.key} className={s.tile} title={`${t.name}: ${fmt(t.value)} downloads (${t.apps})`}>
                  <div className={s.tileTop}>
                    <span>{t.name}</span>
                    <span className={s.tileValue}>{fmt(t.value)}</span>
                  </div>
                  <span className={s.tileApps}>{t.apps}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className={s.stack}>
          <Card as="h3" title="Devices" sub={aud.visitors ? `${plural(aud.visitors, 'web visitor')} across the family` : 'No app reports devices yet'}>
            {aud.visitors > 0 ? (
              <>
                <div
                  className={s.stackBar}
                  role="img"
                  aria-label={`Devices: ${aud.devices.map((d) => `${d.category} ${pct(d.value, aud.visitors)}%`).join(', ')}`}
                >
                  {aud.devices.map((d) => (
                    <div
                      key={d.category}
                      title={`${cap(d.category)}: ${fmt(d.value)} (${pct(d.value, aud.visitors)}%)`}
                      style={{
                        flex: `${d.value} 1 0`,
                        minWidth: 4,
                        background: deviceColor(d.category),
                      }}
                    />
                  ))}
                </div>
                <div className={s.legendInline}>
                  {aud.devices.map((d) => (
                    <div key={d.category} className={s.legendItem}>
                      <span className={s.dot} style={{ background: deviceColor(d.category) }} />
                      <span>{cap(d.category)}</span>
                      <strong className={s.strong}>{pct(d.value, aud.visitors)}%</strong>
                    </div>
                  ))}
                </div>
                {mobileLeader && mobileLeader.share >= 50 ? (
                  <p className={s.small}>
                    {mobileLeader.name} is the most mobile app in the family: {mobileLeader.share}% of its visitors are on phones.
                  </p>
                ) : null}
              </>
            ) : null}
          </Card>

          <Demographics data={data} />
        </div>
      </div>
    </section>
  );
}

function Demographics({ data }: { data: FamilySummary }) {
  const aud = data.totals.audience;
  const d = aud.demographics;
  if (d.availableApps === 0) {
    return (
      <Card as="h3" title="Age and gender" dashed>
        <p className={s.empty}>
          {aud.reporting === 0
            ? 'Not available yet. No app reports its audience yet.'
            : `Not available yet. GA4 returned no age or gender rows for ${aud.reporting === 1 ? 'the one app' : `any of the ${aud.reporting} apps`} reporting audience.`}
        </p>
        <p className={s.small}>
          Turn on Google signals in each property (Admin · Data collection). Even then, GA4 withholds demographics below its privacy thresholds, so expect gaps
          at this traffic.
        </p>
      </Card>
    );
  }
  const ageMax = Math.max(0, ...d.age.map((a) => a.value));
  const genderTotal = d.gender.reduce((a, g) => a + g.value, 0);
  return (
    <Card as="h3" title="Age and gender" sub={`${d.availableApps} of ${aud.reporting} apps have demographics; the rest are below GA4’s thresholds`}>
      {d.age.length ? (
        <div className={s.bars}>
          {d.age.map((a) => (
            <BarRow
              key={a.bracket}
              name={a.bracket}
              value={fmt(a.value)}
              fill={barStyle('#0a7a3a', a.value, ageMax)}
              title={`${a.bracket}: ${fmt(a.value)} active users`}
            />
          ))}
        </div>
      ) : null}
      {genderTotal > 0 ? (
        <div className={s.legendInline}>
          {d.gender.map((g) => (
            <div key={g.gender} className={s.legendItem}>
              <span>{cap(g.gender)}</span>
              <strong className={s.strong}>{pct(g.value, genderTotal)}%</strong>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function AppCard({ app, attention, maxDl }: { app: AppSnapshot; attention: AttentionItem[]; maxDl: number }) {
  const item = appAttention(attention, app.id);
  const pill =
    app.status !== 'ok'
      ? {
          kind: 'warn',
          label: app.status === 'not_configured' ? 'Not connected' : 'Unavailable',
        }
      : item
        ? { kind: item.level === 'danger' ? 'bad' : 'warn', label: item.short }
        : { kind: 'ok', label: 'Healthy' };

  const head = (
    <div className={s.appHead}>
      <h3 className={s.appName}>{app.name}</h3>
      <span className={`${s.pill} ${s[`pill_${pill.kind}`]}`}>{pill.label}</span>
    </div>
  );

  if (app.status !== 'ok') {
    return (
      <article className={s.appCard}>
        <div className={s.band} style={{ background: app.color }} />
        <div className={s.appBody}>
          {head}
          <p className={s.unavailable}>
            {app.message}
            {app.missing?.length ? ` Set ${app.missing.join(' and ')} in Vercel.` : ''}
          </p>
        </div>
      </article>
    );
  }

  const dl = okData(app.downloads);
  const rev = okData(app.revenue);
  const an = okData(app.analytics);
  const hl = okData(app.health);
  const aud = okData(app.audience);

  const mrr = appMrr(app);
  const webMrr = app.webRevenue?.state === 'ok' ? app.webRevenue.data.mrrByCurrency.filter((m) => m.mrr > 0) : [];
  const platforms = dl
    ? [`iOS ${fmt(dl.ios?.value ?? 0)}`, ...(dl.android && dl.android.value > 0 ? [`Android ${fmt(dl.android.value)}`] : [])].join(' · ')
    : '';
  const stats: { label: string; value: string; note: string }[] = [
    {
      label: 'Downloads',
      value: dl ? fmt(dl.total.value) : '—',
      note: dl ? `${arrow(dl.total)} · ${platforms}` : reason(app.downloads),
    },
    rev?.source === 'none'
      ? { label: 'MRR', value: '—', note: 'No revenue — club app' }
      : {
          label: 'MRR',
          value: mrr.length ? mrr.map((m) => money(m.value, m.currency)).join(' + ') : '—',
          note: rev
            ? [
                rev.activeSubscriptions != null ? plural(rev.activeSubscriptions, 'subscription') : 'subscriptions not reported',
                webMrr.length ? `incl. ${webMrr.map((m) => money(m.mrr, m.currency)).join(' + ')} web` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : reason(app.revenue),
        },
    {
      label: 'Active users',
      value: an?.activeUsers ? fmt(an.activeUsers.value) : '—',
      note: an?.activeUsers
        ? `${arrow(an.activeUsers)}${an.pageViews ? ` · ${plural(an.pageViews.value, 'view')}` : ''}`
        : reason(app.analytics) || 'not reported',
    },
    {
      label: 'Errors',
      value: hl?.errors ? fmt(hl.errors.value) : '—',
      note: hl
        ? `${hl.errors ? arrow(hl.errors) : 'no error counts'} · ${hl.crashFreeRate != null ? `${fmt(hl.crashFreeRate, hl.crashFreeRate === 100 ? 0 : 2)}% crash-free` : 'no crash-free data'}`
        : reason(app.health),
    },
  ];

  const source = rev && rev.source !== 'none' ? (rev.source === 'revenuecat' ? 'RevenueCat' : rev.source === 'stripe' ? 'Stripe' : cap(rev.source)) : null;
  const footnote = [
    source && (rev?.revenue28d != null && rev.currency ? `${source} · ${money(rev.revenue28d, rev.currency)} taken in 28 days` : source),
    dl?.latestDate
      ? `store data to ${new Date(`${dl.latestDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
    .replace(/^./, (c) => c.toUpperCase());

  return (
    <article className={s.appCard}>
      <div className={s.band} style={{ background: app.color }} />
      <div className={s.appBody}>
        {head}
        <div className={s.stats}>
          {stats.map((st) => (
            <div key={st.label} className={s.stat}>
              <span className={s.statLabel}>{st.label}</span>
              <span className={s.statValue}>{st.value}</span>
              <span className={s.statNote}>{st.note}</span>
            </div>
          ))}
        </div>

        {dl ? (
          <div className={s.compare}>
            <div className={s.compareHead}>
              <span>Downloads, this week vs last</span>
              <span className={s.num}>
                {fmt(dl.total.value)} vs {fmt(dl.total.previous)}
              </span>
            </div>
            <div className={s.compareBars} role="img" aria-label={`${app.name} downloads: ${dl.total.value} this week, ${dl.total.previous} last week`}>
              <div className={s.barTrack}>
                <div className={s.barFill} style={barStyle(app.color, dl.total.value, maxDl)} />
              </div>
              <div className={s.barTrack}>
                <div className={s.barFill} style={barStyle('#cbd5e1', dl.total.previous, maxDl)} />
              </div>
            </div>
            {footnote ? <p className={s.small}>{footnote}</p> : null}
          </div>
        ) : footnote ? (
          <p className={s.small}>{footnote}</p>
        ) : null}

        {app.club ? (
          <div className={s.chips}>
            <span className={s.chipsLabel}>Club</span>
            <div className={s.stats}>
              {app.club.stats.map((c) => (
                <div key={c.key} className={s.stat}>
                  <span className={s.statNote}>{c.label}</span>
                  <span className={s.clubValue}>{fmt(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className={s.chips}>
          <span className={s.chipsLabel}>Top visitor countries</span>
          <div className={s.chipRow}>
            {aud && aud.countries.length ? (
              aud.countries.slice(0, 3).map((c) => (
                <span key={c.code ?? c.name} className={s.chip}>
                  {shortCountry(c.code, c.name)} {fmt(c.activeUsers)}
                </span>
              ))
            ) : (
              <span className={s.chip}>{aud ? 'None this week' : app.audience.state === 'error' ? 'Error' : 'Not reported yet'}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Page body ───────────────────────────────────────────────────────

export function FamilyDashboard({ data, notice }: { data: FamilySummary; notice?: ReactNode }) {
  const attention = deriveAttention(data);
  const androidPending = attention.some((a) => a.rule === 'android_missing');
  const byUsers = [...data.apps].sort((a, b) => (okData(b.analytics)?.activeUsers?.value ?? -1) - (okData(a.analytics)?.activeUsers?.value ?? -1));
  const maxDl = Math.max(0, ...data.apps.map((a) => okData(a.downloads)).flatMap((d) => (d ? [d.total.value, d.total.previous] : [])));

  return (
    <>
      <Header data={data} attention={attention} />
      <main className={s.main}>
        {notice}
        <Attention items={attention} />
        <Comparisons data={data} androidPending={androidPending} />
        <Audience data={data} attention={attention} />
        <section id="apps" className={s.section} aria-labelledby="apps-h">
          <div className={s.sectionHead}>
            <h2 id="apps-h" className={s.h2}>
              By app
            </h2>
            <span className={s.meta}>Ordered by active users</span>
          </div>
          <div className={s.appGrid}>
            {byUsers.map((a) => (
              <AppCard key={a.id} app={a} attention={attention} maxDl={maxDl} />
            ))}
          </div>
        </section>
        <p className={s.footer}>
          Generated{' '}
          {new Date(data.generatedAt).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
          . Each app’s figures come from its own stores, RevenueCat or Stripe, GA4 and Sentry.{' '}
          <Link href="/admin/dashboard" className={s.link}>
            Go Daisy in detail →
          </Link>
        </p>
      </main>
    </>
  );
}
