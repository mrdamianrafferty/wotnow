/**
 * The conditions, drawn.
 *
 * Each section says the one thing worth knowing as a sentence and draws it:
 * flags for the wind, umbrellas for the week, a person beside the wave, two
 * people on each other's shoulders for the tide. The sentences come from
 * `lib/godaisy/conditions/drawn`, which is rules and fixed comparisons, never
 * prose written for a day.
 *
 * "WHY?" ON THE CALL COMES HERE. It used to open a drawer of the same readings
 * over the call. It now links to this page with the call's place, day, verdict
 * and what the scorer weighed, so the page is about that day and leads with
 * the section the verdict turned on.
 *
 * EVERY NUMBER IS STILL HERE. The table this page used to be sits at the
 * bottom behind "See every number", unchanged: anyone who wants 37 km/h rather
 * than a flag gets it, and nothing the old page showed was lost.
 *
 * THE COAST DECIDES WHAT THE SEA IS DOING HERE. Inland, the sea and the tides
 * are absent, not empty — they were never evidence about that place.
 *
 * @module pages/weather
 */

import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { EVIDENCE_SECTIONS, type EvidenceSectionId, type Weighed } from '@/lib/godaisy/call/evidence';
import { rowsFor, type Readings, type Row } from '@/lib/godaisy/call/readings';
import { setupFromCookieHeader } from '@/lib/godaisy/call/setup';
import { drawConditions, todayOnlyNote, PERSON_M } from '@/lib/godaisy/conditions/drawn';
import { langFromRequest } from '@/lib/godaisy/i18n/lang';
import { GdLangProvider, useGdLang, useGdLocale } from '@/lib/godaisy/i18n/react';
import { tr_, num as fmtNum } from '@/lib/godaisy/i18n';
import type { LangCode, Locale, TKey } from '@/lib/godaisy/i18n/types';
import { placeFromQuery, whyFromQuery } from '@/lib/godaisy/conditions/whyLink';
import { seedOf } from '@/lib/godaisy/conditions/pencil';
import { Drawing } from '@/components/conditions/Drawing';
import { trackEvent } from '@/lib/analytics/events';
import { shareCall } from '@/lib/godaisy/call/share';
import { drawingCard, shareLink } from '@/lib/godaisy/conditions/shareCard';
import type { DrawnSection } from '@/lib/godaisy/conditions/drawn';
import { Spinner } from '@/components/call/Spinner';
import { PageHeader } from '@/components/call/PageHeader';
import GetTheApp from '@/components/GetTheApp';
import { SEO_LOCATIONS, type SeoLocation } from '@/data/seoLocations';

const DEFAULT_PLACE = 'newquay-cornwall';

/** The order of the plain table at the bottom: the order a person asks. */
const ORDER: readonly EvidenceSectionId[] = [
  'temperature', 'wind', 'rain', 'sea', 'tide', 'sky', 'air', 'ground', 'night',
];
const COASTAL_ONLY: ReadonlySet<EvidenceSectionId> = new Set(['sea', 'tide']);

interface WeatherPageProps {
  place: string;
  lat: number;
  lon: number;
  coastal: boolean;
  /** 0 is today. From the call's "Why?". */
  day: number;
  /** The verdict this page is explaining, when the call sent it. */
  verdict: string | null;
  weighed: Weighed[];
  /** The language the server said it all in — the same rule as the call. */
  lang: LangCode;
}

/**
 * The same language rule as the call (`lib/godaisy/i18n/lang`), read the same
 * way, so tapping "Why?" never changes the language underneath you.
 */
export default function WeatherPage(props: WeatherPageProps) {
  const lang = useGdLang(props.lang ?? 'en');
  return (
    <GdLangProvider lang={lang}>
      <ConditionsPage {...props} />
    </GdLangProvider>
  );
}

function ConditionsPage({ place, lat, lon, coastal, day, verdict, weighed }: WeatherPageProps) {
  const { L, lang, t } = useGdLocale();
  const [readings, setReadings] = useState<Partial<Readings> | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  /** The sea arrives separately and later — see below. */
  const [sea, setSea] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [allOpen, setAllOpen] = useState(false);
  /** Per section, while a card is being made and for a moment after it goes. */
  const [sharing, setSharing] = useState<Record<string, 'working' | 'sent' | 'copied'>>({});

  /*
   * THE SEA IS FETCHED SECOND, NOT INSTEAD.
   *
   * `mode=marine` goes to a second provider and takes about 3s cold against
   * 0.35s for everything else. Asking for it up front made a coastal visitor
   * wait three seconds to be told the temperature. So the ordinary conditions
   * land first and the sea fills in behind them; inland it is never asked for.
   */
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await fetch(`/api/unified-weather?lat=${lat}&lon=${lon}&mode=full`);
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Readings;
        // Merged, so a marine response that landed first is not thrown away.
        if (live) { setReadings((prev) => ({ ...j, ...pickMarine(prev) })); setState('ready'); }
      } catch {
        if (live) setState('failed');
      }
    })();
    return () => { live = false; };
  }, [lat, lon]);

  useEffect(() => {
    if (!coastal) return;
    let live = true;
    setSea('loading');
    (async () => {
      try {
        const res = await fetch(`/api/unified-weather?lat=${lat}&lon=${lon}&mode=marine`);
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Readings;
        // Only the sea is taken from it: the ordinary fields are a second copy,
        // and swapping them in would make the temperature flicker.
        if (live) { setReadings((prev) => ({ ...(prev ?? {}), ...pickMarine(j) })); setSea('ready'); }
      } catch {
        if (live) setSea('failed');
      }
    })();
    return () => { live = false; };
  }, [lat, lon, coastal]);

  /*
   * Send one drawing: a card made from the drawing on screen, the sentence as
   * the text, and a link to the same place, day and section. Through The
   * Call's own share, so the app gets the native sheet and a browser without
   * Web Share gets a copied link.
   */
  async function shareSection(s: DrawnSection, el: Element | null) {
    setSharing((m) => ({ ...m, [s.id]: 'working' }));
    const url = shareLink({ origin: window.location.origin, place, lat, lon, coastal, day, section: s.id });
    // The card is forwarded, so it says the date rather than "now".
    const dateISO = readings?.daily?.[day]?.dateISO;
    const dated = dateISO
      ? new Intl.DateTimeFormat(L.intl, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${dateISO}T12:00:00Z`))
      : when;
    const card = await drawingCard({
      svg: el?.querySelector('svg.gd-drawn-svg') ?? null,
      kicker: t('page_kicker', { place, when: dated }),
      sentence: s.sentence,
      facts: s.facts,
      site: window.location.host.replace(/^www\./, ''),
    });
    const result = await shareCall({ text: `${s.sentence} · ${place}`, url, ...(card ? { card } : {}), title: 'Go Daisy', fileName: `go-daisy-${s.id}.png` });
    if (result.outcome !== 'cancelled' && result.outcome !== 'failed') {
      trackEvent('conditions_shared', { section: s.id, day, method: result.method, with_card: result.withCard });
    }
    const done = result.outcome === 'shared' ? 'sent' : result.outcome === 'copied' ? 'copied' : null;
    setSharing((m) => {
      const next = { ...m };
      if (done) next[s.id] = done; else delete next[s.id];
      return next;
    });
    if (done) setTimeout(() => setSharing((m) => { const next = { ...m }; delete next[s.id]; return next; }), 2500);
  }

  // "See every number" opens itself when the link asks for it.
  useEffect(() => {
    if (window.location.hash === '#numbers') setAllOpen(true);
  }, []);

  // One "now" for the visit, so sentences do not shift while it is open.
  const [now] = useState(() => new Date());
  const page = useMemo(
    () => drawConditions(state === 'ready' ? readings : null, {
      day, now, coastal, weighed, lang,
      pending: coastal && (sea === 'loading' || sea === 'idle') ? ['sea', 'tide'] : [],
    }),
    [readings, state, day, now, coastal, weighed, sea, lang],
  );

  const when = page.dayName ?? t(day > 0 ? 'day_later' : 'page_when_now');
  const plain = state === 'ready' && day === 0 ? headline(readings, L) : null;

  const allRows = ORDER
    .filter((id) => coastal || !COASTAL_ONLY.has(id))
    .map((id) => EVIDENCE_SECTIONS.find((s) => s.id === id))
    .filter((s): s is (typeof EVIDENCE_SECTIONS)[number] => Boolean(s))
    .map((s) => ({ section: s, rows: state === 'ready' ? rowsFor({ ...s, because: undefined }, readings, lang) : [] }))
    .filter(({ rows }) => rows.length > 0);

  return (
    <>
      <Head>
        <title>{t('page_title', { place })}</title>
        <meta
          name="description"
          content={t(coastal ? 'page_description_coastal' : 'page_description', { place })}
        />
        {/* A "Why?" link is one person's call, not a page to index. */}
        {verdict && <meta name="robots" content="noindex" />}
      </Head>

      <PageHeader title={t('page_h1')} />
      <main className="gd-cond gd-drawn">
        <div className="gd-cond-inner">
          <p className="call-label gd-cond-kicker">{t('page_kicker', { place, when })}</p>
          {verdict && (
            <p className="gd-drawn-asked">
              <span className="call-label">{t('page_why')}</span>
              <span className="gd-drawn-asked-verdict">{verdict}</span>
            </p>
          )}
          <h1 className="gd-cond-title">{t('page_h1')}</h1>
          {plain && <p className="gd-drawn-plain">{plain}</p>}

          {state === 'loading' && <Spinner label={t('page_loading')} />}
          {state === 'failed' && (
            <p className="gd-cond-quiet">
              {t('page_failed')} <a href="">{t('page_retry')}</a>.
            </p>
          )}

          {page.sections.map((s) => (
            <section key={s.id} id={s.id} className="gd-drawn-sec">
              <h2 className="call-label gd-drawn-label">
                {s.title}
                {/*
                  * Only what held the day back is called out. Sections the call
                  * weighed come first either way; tagging every one of them
                  * "weighed in" put the same words on four headings in a row.
                  */}
                {s.because && s.because.score < 0.5 && (
                  <span className="gd-drawn-because">{t('page_held_back')}</span>
                )}
                {!s.pending && (
                  <button
                    type="button"
                    className="gd-drawn-share"
                    aria-label={`${t('share_drawing')}: ${s.title}`}
                    disabled={sharing[s.id] === 'working'}
                    onClick={(e) => shareSection(s, e.currentTarget.closest('section'))}
                  >
                    {sharing[s.id] === 'working' ? t('call_sending')
                      : sharing[s.id] === 'sent' ? t('call_sent')
                        : sharing[s.id] === 'copied' ? t('call_copied')
                          : `${t('share_drawing')} ↗`}
                  </button>
                )}
              </h2>
              {s.pending ? (
                <Spinner label={t(s.id === 'tide' ? 'page_loading_tide' : 'page_loading_sea')} />
              ) : (
                <>
                  <p className="gd-drawn-say">{s.sentence}</p>
                  {s.drawing && <Drawing drawing={s.drawing} seed={seedOf(`${place}|${day}|${s.id}`)} />}
                  {s.facts.length > 0 && (
                    <dl className="gd-drawn-facts">
                      {s.facts.map((f: Row) => (
                        <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </section>
          ))}

          {coastal && sea === 'failed' && (
            <p className="gd-cond-quiet">{t('page_sea_failed')}</p>
          )}
          {page.todayOnly.length > 0 && (
            <p className="gd-cond-quiet">{todayOnlyNote(page.todayOnly, lang)}</p>
          )}

          {allRows.length > 0 && (
            <details
              id="numbers"
              className="gd-drawn-all"
              open={allOpen}
              onToggle={(e) => {
                const open = (e.currentTarget as HTMLDetailsElement).open;
                if (open && !allOpen) trackEvent('conditions_numbers_opened', { day, from_call: Boolean(verdict) });
                setAllOpen(open);
              }}
            >
              <summary className="gd-drawn-all-summary">{t('page_all_numbers')}</summary>
              {day > 0 && <p className="gd-cond-quiet">{t('page_numbers_now', { day: page.dayName ?? t('page_numbers_that_day') })}</p>}
              {allRows.map(({ section, rows }) => (
                <section key={section.id} className="gd-cond-block">
                  <h2 className="call-label gd-cond-block-title">{t(`title_${section.id}` as TKey)}</h2>
                  <dl className="gd-cond-rows">
                    {rows.map((r: Row) => (
                      <div key={r.label} className="gd-cond-row">
                        <dt>{r.label}</dt>
                        <dd>{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </details>
          )}

          <p className="gd-cond-foot">
            {verdict ? (
              /* Back, not /call: the call was on a day and maybe a place of its
                 own, and a fresh /call would open on today at home. */
              <Link href="/call" onClick={(e) => { if (window.history.length > 1) { e.preventDefault(); window.history.back(); } }}>
                {t('page_back')}
              </Link>
            ) : <Link href="/call">{t('page_whats_good')}</Link>}
            <span>{t(coastal ? 'page_credit_coastal' : 'page_credit', { m: fmtNum(L, PERSON_M, 2) })}</span>
          </p>
        </div>
      </main>
      <GetTheApp placement="conditions" />
    </>
  );
}

const pickMarine = (r: Readings | null): Partial<Readings> => (r?.marine || r?.tides || r?.marineHourly
  ? { marine: r.marine, tides: r.tides, marineHourly: r.marineHourly, ...(r.seaTemp !== undefined ? { seaTemp: r.seaTemp } : {}) }
  : {});

/** "17°C, feels like 19°C, and dry." — the plain answer, above the drawings. */
function headline(r: Readings | null, L: Locale): string | null {
  if (!r) return null;
  const T = (key: TKey, vars?: Record<string, string | number>) => tr_(L, key, vars);
  const bits: string[] = [];
  if (typeof r.temperatureC === 'number') bits.push(`${Math.round(r.temperatureC)}°C`);
  if (typeof r.feelsLikeC === 'number' && Math.abs(r.feelsLikeC - (r.temperatureC ?? 0)) >= 2) {
    bits.push(T('head_feels', { t: Math.round(r.feelsLikeC) }));
  }
  const rain = r.hourly?.[0]?.precipMM;
  if (typeof rain === 'number') bits.push(rain > 0.1 ? T('head_falling', { mm: fmtNum(L, rain, 1) }) : T('head_dry'));
  if (typeof r.windSpeedMS === 'number') bits.push(T('head_wind', { kmh: Math.round(r.windSpeedMS * 3.6) }));
  return bits.length
    ? T('head_join', { list: bits.join(', ') })
    : null;
}

export const getServerSideProps: GetServerSideProps<WeatherPageProps> = async (ctx) => {
  const why = whyFromQuery(ctx.query);
  const base = { day: why.day, verdict: why.verdict, weighed: why.weighed, lang: langFromRequest(ctx.req) };

  /*
   * Where, in order of who asked most specifically:
   *
   * 1. Coordinates in the link. "Why?" sends them, because the call being
   *    explained may be somewhere other than your own place — a shared call is
   *    somebody else's.
   * 2. The setup made in onboarding, so this page and the call agree about
   *    where "here" is.
   * 3. A `?place=` slug, then the same default the call uses. A page that
   *    cannot show you anything until you fill in a form is not a weather page.
   */
  const asked = placeFromQuery(ctx.query);
  if (asked) {
    return { props: { ...base, place: asked.name, lat: asked.lat, lon: asked.lon, coastal: asked.coastal } };
  }

  const setup = setupFromCookieHeader(ctx.req.headers.cookie);
  if (setup) {
    return {
      props: {
        ...base,
        place: setup.coastal?.name ?? setup.place.name,
        lat: setup.coastal?.lat ?? setup.place.lat,
        lon: setup.coastal?.lon ?? setup.place.lon,
        coastal: Boolean(setup.coastal),
      },
    };
  }

  const slug = ctx.query.place ? String(ctx.query.place) : null;
  const location: SeoLocation | undefined = slug
    ? SEO_LOCATIONS.find((l: SeoLocation) => l.slug === slug)
    : (SEO_LOCATIONS.find((l: SeoLocation) => l.slug === DEFAULT_PLACE) ?? SEO_LOCATIONS[0]);
  if (!location) return { notFound: true };

  return {
    props: {
      ...base,
      place: location.name,
      lat: location.lat,
      lon: location.lon,
      // The same test `withMarine` uses, so the page offers the sea exactly
      // where the sea was scored.
      coastal: location.beachFacingDeg != null || location.coastal === true,
    },
  };
};
