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
import { activityTypes } from '../../data/activityTypes';
import { getActivityEmoji } from '../../data/emojiMap';

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
  activityEmoji: string;
  location: SeoLocation;
  score: ActivityScorePayload;
  relatedAtLocation: Array<{
    activityId: string;
    name: string;
    emoji: string;
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
        emoji: getActivityEmoji?.(a) ?? '•',
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
      activityEmoji: getActivityEmoji?.(activityId) ?? '•',
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
// Score → traffic-light helper
// ============================================================================

function scoreColor(score: number): { bg: string; text: string; label: string } {
  if (score >= 80) return { bg: 'bg-success', text: 'text-success-content', label: 'Excellent' };
  if (score >= 60) return { bg: 'bg-success/80', text: 'text-success-content', label: 'Good' };
  if (score >= 40) return { bg: 'bg-warning', text: 'text-warning-content', label: 'Fair' };
  return { bg: 'bg-error/80', text: 'text-error-content', label: 'Poor' };
}

// ============================================================================
// Component
// ============================================================================

export default function ProgrammaticSeoPage({
  activityId,
  activityName,
  activityEmoji,
  location,
  score,
  relatedAtLocation,
  relatedLocations,
}: PageProps) {
  const todayColor = scoreColor(score.todayScore);
  const canonicalUrl = `https://godaisy.io/${activityIdToSlug(activityId)}/${location.slug}`;
  const pageTitle = `Is today a good day for ${activityName} in ${location.name}?`;
  const pageDescription = `${todayColor.label} day for ${activityName} in ${location.name} — ${score.todayScore}/100. Live weather scoring for ${location.name}, ${location.country}, updated hourly. Free, ad-free.`;

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
          text: `Today is a ${todayColor.label.toLowerCase()} day for ${activityName} in ${location.name} — ${score.todayScore} out of 100. ${score.todayReasoning || ''} ${score.bestDay && score.bestDay.dayLabel !== 'Today' ? `The best day in the next week looks like ${score.bestDay.dayLabel} (${score.bestDay.score}/100).` : ''}`.trim(),
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

      <main className="min-h-screen bg-base-100 text-base-content">
        {/* ===================================================================
            1. HERO — the literal search query, answered
            =================================================================== */}
        <section className="px-4 py-10 md:py-16 bg-gradient-to-b from-base-200 to-base-100">
          <div className="max-w-4xl mx-auto">
            <div className="text-sm text-base-content/60 mb-2">
              <Link href="/" className="link">Go Daisy</Link>
              {' › '}
              <span className="capitalize">{activityName}</span>
              {' › '}
              <span>{location.name}, {location.country}</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">
              <span aria-hidden="true">{activityEmoji}</span> Is today a good day
              for {activityName} in {location.name}?
            </h1>

            <div
              className={`inline-flex items-center gap-3 px-5 py-3 rounded-full ${todayColor.bg} ${todayColor.text} mb-6`}
            >
              <span className="text-2xl md:text-3xl font-bold">
                {score.todayScore}<span className="text-base font-normal opacity-80">/100</span>
              </span>
              <span className="text-lg font-medium">{todayColor.label}</span>
            </div>

            {score.todayReasoning && (
              <p className="text-lg md:text-xl text-base-content/80 leading-relaxed max-w-3xl">
                {score.todayReasoning}
              </p>
            )}

            <div className="mt-6">
              <Link href="/" className="btn btn-primary">
                Open Go Daisy for the full forecast
              </Link>
            </div>
          </div>
        </section>

        {/* ===================================================================
            2. 7-DAY OUTLOOK CHART (simple bar visualisation)
            =================================================================== */}
        <section className="px-4 py-10 bg-base-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              7-day outlook for {activityName} in {location.name}
            </h2>
            {score.bestDay && (
              <p className="text-base-content/70 mb-6">
                Best day looks like <strong>{score.bestDay.dayLabel}</strong> at{' '}
                {score.bestDay.score}/100.
              </p>
            )}

            <div className="grid grid-cols-7 gap-2">
              {score.weeklyOutlook.map((d) => {
                const color = scoreColor(d.score);
                const height = Math.max(d.score, 8);
                return (
                  <div key={d.date} className="flex flex-col items-center">
                    <div className="h-32 w-full flex flex-col justify-end">
                      <div
                        className={`${color.bg} rounded-t w-full transition-all`}
                        style={{ height: `${height}%` }}
                        aria-label={`${d.dayLabel}: ${d.score} out of 100`}
                      />
                    </div>
                    <div className="text-xs mt-2 text-base-content/70 truncate w-full text-center">
                      {d.dayLabel.slice(0, 3)}
                    </div>
                    <div className="text-sm font-semibold">{d.score}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ===================================================================
            3. WHY THIS SCORE — conditions table
            =================================================================== */}
        <section className="px-4 py-10 bg-base-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              Why this score?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <p className="mt-6 text-sm text-base-content/60">
              Data from OpenWeather, Stormglass marine services and api.met.no.
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
        <section className="px-4 py-10 bg-base-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              About {activityName} in {location.name}
            </h2>
            {location.description && (
              <p className="text-lg text-base-content/80 leading-relaxed mb-4">
                {location.description}
              </p>
            )}
            <p className="text-base-content/70">
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
          <section className="px-4 py-10 bg-base-200">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Also today in {location.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedAtLocation.map((r) => {
                  const c = scoreColor(r.score);
                  return (
                    <Link
                      key={r.activityId}
                      href={r.url}
                      className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="card-body p-4 flex flex-row items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl" aria-hidden="true">{r.emoji}</span>
                          <span className="font-medium capitalize">{r.name}</span>
                        </div>
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${c.bg} ${c.text} font-bold`}
                        >
                          {r.score}
                        </span>
                      </div>
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
          <section className="px-4 py-10 bg-base-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                Other good places for {activityName} today
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedLocations.map((r) => {
                  const c = scoreColor(r.score);
                  return (
                    <Link
                      key={r.slug}
                      href={r.url}
                      className="card bg-base-200 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="card-body p-4 flex flex-row items-center justify-between">
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-base-content/60">
                            {r.region}, {r.country}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${c.bg} ${c.text} font-bold`}
                        >
                          {r.score}
                        </span>
                      </div>
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
        <section className="px-4 py-14 bg-gradient-to-b from-base-100 to-base-200">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              See {activityName} scored for every hour, every day, for your spot
            </h2>
            <p className="text-base-content/80 mb-6 max-w-2xl mx-auto">
              Go Daisy is a free weather app that scores 100+ activities — set
              your home location, pick the ones you do, and we&rsquo;ll tell you
              when each is on.
            </p>
            <Link href="/" className="btn btn-primary btn-lg">
              Open Go Daisy — free
            </Link>
          </div>
        </section>

        <section className="px-4 py-8 bg-base-200 border-t border-base-300">
          <div className="max-w-4xl mx-auto text-center text-sm text-base-content/70">
            <p className="mb-2">
              Score for {activityName} in {location.name} updated hourly.
              Free, ad-free. Built by independent makers in the UK and Asturias, Spain.
            </p>
            <p>
              Weather data from OpenWeather, Stormglass and api.met.no.
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
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-4">
        <div className="text-xs uppercase tracking-wide text-base-content/60">
          {label}
        </div>
        <div className="text-xl font-semibold mt-1">{value}</div>
      </div>
    </div>
  );
}
