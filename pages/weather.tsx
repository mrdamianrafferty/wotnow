/**
 * The conditions, in the new design.
 *
 * The page this replaces was 1,603 lines and eight always-open sections, every
 * one of them shown to everybody: a cyclist in Sheffield got wave height, swell
 * period and tide times, and somebody looking for the temperature scrolled past
 * four cards to find it. It was a dashboard, and a dashboard makes you do the
 * work of deciding what matters.
 *
 * THE COAST DECIDES WHAT THE SEA IS DOING HERE. If a place is not on the water,
 * the sea and the tides are not quiet or empty — they are absent, because they
 * were never evidence about that place. This is the same rule the evidence
 * drawer follows, from the same module, for the same reason.
 *
 * NONE OF THE OLD CARD COMPONENTS ARE DELETED. `components/weather-cards/*`
 * — HourlyCard, WaveCard, TidesCard, MoonCard and the rest — are all still
 * there and still importable. This page stopped using them; nothing else has
 * to, and the previous version of this file is a `git show` away.
 *
 * @module pages/weather
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { EVIDENCE_SECTIONS, type EvidenceSectionId } from '@/lib/godaisy/call/evidence';
import { rowsFor, type Readings, type Row } from '@/lib/godaisy/call/readings';
import { setupFromCookieHeader } from '@/lib/godaisy/call/setup';
import { SEO_LOCATIONS, type SeoLocation } from '@/data/seoLocations';

const DEFAULT_PLACE = 'newquay-cornwall';

/**
 * What this page is for, in order.
 *
 * Not `rankSections`: that orders by which inputs moved a VERDICT, and this
 * page has no verdict to be about. It is the conditions, so it runs in the
 * order a person asks for them — what it is like now, then what is falling out
 * of the sky, then the water, then everything else.
 */
const ORDER: readonly EvidenceSectionId[] = [
  'temperature', 'wind', 'rain', 'sea', 'tide', 'sky', 'air', 'ground', 'night',
];

/** Only where there is water to have them. */
const COASTAL_ONLY: ReadonlySet<EvidenceSectionId> = new Set(['sea', 'tide']);

interface WeatherPageProps {
  place: string;
  lat: number;
  lon: number;
  coastal: boolean;
}

export default function WeatherPage({ place, lat, lon, coastal }: WeatherPageProps) {
  const [readings, setReadings] = useState<Readings | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        // `mode=marine` is the only thing that returns marine, tides and sea
        // temperature at all — asking for it inland would be a slower request
        // for fields this page has already decided not to show.
        const res = await fetch(
          `/api/unified-weather?lat=${lat}&lon=${lon}&mode=${coastal ? 'marine' : 'full'}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as Readings;
        if (live) { setReadings(j); setState('ready'); }
      } catch {
        if (live) setState('failed');
      }
    })();
    return () => { live = false; };
  }, [lat, lon, coastal]);

  const sections = ORDER
    .filter((id) => coastal || !COASTAL_ONLY.has(id))
    .map((id) => EVIDENCE_SECTIONS.find((s) => s.id === id))
    .filter((s): s is (typeof EVIDENCE_SECTIONS)[number] => Boolean(s))
    .map((s) => ({ section: s, rows: state === 'ready' ? rowsFor({ ...s, because: undefined }, readings) : [] }))
    /*
     * A section with nothing in it is not shown.
     *
     * The old page rendered every card regardless and filled the gaps with
     * dashes, which reads as broken rather than as unpublished — and the reader
     * cannot tell the difference between "no pollen today" and "no pollen data
     * for anywhere in Spain".
     */
    .filter(({ rows }) => state !== 'ready' || rows.length > 0);

  const now = state === 'ready' ? headline(readings) : null;

  return (
    <>
      <Head>
        <title>{`Conditions in ${place} | Go Daisy`}</title>
        <meta
          name="description"
          content={`Current weather conditions for ${place} — temperature, wind, rain${coastal ? ', waves and tides' : ''}.`}
        />
      </Head>

      <main className="gd-cond">
        <div className="gd-cond-inner">
          <p className="call-label gd-cond-kicker">{place}</p>
          <h1 className="gd-cond-title">Conditions</h1>

          {/*
            * One line before any table. Somebody opening this wants the
            * temperature and whether it is raining; making them read a grid to
            * find that out is the dashboard problem in miniature.
            */}
          {now && <p className="gd-cond-now">{now}</p>}
          {state === 'loading' && <p className="gd-cond-quiet">Reading the sky…</p>}
          {state === 'failed' && (
            <p className="gd-cond-quiet">
              Those numbers did not load. <Link href="/weather">Try again</Link>.
            </p>
          )}

          {sections.map(({ section, rows }) => (
            <section key={section.id} className="gd-cond-block">
              <h2 className="call-label gd-cond-block-title">{section.title}</h2>
              {rows.length === 0 ? (
                <p className="gd-cond-quiet">…</p>
              ) : (
                <dl className="gd-cond-rows">
                  {rows.map((r: Row) => (
                    <div key={r.label} className="gd-cond-row">
                      <dt>{r.label}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}

          <p className="gd-cond-foot">
            <Link href="/call">What is today good for?</Link>
            <span> · Open-Meteo{coastal ? ', Stormglass for the sea' : ''}</span>
          </p>
        </div>
      </main>
    </>
  );
}

/** "17°, feels like 19°, and dry." — the answer before the table. */
function headline(r: Readings | null): string | null {
  if (!r) return null;
  const bits: string[] = [];
  if (typeof r.temperatureC === 'number') bits.push(`${Math.round(r.temperatureC)}°`);
  if (typeof r.feelsLikeC === 'number' && Math.abs(r.feelsLikeC - (r.temperatureC ?? 0)) >= 2) {
    bits.push(`feels like ${Math.round(r.feelsLikeC)}°`);
  }
  const rain = r.hourly?.[0]?.precipMM;
  if (typeof rain === 'number') bits.push(rain > 0.1 ? `${rain.toFixed(1)} mm falling` : 'dry');
  if (typeof r.windSpeedMS === 'number') bits.push(`wind ${Math.round(r.windSpeedMS * 3.6)} km/h`);
  return bits.length ? `${bits.join(', ')}.` : null;
}

export const getServerSideProps: GetServerSideProps<WeatherPageProps> = async (ctx) => {
  /*
   * The place comes from the setup the person made in onboarding, so this page
   * and the call agree about where "here" is. A visitor with no setup gets the
   * same default the call does rather than a location prompt — a page that
   * cannot show you anything until you fill in a form is not a weather page.
   */
  const setup = setupFromCookieHeader(ctx.req.headers.cookie);
  if (setup) {
    return {
      props: {
        place: setup.coastal?.name ?? setup.place.name,
        lat: setup.coastal?.lat ?? setup.place.lat,
        lon: setup.coastal?.lon ?? setup.place.lon,
        coastal: Boolean(setup.coastal),
      },
    };
  }

  const asked = ctx.query.place ? String(ctx.query.place) : null;
  const location: SeoLocation | undefined = asked
    ? SEO_LOCATIONS.find((l: SeoLocation) => l.slug === asked)
    : (SEO_LOCATIONS.find((l: SeoLocation) => l.slug === DEFAULT_PLACE) ?? SEO_LOCATIONS[0]);
  if (!location) return { notFound: true };

  return {
    props: {
      place: location.name,
      lat: location.lat,
      lon: location.lon,
      // The same test `withMarine` uses, so the page offers the sea exactly
      // where the sea was scored.
      coastal: location.beachFacingDeg != null || location.coastal === true,
    },
  };
};
