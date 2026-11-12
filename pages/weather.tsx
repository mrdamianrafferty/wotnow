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
import { drawConditions, PERSON_M } from '@/lib/godaisy/conditions/drawn';
import { placeFromQuery, whyFromQuery } from '@/lib/godaisy/conditions/whyLink';
import { seedOf } from '@/lib/godaisy/conditions/pencil';
import { Drawing } from '@/components/conditions/Drawing';
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
}

export default function WeatherPage({ place, lat, lon, coastal, day, verdict, weighed }: WeatherPageProps) {
  const [readings, setReadings] = useState<Partial<Readings> | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  /** The sea arrives separately and later — see below. */
  const [sea, setSea] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [allOpen, setAllOpen] = useState(false);

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

  // "See every number" opens itself when the link asks for it.
  useEffect(() => {
    if (window.location.hash === '#numbers') setAllOpen(true);
  }, []);

  // One "now" for the visit, so sentences do not shift while it is open.
  const [now] = useState(() => new Date());
  const page = useMemo(
    () => drawConditions(state === 'ready' ? readings : null, {
      day, now, coastal, weighed,
      pending: coastal && (sea === 'loading' || sea === 'idle') ? ['sea', 'tide'] : [],
    }),
    [readings, state, day, now, coastal, weighed, sea],
  );

  const when = page.dayName ?? (day > 0 ? 'later' : 'now');
  const plain = state === 'ready' && day === 0 ? headline(readings) : null;

  const allRows = ORDER
    .filter((id) => coastal || !COASTAL_ONLY.has(id))
    .map((id) => EVIDENCE_SECTIONS.find((s) => s.id === id))
    .filter((s): s is (typeof EVIDENCE_SECTIONS)[number] => Boolean(s))
    .map((s) => ({ section: s, rows: state === 'ready' ? rowsFor({ ...s, because: undefined }, readings) : [] }))
    .filter(({ rows }) => rows.length > 0);

  return (
    <>
      <Head>
        <title>{`Conditions in ${place} | Go Daisy`}</title>
        <meta
          name="description"
          content={`The conditions in ${place}, drawn — temperature, wind, rain${coastal ? ', waves and tides' : ''}, and every number behind them.`}
        />
        {/* A "Why?" link is one person's call, not a page to index. */}
        {verdict && <meta name="robots" content="noindex" />}
      </Head>

      <PageHeader title="Conditions" />
      <main className="gd-cond gd-drawn">
        <div className="gd-cond-inner">
          <p className="call-label gd-cond-kicker">{`${place} · ${when}`}</p>
          {verdict && (
            <p className="gd-drawn-asked">
              <span className="call-label">Why</span>
              <span className="gd-drawn-asked-verdict">{verdict}</span>
            </p>
          )}
          <h1 className="gd-cond-title">Conditions</h1>
          {plain && <p className="gd-drawn-plain">{plain}</p>}

          {state === 'loading' && <Spinner label="Reading the sky…" />}
          {state === 'failed' && (
            <p className="gd-cond-quiet">
              Those numbers did not load. <a href="">Try again</a>.
            </p>
          )}

          {page.sections.map((s) => (
            <section key={s.id} className="gd-drawn-sec">
              <h2 className="call-label gd-drawn-label">
                {s.title}
                {/*
                  * Only what held the day back is called out. Sections the call
                  * weighed come first either way; tagging every one of them
                  * "weighed in" put the same words on four headings in a row.
                  */}
                {s.because && s.because.score < 0.5 && (
                  <span className="gd-drawn-because">held the day back</span>
                )}
              </h2>
              {s.pending ? (
                <Spinner label={s.id === 'tide' ? 'Reading the tide…' : 'Reading the water…'} />
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
            <p className="gd-cond-quiet">The sea did not answer, so the waves and tides are missing.</p>
          )}
          {page.todayOnly.length > 0 && (
            <p className="gd-cond-quiet">{todayOnlyNote(page.todayOnly)}</p>
          )}

          {allRows.length > 0 && (
            <details
              id="numbers"
              className="gd-drawn-all"
              open={allOpen}
              onToggle={(e) => setAllOpen((e.currentTarget as HTMLDetailsElement).open)}
            >
              <summary className="gd-drawn-all-summary">See every number</summary>
              {day > 0 && <p className="gd-cond-quiet">These are the readings for right now, not for {page.dayName ?? 'that day'}.</p>}
              {allRows.map(({ section, rows }) => (
                <section key={section.id} className="gd-cond-block">
                  <h2 className="call-label gd-cond-block-title">{section.title}</h2>
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
                Back to the call
              </Link>
            ) : <Link href="/call">What is today good for?</Link>}
            <span>{` · Open-Meteo${coastal ? ', Stormglass for the sea' : ''}. The person in the drawings is ${PERSON_M} m tall.`}</span>
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

function todayOnlyNote(things: string[]): string {
  const list = things.length === 1 ? things[0] : `${things.slice(0, -1).join(', ')} and ${things[things.length - 1]}`;
  return `${list[0].toUpperCase()}${list.slice(1)} ${things.length === 1 ? 'is' : 'are'} only measured for today.`;
}

/** "17°C, feels like 19°C, and dry." — the plain answer, above the drawings. */
function headline(r: Readings | null): string | null {
  if (!r) return null;
  const bits: string[] = [];
  if (typeof r.temperatureC === 'number') bits.push(`${Math.round(r.temperatureC)}°C`);
  if (typeof r.feelsLikeC === 'number' && Math.abs(r.feelsLikeC - (r.temperatureC ?? 0)) >= 2) {
    bits.push(`feels like ${Math.round(r.feelsLikeC)}°C`);
  }
  const rain = r.hourly?.[0]?.precipMM;
  if (typeof rain === 'number') bits.push(rain > 0.1 ? `${rain.toFixed(1)} mm falling` : 'dry');
  if (typeof r.windSpeedMS === 'number') bits.push(`wind ${Math.round(r.windSpeedMS * 3.6)} km/h`);
  return bits.length ? `${bits.join(', ')}.` : null;
}

export const getServerSideProps: GetServerSideProps<WeatherPageProps> = async (ctx) => {
  const why = whyFromQuery(ctx.query);
  const base = { day: why.day, verdict: why.verdict, weighed: why.weighed };

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
