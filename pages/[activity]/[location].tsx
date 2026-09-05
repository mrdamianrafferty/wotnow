/**
 * Programmatic SEO page — "Is today a good day for {activity} in {location}?"
 *
 * Dynamic route: /{activity-slug}/{location-slug}
 *   e.g. /surfing/llanes-asturias
 *        /padel/madrid
 *        /stargazing/snowdonia-eryri
 *
 * ISR with fallback: 'blocking' — pages are generated on-demand on first
 * request, cached at the edge, and rebuilt every hour. At ~2,500 pages this
 * scales well without overloading deploy builds.
 *
 * Each page targets a real long-tail search query. The combination of fresh
 * scoring data, location-specific copy, internal cross-links, and FAQPage +
 * Place JSON-LD is what keeps these out of "doorway page" territory.
 *
 * Source of activity/location data: data/seoLocations.ts
 * Source of scoring: lib/seo/getActivityScore.ts → utils/getSuggestionsByDay
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { GetStaticPaths, GetStaticProps } from 'next';
import SEO from '../../components/SEO';
import AppHeader from '../../components/AppHeader';
import {
  getLocationBySlug,
  getLocationsForActivity,
  type SeoLocation,
} from '../../data/seoLocations';
import {
  getActivityScoreForLocation,
  type ActivityScorePayload,
} from '../../lib/seo/getActivityScore';
import { useRouter } from 'next/router';
import { activityTypes } from '../../data/activityTypes';
import GetTheApp from '../../components/GetTheApp';
import { bandFor, BAND_LABEL, type CallBand } from '../../lib/godaisy/call/bands';

const Footer = dynamic(() => import('../../components/footer'), { ssr: false });

// ============================================================================
// Slug conversion: activity IDs use snake_case in the data layer, but URLs
// use kebab-case for SEO and readability.
// ============================================================================

const activityIdToSlug = (id: string): string => id.replace(/_/g, '-');
const slugToActivityId = (slug: string): string => slug.replace(/-/g, '_');

// ============================================================================
// Page props
// ============================================================================

interface PageProps {
  activityId: string;
  activitySlug: string;
  activityName: string;
  location: SeoLocation;
  score: ActivityScorePayload;
  relatedAtLocation: Array<{
    activityId: string;
    name: string;
    score: number;
    url: string;
  }>;
  relatedLocations: Array<{
    slug: string;
    name: string;
    region: string;
    country: string;
    score: number;
    url: string;
  }>;
}

// ============================================================================
// Static paths
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  // Pre-render zero pages at deploy — let ISR + fallback:'blocking' generate
  // on first request. This keeps deploy times short even at ~2,500 pages.
  // For a tighter pilot, return e.g. the top 50 paths here and Vercel will
  // pre-render those at deploy, leaving the rest to ISR.
  return {
    paths: [],
    fallback: 'blocking',
  };
};

// ============================================================================
// Static props (called per page, then cached and revalidated every hour)
// ============================================================================

export const getStaticProps: GetStaticProps<PageProps> = async (ctx) => {
  const params = ctx.params as { activity?: string; location?: string };
  const activitySlug = params.activity ?? '';
  const locationSlug = params.location ?? '';
  const activityId = slugToActivityId(activitySlug);

  // 1. Validate location
  const location = getLocationBySlug(locationSlug);
  if (!location) return { notFound: true, revalidate: 3600 };

  // 2. Validate that this activity is supported at this location
  if (!location.activities.includes(activityId)) {
    return { notFound: true, revalidate: 3600 };
  }

  // 3. Validate activity exists in the master activity list
  const activity = activityTypes.find((a) => a.id === activityId);
  if (!activity) return { notFound: true, revalidate: 3600 };

  // 4. Fetch the score payload
  const score = await getActivityScoreForLocation(activityId, location);
  if (!score) {
    // Don't bake a broken page — let ISR retry on the next request
    return { notFound: true, revalidate: 60 };
  }

  // 5. Build the "related activities at this location" list (top 5 today)
  const otherActivitiesHere = location.activities.filter(
    (a) => a !== activityId
  );
  const otherScoresHere = await Promise.all(
    otherActivitiesHere.slice(0, 8).map(async (a) => {
      const p = await getActivityScoreForLocation(a, location);
      return {
        activityId: a,
        name: prettyActivityName(a),
        score: p?.todayScore ?? 0,
        url: `/${activityIdToSlug(a)}/${location.slug}`,
      };
    })
  );
  const relatedAtLocation = otherScoresHere
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 6. Build the "other good locations for this activity today" list (top 5)
  const otherLocations = getLocationsForActivity(activityId).filter(
    (l) => l.slug !== location.slug
  );
  const otherLocScores = await Promise.all(
    otherLocations.slice(0, 10).map(async (l) => {
      const p = await getActivityScoreForLocation(activityId, l);
      return {
        slug: l.slug,
        name: l.name,
        region: l.region,
        country: l.country,
        score: p?.todayScore ?? 0,
        url: `/${activitySlug}/${l.slug}`,
      };
    })
  );
  const relatedLocations = otherLocScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    props: {
      activityId,
      activitySlug,
      activityName: prettyActivityName(activityId),
      location,
      score,
      relatedAtLocation,
      relatedLocations,
    },
    revalidate: 3600, // rebuild every hour
  };
};

// ============================================================================
// Display name helper (snake_case → human)
// ============================================================================

function prettyActivityName(id: string): string {
  const overrides: Record<string, string> = {
    football_soccer: 'football',
    sea_kayaking: 'sea kayaking',
    stand_up_paddleboarding: 'stand-up paddleboarding',
    sup_sea: 'sea SUP',
    sea_swimming: 'sea swimming',
    wild_swimming: 'wild swimming',
    rock_climbing: 'rock climbing',
    indoor_climbing: 'indoor climbing',
    mountain_biking: 'mountain biking',
    road_cycling: 'road cycling',
    gravel_biking: 'gravel cycling',
    trail_running: 'trail running',
    fly_fishing_freshwater: 'fly fishing',
    sea_fishing_shore: 'shore sea fishing',
    sea_fishing_boat: 'boat sea fishing',
    coarse_fishing: 'coarse fishing',
    ice_fishing: 'ice fishing',
    cross_country_skiing: 'cross-country skiing',
    ice_skating: 'ice skating',
    ice_hockey: 'ice hockey',
    ice_hockey_indoor: 'indoor ice hockey',
    ice_hockey_us: 'ice hockey',
    gaelic_football: 'Gaelic football',
    hurling_camogie: 'hurling and camogie',
    american_football: 'American football',
    beach_volleyball: 'beach volleyball',
    basketball_outdoor: 'outdoor basketball',
    volleyball_indoor: 'indoor volleyball',
    tennis_indoor: 'indoor tennis',
    indoor_swimming: 'indoor swimming',
    outdoor_yoga: 'outdoor yoga',
    outdoor_meditation: 'outdoor meditation',
    outdoor_painting: 'outdoor painting',
    outdoor_music: 'outdoor music',
    outdoor_chess: 'outdoor chess',
    outdoor_reading: 'outdoor reading',
    outdoor_gardening: 'gardening',
    outdoor_playground: 'outdoor play',
    outdoor_gym: 'outdoor gym',
    urban_exploring: 'urban exploring',
    going_to_pub: 'going to the pub',
    table_tennis: 'table tennis',
    playing_cards: 'card games',
    watch_a_movie: 'film at home',
    playing_records: 'listening to records',
    make_music: 'making music',
    jet_skiing: 'jet skiing',
    rock_hopping: 'rock hopping',
    martial_arts: 'martial arts',
    tai_chi: 'tai chi',
    mushroom_hunting: 'mushroom hunting',
    sailing_inland: 'inland sailing',
    windsurfing_inland: 'inland windsurfing',
    riding_motorbike: 'motorbike riding',
    gym_workout: 'gym workouts',
  };
  return overrides[id] ?? id.replace(/_/g, ' ');
}

// ============================================================================
// Score → the words the app uses
// ============================================================================

/**
 * These pages had a FOURTH score vocabulary.
 *
 * The app speaks in five bands — Prime, Worth a look, Marginal, Not today,
 * Unsafe. The old dashboard had ten badge words. These pages had Excellent,
 * Good, Fair, Poor, on their own thresholds. A stranger arriving from a search
 * result was told "Excellent" and then, one tap later, "Prime", about the same
 * afternoon.
 *
 * THIS CHANGES WHAT GOOGLE SHOWS. The label goes into the meta description and
 * into the FAQPage answer, so the snippet under the search result changes with
 * it. That is the point — the snippet should say what the app says — but it is
 * the one edit here that is visible outside the site.
 *
 * `sentence` is the prose form. "Today is Worth a look for cycling" is not
 * English, and the badge form cannot simply be lower-cased into a sentence.
 */
function bandWords(score: number): { band: CallBand; label: string; sentence: string } {
  const band = bandFor(score);
  const sentence: Record<CallBand, string> = {
    prime: 'a prime day',
    worthALook: 'a day worth a look',
    marginal: 'nothing special',
    notToday: 'not the day',
    unsafe: 'one to sit out',
  };
  return { band, label: BAND_LABEL[band], sentence: sentence[band] };
}

// ============================================================================
// Component
// ============================================================================

export default function ProgrammaticSeoPage({
  activityId,
  activityName,
  location,
  score,
  relatedAtLocation,
  relatedLocations,
}: PageProps) {
  const router = useRouter();
  /*
   * Read on the client, not in getStaticProps: this page is statically
   * generated and cached at the edge, so a server-side read of the query would
   * bake one visitor's `?from=share` into the page everyone else gets.
   */
  const invited = router.query.from === 'share';
  const today = bandWords(score.todayScore);
  const canonicalUrl = `https://godaisy.io/${activityIdToSlug(activityId)}/${location.slug}`;
  const pageTitle = `Is today a good day for ${activityName} in ${location.name}?`;
  const pageDescription = `Today is ${today.sentence} for ${activityName} in ${location.name} — ${score.todayScore}/100. Live weather scoring for ${location.name}, ${location.country}, updated hourly. Free, ad-free.`;

  // ----- JSON-LD: FAQPage answers the literal search query -----
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: pageTitle,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Today is ${today.sentence} for ${activityName} in ${location.name} — ${score.todayScore} out of 100. ${score.todayReasoning || ''} ${score.bestDay && score.bestDay.dayLabel !== 'Today' ? `The best day in the next week looks like ${score.bestDay.dayLabel} (${score.bestDay.score}/100).` : ''}`.trim(),
        },
      },
    ],
  };

  // ----- JSON-LD: Place schema for the location -----
  const placeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: location.name,
    address: {
      '@type': 'PostalAddress',
      addressRegion: location.region,
      addressCountry: location.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: location.lat,
      longitude: location.lon,
    },
  };

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        url={canonicalUrl}
        /*
         * THE CARD, AS THE LINK PREVIEW.
         *
         * Passed to SEO rather than added as another <meta>: that component
         * already emits an og:image, defaulting to the site logo, and a second
         * tag does not override the first — crawlers take whichever comes
         * first, which would have been the logo. The duplicate looked right in
         * the source and did nothing.
         */
        image={`https://godaisy.io/api/call/share?place=${location.slug}&day=0&alt=0&date=${score.weeklyOutlook[0]?.date ?? ''}&crop=og`}
      />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }}
        />
      </Head>

      <AppHeader />

      <main className="gd-spot">
        {/* ===================================================================
            1. HERO — the literal search query, answered
            =================================================================== */}
        <section className="gd-spot-hero">
          <div className="gd-spot-inner">
            <nav className="gd-spot-crumbs" aria-label="Breadcrumb">
              <Link href="/">Go Daisy</Link>
              {' › '}
              <span className="capitalize">{activityName}</span>
              {' › '}
              <span>{location.name}, {location.country}</span>
            </nav>

            {/*
              * The h1 stays the literal search query, word for word — it is why
              * these pages rank, and the redesign has no opinion worth losing
              * that over. What changes is that the ANSWER now comes first and
              * reads like the app's: the sentence, then the evidence.
              */}
            {/*
              * SOMEBODY SENT THIS. A share lands here now, and a page that
              * greets an invitation with "Is today a good day for cycling in
              * Newquay?" is answering a question the reader did not ask — they
              * were asked out. The line costs nothing to anyone arriving from
              * search, because they never see it.
              */}
            {invited && (
              <p className="gd-spot-invite">
                Someone sent you this — here is what today looks like.
              </p>
            )}

            <h1 className="gd-spot-q">
              Is today a good day for {activityName} in {location.name}?
            </h1>

            <p className="gd-spot-answer">Today is {today.sentence}.</p>

            {score.todayReasoning && (
              <p className="gd-spot-reason">{score.todayReasoning}</p>
            )}

            <p className={`gd-spot-band is-${today.band}`}>
              <span className="gd-spot-band-label">{today.label}</span>
              <span className="gd-spot-band-score">{score.todayScore}<span>/100</span></span>
            </p>
          </div>
        </section>

        {/* ===================================================================
            2. 7-DAY OUTLOOK CHART (simple bar visualisation)
            =================================================================== */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">
              7-day outlook for {activityName} in {location.name}
            </h2>
            {score.bestDay && (
              <p className="gd-spot-lede">
                Best day looks like <strong>{score.bestDay.dayLabel}</strong> at{' '}
                {score.bestDay.score}/100.
              </p>
            )}

            <div className="gd-spot-week">
              {score.weeklyOutlook.map((d) => {
                const b = bandWords(d.score);
                // A floor of 8%, or a score of 3 draws nothing and the day looks
                // like missing data rather than a bad day.
                const height = Math.max(d.score, 8);
                return (
                  <div key={d.date} className="gd-spot-day">
                    <div className="gd-spot-bar-track">
                      <div
                        className={`gd-spot-bar is-${b.band}`}
                        style={{ height: `${height}%` }}
                        aria-label={`${d.dayLabel}: ${b.label}, ${d.score} out of 100`}
                      />
                    </div>
                    <span className="gd-spot-day-name">{d.dayLabel.slice(0, 3)}</span>
                    <span className="gd-spot-day-score">{d.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. WHY THIS SCORE — conditions table
            =================================================================== */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">
              Why this score?
            </h2>
            <div className="gd-spot-conditions">
              {score.conditionsToday.temperatureC !== undefined && (
                <ConditionCard label="Temperature" value={`${Math.round(score.conditionsToday.temperatureC)}°C`} />
              )}
              {score.conditionsToday.windSpeedKmh !== undefined && (
                <ConditionCard label="Wind" value={`${Math.round(score.conditionsToday.windSpeedKmh)} km/h${score.conditionsToday.windDirection ? ` ${score.conditionsToday.windDirection}` : ''}`} />
              )}
              {score.conditionsToday.precipitationMm !== undefined && (
                <ConditionCard label="Rainfall" value={`${score.conditionsToday.precipitationMm.toFixed(1)} mm`} />
              )}
              {score.conditionsToday.cloudCoverPct !== undefined && (
                <ConditionCard label="Cloud cover" value={`${Math.round(score.conditionsToday.cloudCoverPct)}%`} />
              )}
              {score.conditionsToday.uvIndex !== undefined && (
                <ConditionCard label="UV index" value={`${score.conditionsToday.uvIndex.toFixed(1)}`} />
              )}
              {score.conditionsToday.waveHeightM !== undefined && (
                <ConditionCard label="Wave height" value={`${score.conditionsToday.waveHeightM.toFixed(1)} m`} />
              )}
              {score.conditionsToday.swellPeriodS !== undefined && (
                <ConditionCard label="Swell period" value={`${Math.round(score.conditionsToday.swellPeriodS)} s`} />
              )}
              {score.conditionsToday.seaTempC !== undefined && (
                <ConditionCard label="Sea temperature" value={`${Math.round(score.conditionsToday.seaTempC)}°C`} />
              )}
              {score.conditionsToday.nextHighTide && (
                <ConditionCard label="Next high tide" value={score.conditionsToday.nextHighTide} />
              )}
              {score.conditionsToday.nextLowTide && (
                <ConditionCard label="Next low tide" value={score.conditionsToday.nextLowTide} />
              )}
            </div>
            <p className="gd-spot-note">
              Data from Open-Meteo, and Open-Meteo Marine for waves and sea temperature.
              Last updated{' '}
              {new Date(score.lastUpdated).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              UTC.
            </p>
          </div>
        </section>

        {/* ===================================================================
            4. LOCATION CONTEXT
            =================================================================== */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">
              About {activityName} in {location.name}
            </h2>
            {location.description && (
              <p className="gd-spot-prose">
                {location.description}
              </p>
            )}
            <p className="gd-spot-prose">
              Go Daisy scores {location.activities.length} activities for{' '}
              {location.name}, including{' '}
              {location.activities
                .filter((a) => a !== activityId)
                .slice(0, 5)
                .map(prettyActivityName)
                .join(', ')}
              . The score for {activityName} updates hourly from the same
              weather data professional services use.
            </p>
          </div>
        </section>

        {/* ===================================================================
            5. RELATED ACTIVITIES AT THIS LOCATION
            =================================================================== */}
        {relatedAtLocation.length > 0 && (
          <section className="gd-spot-section">
            <div className="gd-spot-inner">
              <h2 className="gd-spot-h2">
                Also today in {location.name}
              </h2>
              <div className="gd-spot-links">
                {relatedAtLocation.map((r) => {
                  const b = bandWords(r.score);
                  return (
                    <Link key={r.activityId} href={r.url} className="gd-spot-link">
                      <span className="gd-spot-link-name">{r.name}</span>
                      <span className={`gd-spot-pip is-${b.band}`}>{r.score}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            6. RELATED LOCATIONS FOR THIS ACTIVITY
            =================================================================== */}
        {relatedLocations.length > 0 && (
          <section className="gd-spot-section">
            <div className="gd-spot-inner">
              <h2 className="gd-spot-h2">
                Other good places for {activityName} today
              </h2>
              <div className="gd-spot-links">
                {relatedLocations.map((r) => {
                  const b = bandWords(r.score);
                  return (
                    <Link key={r.slug} href={r.url} className="gd-spot-link">
                      <span className="gd-spot-link-stack">
                        <span className="gd-spot-link-name">{r.name}</span>
                        <span className="gd-spot-link-where">{r.region}, {r.country}</span>
                      </span>
                      <span className={`gd-spot-pip is-${b.band}`}>{r.score}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            FINAL CTA + FOOTER STRIP
            =================================================================== */}
        {/*
          * "scored for every hour" was a claim the app cannot support and has
          * deliberately decided not to make: the forecast is scored by part of
          * the day, because twenty-four discrete scores invite the app to say
          * the wind turns at 10:00 when nothing behind it knows that. The page
          * that brings strangers in should not promise something the product
          * then refuses to do.
          */}
        <GetTheApp placement="spot_page" place={location.name} />

        <section className="gd-spot-colophon">
          <div className="gd-spot-inner">
            <p className="mb-2">
              Score for {activityName} in {location.name} updated hourly.
              Free, ad-free. Built by independent makers in the UK and Asturias, Spain.
            </p>
            <p>
              Weather data from Open-Meteo.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

// ============================================================================
// Small presentational helper for the conditions table
// ============================================================================

function ConditionCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="gd-spot-condition">
      <span className="gd-spot-condition-label">{label}</span>
      <span className="gd-spot-condition-value">{value}</span>
    </div>
  );
}
