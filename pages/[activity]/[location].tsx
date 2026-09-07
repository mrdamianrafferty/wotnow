/**
 * Programmatic SEO page — "Is today a good day for {activity} in {location}?"
 *
 * Dynamic route: /{activity-slug}/{location-slug}
 *   e.g. /surfing/llanes-asturias
 *        /padel/madrid
 *        /stargazing/snowdonia-eryri
 *
 * ISR with fallback: 'blocking' — pages are generated on-demand on first
 * request, cached at the edge, and rebuilt every hour. At 4,559 pages this
 * scales well without overloading deploy builds.
 *
 * Each page targets a real long-tail search query. The combination of fresh
 * scoring data, location-specific copy, internal cross-links, and FAQPage +
 * Place JSON-LD is what keeps these out of "doorway page" territory.
 *
 * NONE OF THAT HELD WHILE THE ESTATE INCLUDED `/knitting/reykjavik`. It was
 * 8,413 pages, 3,854 of them a weather question about something the weather
 * does not decide, and the cross-links were an illusion: both related blocks
 * truncated their candidate set before scoring it, so every page in the site
 * linked to the same handful of generic activities and the first ten cities in
 * the array. See `WEATHER_INDEPENDENT` in data/seoRetiredActivities.ts and
 * steps 5 and 6 below.
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
import { PageHeader } from '../../components/call/PageHeader';
import {
  distanceKm,
  getLocationBySlug,
  getLocationsForActivity,
  type SeoLocation,
} from '../../data/seoLocations';
import {
  fetchForecastForLocation,
  getActivityScoreForLocation,
  type ActivityScorePayload,
} from '../../lib/seo/getActivityScore';
import { useRouter } from 'next/router';
import { activityTypes } from '../../data/activityTypes';
import GetTheApp from '../../components/GetTheApp';
import { bandFor, BAND_LABEL, type CallBand } from '../../lib/godaisy/call/bands';
/*
 * Shared with the hub at `/[activity]` and the index at `/activities`, which
 * have to name and address an activity exactly as this page does or their links
 * 404. They were private functions here until the hub needed them.
 */
import {
  activityIdToSlug,
  slugToActivityId,
  prettyActivityName,
} from '../../lib/seo/activityNames';

const Footer = dynamic(() => import('../../components/footer'), { ssr: false });


// ============================================================================
// Politeness towards the forecast API
// ============================================================================

/**
 * `Promise.all` over a list, but only `limit` in flight at once.
 *
 * The related-locations block fetches a forecast per candidate place, and
 * `Promise.all` issued all twelve simultaneously. One page doing that is fine;
 * a crawler walking the estate is a dozen pages doing it at once, and
 * Open-Meteo answers 429. That was reproduced on the preview deployment — five
 * page requests in ten seconds rate-limited the whole deployment, and because
 * the failure used to become a cached 404, the pages stayed broken after the
 * limit lifted.
 *
 * Four at a time turns a twelve-wide burst into three short waves. The page is
 * built behind ISR with `revalidate: 3600`, so a little more latency once an
 * hour costs nothing that anyone experiences, and the pages come back.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** In flight at once when fetching other locations' forecasts. */
const FORECAST_CONCURRENCY = 4;

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

  /*
   * 4. The forecast for this place, fetched ONCE.
   *
   * This page used to make nineteen `getActivityScoreForLocation` calls and let
   * every one of them fetch its own forecast — one for the page, eight for the
   * related activities AT THIS SAME LOCATION, ten for other locations. Nine of
   * the nineteen were the identical request. Measured cold TTFB was 3.6s, which
   * across the estate is the crawl budget as much as the API bill.
   *
   * `getActivityScoreForLocation` has taken a `prefetched` forecast since it was
   * written, and says in its own docblock that this is what it is for. It was
   * simply never passed. Beyond the cost, N fetches are N chances to straddle a
   * forecast run, which is how one page can rank sailing at Force 3 beside dog
   * walking at Force 4 on the same water in the same hour.
   */
  /*
   * A FAILED FETCH IS NOT A MISSING PAGE.
   *
   * This returned `notFound` when the forecast came back empty, which turns a
   * busy weather API into 404 — for a URL that exists, is in the sitemap, and
   * was rendering a minute earlier. Measured on the preview deployment: a cold
   * cache generated several pages at once, Open-Meteo answered 429, and every
   * one of them became a cached 404. Worse, Vercel then served that 404 stale
   * while revalidating behind it, so it survived the next request too.
   *
   * Google reads 404 as "gone" and 5xx as "come back". Throwing gets the second
   * one: `getStaticProps` raising during on-demand generation returns 500 and
   * caches nothing, and during background revalidation it leaves the previously
   * generated page in place rather than replacing a working page with a 404.
   * That is the behaviour we want in both cases, and it is Next's default —
   * this code was overriding it.
   *
   * The three checks above stay `notFound`, because they are the real thing:
   * that URL is not a page and no retry will change it.
   */
  const forecast = await fetchForecastForLocation(location);
  if (!forecast.length) {
    throw new Error(
      `No forecast for ${location.slug} — refusing to cache a 404 for a page that exists.`
    );
  }

  const score = await getActivityScoreForLocation(activityId, location, undefined, forecast);
  if (!score) {
    throw new Error(
      `No score for ${activityId} at ${location.slug} — refusing to cache a 404 for a page that exists.`
    );
  }

  /*
   * 5. "Also today here" — the top five of EVERYTHING this place does.
   *
   * This scored `otherActivitiesHere.slice(0, 8)`: it truncated before scoring,
   * so the candidate set was always the first eight entries of `UNIVERSAL`, in
   * array order. Live, `/surfing/newquay-cornwall` recommended photography,
   * outdoor yoga, outdoor meditation, urban exploring and yoga. Not sea
   * swimming, not SUP, not kitesurfing.
   *
   * Two things followed. The module was useless to a reader — a surf town's own
   * page, silent about the sea. And because these are the only internal links a
   * spot page carries, every distinctive URL on the site was an orphan
   * reachable from the sitemap and nowhere else.
   *
   * Now every activity here is scored and the top five win it. This costs
   * nothing extra in requests: they all read `forecast` above.
   */
  const otherScoresHere = await Promise.all(
    location.activities
      .filter((a) => a !== activityId)
      .map(async (a) => {
        const p = await getActivityScoreForLocation(a, location, undefined, forecast);
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

  /*
   * 6. "Other good places for this today" — the top five of the NEAREST twelve.
   *
   * Same truncate-before-scoring bug, and one more besides: `slice(0, 10)` took
   * the first ten in file order, so Newquay's surfing page offered New York and
   * Reykjavík. Distance is the fix for both halves — it is a better answer to
   * the reader's actual question ("where else could I go today"), and it builds
   * a regional link graph instead of pointing the whole estate at whichever
   * cities happen to sit at the top of the array.
   *
   * Unlike step 5 these cannot share a forecast — a different place is a
   * different request — so the candidate set stays capped. Twelve nearest, top
   * five shown.
   */
  const NEARBY_CANDIDATES = 12;
  /** A day trip, generously drawn. Beyond it, "also good today" is trivia. */
  const NEARBY_KM = 1500;
  /** Below this, a sparse activity shows distant places rather than nothing. */
  const MIN_CANDIDATES = 3;

  const byDistance = getLocationsForActivity(activityId)
    .filter((l) => l.slug !== location.slug)
    .map((l) => ({ location: l, km: distanceKm(location, l) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, NEARBY_CANDIDATES);

  /*
   * The distance cap, and the escape hatch under it.
   *
   * Twenty-one places have a surfing page and twelve of them are North
   * American, so a count-only cap still offered Jacksonville and Baltimore to
   * someone reading about Newquay — scored honestly, and still trivia. Within
   * 1,500 km Newquay has seven real answers: Dublin, Tynemouth, the three
   * Asturian towns, Biarritz, Lisbon.
   *
   * The fallback matters for the thin ones. Curling has few pages and they are
   * far apart; an empty block there is worse than a distant one, so a sparse
   * activity keeps its nearest five whatever the distance.
   */
  const withinRange = byDistance.filter((c) => c.km <= NEARBY_KM);
  const otherLocations = (withinRange.length >= MIN_CANDIDATES
    ? withinRange
    : byDistance.slice(0, 5)
  ).map((c) => c.location);

  const otherLocScores = await mapWithConcurrency(
    otherLocations,
    FORECAST_CONCURRENCY,
    async (l) => {
      const p = await getActivityScoreForLocation(activityId, l);
      /*
       * A place we could not price is not a place scoring nought.
       *
       * `?? 0` put every failed fetch at the bottom of the ranking rather than
       * out of it — so when Open-Meteo rate-limits, which it does under a burst
       * of ISR builds, the block fills up with towns labelled 0/100 that the
       * forecast never had an opinion about. Silence is not a bad day. Return
       * null and let them fall out; the block simply gets shorter.
       */
      if (!p) return null;
      return {
        slug: l.slug,
        name: l.name,
        region: l.region,
        country: l.country,
        score: p.todayScore,
        url: `/${activitySlug}/${l.slug}`,
      };
    },
  );
  const relatedLocations = otherLocScores
    .filter((l): l is NonNullable<typeof l> => l !== null)
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
  activitySlug,
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
        /*
          * `sport` so the card is about the page. Without it the renderer falls
          * back to the first three activities of the archetype — running,
          * cycling, urban exploring at every seeded place — so this page's one
          * social preview said nothing about surfing.
          */
        image={`https://godaisy.io/api/call/share?place=${location.slug}&sport=${activityIdToSlug(activityId)}&day=0&alt=0&date=${score.weeklyOutlook[0]?.date ?? ''}&crop=og`}
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

      {/*
        * `PageHeader`, not `AppHeader`.
        *
        * The body of this page was redesigned in phase 6 and the header was
        * not, so about 2,500 indexed pages — the largest surface Go Daisy has,
        * and the one a stranger arriving from Google lands on — carried the old
        * DaisyUI navbar and its violet "Log in" above content in the new
        * design. It was the last of them.
        */}
      <PageHeader />

      <main className="gd-spot">
        {/* ===================================================================
            1. HERO — the literal search query, answered
            =================================================================== */}
        <section className="gd-spot-hero">
          <div className="gd-spot-inner">
            <nav className="gd-spot-crumbs" aria-label="Breadcrumb">
              {/*
                * THE RUNG UP, WHICH DID NOT EXIST.
                *
                * This segment was a `<span>`, so `/surfing/newquay-cornwall`
                * named surfing and offered no way to reach it — and until the
                * hub was built there was nowhere for it to go: `/surfing` 404'd
                * while its own children rendered. Every spot page sat two
                * segments deep with link equity arriving only from siblings.
                */}
              <Link href="/">Go Daisy</Link>
              {' › '}
              <Link href="/activities">Activities</Link>
              {' › '}
              <Link href={`/${activitySlug}`} className="capitalize">{activityName}</Link>
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
