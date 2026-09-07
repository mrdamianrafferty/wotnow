/**
 * The activity hub — "Where is good for surfing today?"
 *
 * The rung that was never built. `pages/[activity]/` held exactly one file,
 * `[location].tsx`, so `/surfing` returned 404 while `/surfing/newquay-cornwall`
 * rendered. Nothing archived, no redirect — 4,559 spot pages sat two segments
 * deep with link equity arriving only from siblings, and the homepage linked to
 * none of them.
 *
 * It is two things stacked, and the second is what keeps it honest:
 *
 *   1. THE INDEXABLE HALF — the literal head term as the h1, a breadcrumb up to
 *      `/activities`, today's ranking across every spot that has a page, the
 *      same set again grouped by region as navigation, sibling activities, and
 *      an FAQ mirroring the `FAQPage` JSON-LD the leaf pages already carry.
 *
 *   2. THE ANYWHERE HALF — a panel saying plainly that the curated set is an
 *      editorial selection and not a limit: the scoring takes a coordinate, so
 *      any coast on earth can be scored on request. Without it a page listing
 *      twenty-one places under "where is good for surfing" is claiming the
 *      world has twenty-one surf spots, which is both untrue and precisely the
 *      shape of a doorway page.
 *
 * ON RANKING GLOBALLY, which the design handoff flagged as decide-before-you-
 * build: the ranking is global and says so — "ranked on today; the order
 * changes every hour" — and the by-region block underneath is the navigation.
 * Ranking Reykjavík against San Diego on one list is meaningless as a
 * recommendation and perfectly meaningful as a fact, which is why the fact is
 * dated and the map is not.
 *
 * @module pages/[activity]/index
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { GetStaticPaths, GetStaticProps } from 'next';
import SEO from '../../components/SEO';
import { PageHeader } from '../../components/call/PageHeader';
import GetTheApp from '../../components/GetTheApp';
import {
  SEO_LOCATIONS,
  getLocationsForActivity,
  type SeoLocation,
} from '../../data/seoLocations';
import { groupByRegion } from '../../data/seoRegions';
import { getActivityScoreForLocation } from '../../lib/seo/getActivityScore';
import { activityTypes } from '../../data/activityTypes';
import {
  activityIdToSlug,
  slugToActivityId,
  prettyActivityName,
} from '../../lib/seo/activityNames';
import { bandFor, BAND_LABEL, type CallBand } from '../../lib/godaisy/call/bands';
import { HUB_MIN_SPOTS, activitiesWithHubs } from '../../lib/seo/hubs';

const Footer = dynamic(() => import('../../components/footer'), { ssr: false });

// ============================================================================
// Page props
// ============================================================================

interface RankedSpot {
  slug: string;
  name: string;
  region: string;
  country: string;
  url: string;
  score: number;
  band: CallBand;
  bandLabel: string;
  /** The one-line reasoning from the scoring engine, where it produced one. */
  note: string;
}

interface SiblingActivity {
  id: string;
  name: string;
  url: string;
  spots: number;
}

interface HubProps {
  activityId: string;
  activitySlug: string;
  activityName: string;
  /** Every spot with a page, best first. */
  ranked: RankedSpot[];
  /** The same set, in display order, for the by-region navigation block. */
  regions: Array<{ label: string; items: Array<{ slug: string; name: string; region: string; url: string }> }>;
  siblings: SiblingActivity[];
  /** How many activities the app scores in total — the anywhere panel's claim. */
  totalActivities: number;
  /** Where the forecast came from, for the colophon. */
  updatedISO: string;
}

// ============================================================================
// Static paths
// ============================================================================

export const getStaticPaths: GetStaticPaths = async () => {
  /*
   * Pre-render nothing, same as the leaf pages.
   *
   * There are only ~64 hubs, so building them all at deploy would be
   * tractable — but each one ranks every spot it covers, and the biggest
   * (running, at 106 locations) is 106 forecast requests. Doing that for every
   * hub inside a deploy is a deploy that fails on somebody's rate limit.
   * On-demand plus `revalidate` spreads the same work across the hour.
   */
  return { paths: [], fallback: 'blocking' };
};

// ============================================================================
// Static props
// ============================================================================

/**
 * How many spot forecasts are in flight at once.
 *
 * Lower than the leaf page's four. A hub is the heaviest page in the estate —
 * one forecast per spot, and `running` covers all 106 locations — and
 * Open-Meteo answers 429 to a burst. Three at a time over 106 spots is around
 * thirty-five short waves, which finishes inside an ISR regeneration and
 * leaves the API alone. See the 429 that turned the whole estate into cached
 * 404s in `__tests__/seoPageAvailability.test.ts`.
 */
const HUB_CONCURRENCY = 3;

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

export const getStaticProps: GetStaticProps<HubProps> = async (ctx) => {
  const activitySlug = (ctx.params as { activity?: string }).activity ?? '';
  const activityId = slugToActivityId(activitySlug);

  // 1. A real activity, with enough spots to be worth a page. Both are
  //    permanent facts about the URL, so `notFound` is the honest answer.
  const activity = activityTypes.find((a) => a.id === activityId);
  if (!activity) return { notFound: true, revalidate: 3600 };

  const spots = getLocationsForActivity(activityId);
  if (spots.length < HUB_MIN_SPOTS) return { notFound: true, revalidate: 3600 };

  // 2. Score every one of them for today. One forecast per spot — they are
  //    different places, so there is nothing to share — held to
  //    HUB_CONCURRENCY in flight.
  const scored = await mapWithConcurrency(spots, HUB_CONCURRENCY, async (l: SeoLocation) => {
    const p = await getActivityScoreForLocation(activityId, l);
    /*
     * A spot we could not price drops out rather than ranking 0/100, exactly as
     * on the leaf page. Silence is not a bad day, and on a page whose entire
     * claim is "ranked best first" a row of noughts is a lie about the sea.
     */
    if (!p) return null;
    const band = bandFor(p.todayScore);
    return {
      slug: l.slug,
      name: l.name,
      region: l.region,
      country: l.country,
      url: `/${activitySlug}/${l.slug}`,
      score: p.todayScore,
      band,
      bandLabel: BAND_LABEL[band],
      note: p.todayReasoning ?? '',
    } satisfies RankedSpot;
  });

  const ranked = scored
    .filter((s): s is RankedSpot => s !== null)
    .sort((a, b) => b.score - a.score);

  /*
   * If nothing scored, the forecast source is down — not a missing page.
   * Throwing returns 500 and caches nothing, where `notFound` would bake a 404
   * over a hub that exists and let Vercel serve it stale afterwards.
   */
  if (!ranked.length) {
    throw new Error(
      `No spot could be scored for ${activityId} — refusing to cache a 404 for a hub that exists.`
    );
  }

  // 3. The same set as navigation, grouped into macro-regions.
  const regions = groupByRegion(
    spots.map((l) => ({
      slug: l.slug,
      name: l.name,
      region: l.region,
      country: l.country,
      url: `/${activitySlug}/${l.slug}`,
    })),
  ).map(({ label, items }) => ({
    label,
    items: items
      .map(({ slug, name, region, url }) => ({ slug, name, region, url }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));

  /*
   * 4. Siblings — the other activities the same places support.
   *
   * Not "every other hub", which for surfing would offer indoor climbing. An
   * activity is a sibling when it is practised at the spots this one is, so the
   * sea sports cluster with the sea sports and the mountain ones with the
   * mountains, without anybody hand-maintaining a taxonomy.
   */
  const hubs = new Set(activitiesWithHubs());
  const spotSlugs = new Set(spots.map((l) => l.slug));
  const overlap = new Map<string, number>();
  for (const l of SEO_LOCATIONS) {
    if (!spotSlugs.has(l.slug)) continue;
    for (const a of l.activities) {
      if (a === activityId || !hubs.has(a)) continue;
      overlap.set(a, (overlap.get(a) ?? 0) + 1);
    }
  }
  /*
   * DISTINCTIVE, not merely overlapping.
   *
   * The first version ranked on share of this activity's spots, and every
   * universal activity scores a perfect 1.0 there — running happens at all 106
   * locations, so it happens at all 13 surf towns too. The surfing hub duly
   * offered running, cycling, urban exploring, photography and outdoor yoga:
   * true, useless, and identical on all sixty-four hubs.
   *
   * What makes a sibling worth showing is that it is common HERE and uncommon
   * everywhere else. Sea swimming is at every surf town and at a fifth of the
   * estate, so it lifts; running is everywhere and cancels out. It is the
   * ordinary tf-idf shape, and it means the sea sports cluster with the sea
   * sports and the mountain ones with the mountains without anybody
   * hand-maintaining a taxonomy.
   */
  const totalLocations = SEO_LOCATIONS.length;
  const siblings: SiblingActivity[] = [...overlap.entries()]
    .map(([id, shared]) => {
      const globalSpots = getLocationsForActivity(id).length;
      const here = shared / spots.length;
      const everywhere = globalSpots / totalLocations;
      return { id, spots: globalSpots, distinctiveness: here / everywhere, here };
    })
    // A sibling has to be genuinely present here, not just rare elsewhere:
    // one shared town out of thirteen is a coincidence, not a relationship.
    .filter((a) => a.here >= 0.5)
    .sort((a, b) => b.distinctiveness - a.distinctiveness || b.here - a.here)
    .slice(0, 12)
    .map(({ id, spots: n }) => ({
      id,
      name: prettyActivityName(id),
      url: `/${activityIdToSlug(id)}`,
      spots: n,
    }));

  return {
    props: {
      activityId,
      activitySlug,
      activityName: prettyActivityName(activityId),
      ranked,
      regions,
      siblings,
      totalActivities: activityTypes.length,
      updatedISO: new Date().toISOString(),
    },
    revalidate: 3600,
  };
};

// ============================================================================
// Component
// ============================================================================

/** How many rows stand open before the rest go behind a disclosure. */
const ROWS_OPEN = 12;

export default function ActivityHub({
  activitySlug,
  activityName,
  ranked,
  regions,
  siblings,
  totalActivities,
  updatedISO,
}: HubProps) {
  const canonicalUrl = `https://godaisy.io/${activitySlug}`;
  const best = ranked[0];
  const countries = new Set(ranked.map((r) => r.country)).size;

  const pageTitle = `Where is good for ${activityName} today?`;
  const pageDescription =
    `Today's best places for ${activityName}, ranked — ${ranked.length} spots across ` +
    `${countries} countries, scored hourly from live weather. ` +
    `Best right now: ${best.name} at ${best.score}/100. Free, ad-free.`;

  /*
   * The FAQ mirrors the JSON-LD exactly, because a rich result that answers a
   * question the page does not visibly answer is the kind of thing Google
   * removes a site for. One array, rendered twice.
   */
  const faqs = [
    {
      q: `How is the ${activityName} ranking worked out?`,
      a:
        `Every spot with a page is scored out of 100 for ${activityName} today, from the same ` +
        `live forecast the app uses, and sorted best first. The scoring reads the conditions that ` +
        `decide this activity in particular — not just whether it is raining. The order changes every hour.`,
    },
    {
      q: `Can you score somewhere that isn't listed?`,
      a:
        `Yes — anywhere, for any of the ${totalActivities} activities Go Daisy scores, in any ` +
        `combination. The ${ranked.length} pages here are the ones we keep and update for search; ` +
        `the scoring itself takes a coordinate, not a place from a list. Set up your own spot and it ` +
        `is scored the same way, for free and without an account.`,
    },
    {
      q: 'How often does this change?',
      a:
        'Every hour. The ranking on this page is today only; each spot page carries the week ahead, ' +
        'the reasoning behind the number, and the measurements it came from.',
    },
    {
      q: 'Is it free?',
      a:
        'All of it, forever. No ads, no upsell, no data sold. Go Daisy is paid for by our specialist ' +
        'sister apps rather than by you.',
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  /*
   * BreadcrumbList, which the leaf pages never had either. It is what puts
   * "godaisy.io › Activities › Surfing" under a search result instead of a
   * bare URL, and it tells a crawler the estate has a shape.
   */
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Go Daisy', item: 'https://godaisy.io' },
      { '@type': 'ListItem', position: 2, name: 'Activities', item: 'https://godaisy.io/activities' },
      { '@type': 'ListItem', position: 3, name: `${activityName} spots`, item: canonicalUrl },
    ],
  };

  /*
   * ItemList over the ranking. It is a ranked list of pages, declared as one —
   * the honest schema for what this page is, and the one that can earn a
   * carousel rather than a snippet.
   */
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: pageTitle,
    numberOfItems: ranked.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: ranked.slice(0, 20).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${s.name}, ${s.country}`,
      url: `https://godaisy.io${s.url}`,
    })),
  };

  /*
   * Collapse only when there is enough left to be worth collapsing.
   *
   * Surfing has thirteen spots, so a flat `slice(0, 12)` produced twelve rows
   * above a disclosure reading "Show all 13 surfing spots" — one row hidden,
   * and Miami missing from a ranking that claims to be every spot with a page.
   * Below the threshold the whole list simply stands open.
   */
  const COLLAPSE_WORTH_IT = 4;
  const collapse = ranked.length - ROWS_OPEN >= COLLAPSE_WORTH_IT;
  const open = collapse ? ranked.slice(0, ROWS_OPEN) : ranked;
  const rest = collapse ? ranked.slice(ROWS_OPEN) : [];

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} url={canonicalUrl} />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      </Head>

      <PageHeader />

      <main className="gd-spot">
        {/* ================================================================
            1. THE QUESTION, AND TODAY'S ANSWER
            ================================================================ */}
        <section className="gd-spot-hero">
          <div className="gd-spot-inner">
            <nav className="gd-spot-crumbs" aria-label="Breadcrumb">
              <Link href="/">Go Daisy</Link>
              {' › '}
              <Link href="/activities">Activities</Link>
              {' › '}
              <span className="capitalize">{activityName}</span>
            </nav>

            <h1 className="gd-spot-q">Where is good for {activityName} today?</h1>

            <p className="gd-spot-lede">
              {ranked.length} {ranked.length === 1 ? 'place' : 'places'} across {countries}{' '}
              {countries === 1 ? 'country' : 'countries'}, ranked best first and rescored every
              hour — and any other spot on earth on request.
            </p>

            {/*
              * The best one today, in the app's own grammar. The subject of a
              * verdict is always the day, never the place; the place is the
              * kicker above it. Same rule as the share cards.
              */}
            <div className="gd-hub-best">
              <p className="gd-hub-best-kicker">
                Best today · {best.name}, {best.region}
              </p>
              <p className="gd-spot-answer">
                Today is {BEST_SENTENCE[best.band]} for {activityName}.
              </p>
              {best.note && <p className="gd-spot-reason">{best.note}</p>}
              <p className={`gd-spot-band is-${best.band}`}>
                <span className="gd-spot-band-label">{best.bandLabel}</span>
                <span className="gd-spot-band-score">
                  {best.score}
                  <span>/100</span>
                </span>
              </p>
              <Link href={best.url} className="gd-hub-best-link">
                {best.name}, in full
              </Link>
            </div>
          </div>
        </section>

        {/* ================================================================
            2. NOT A LIST OF EVERYWHERE — the anti-doorway panel
            ================================================================ */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <div className="gd-hub-anywhere">
              <h2 className="gd-spot-h2">
                These {ranked.length} are the ones we keep a page for. The scoring isn&rsquo;t
                limited to them.
              </h2>
              <p className="gd-spot-prose">
                Go Daisy scores {activityName} from a coordinate, not from a list. Name anywhere on
                earth and it is scored for the next seven days from the same forecast sources —
                nothing to install, and no account. The pages below are an editorial selection kept
                current for search, not the limit of what the app knows.
              </p>
              <p className="gd-spot-prose">
                <Link href="/start" className="gd-hub-cta">
                  Set up your own spot — free
                </Link>
              </p>
              <p className="gd-spot-note">
                Coastal spots are scored on swell, period, wind against the beach and sea
                temperature. Inland ones get soil moisture and freeze&ndash;thaw instead.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            3. THE RANKING — the crawl path down, and the head-term answer
            ================================================================ */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">
              Every {activityName} spot with a page, ranked for today
            </h2>
            <p className="gd-spot-lede">
              Each one carries the week ahead and the reasoning behind its number. Free to read, no
              account.
            </p>

            <ol className="gd-hub-rank">
              {open.map((s, i) => (
                <HubRow key={s.slug} spot={s} position={i + 1} />
              ))}
            </ol>

            {rest.length > 0 && (
              /*
               * A `<details>`, not a button that fetches.
               *
               * Every row is in the HTML either way — which is the entire
               * reason this page exists, so a crawler must never have to run
               * anything to reach a spot page. The disclosure is for the
               * reader's eyes only, and it works with JavaScript off.
               */
              <details className="gd-hub-more">
                <summary>
                  Show the other {rest.length} {activityName} spots
                </summary>
                <ol className="gd-hub-rank" start={ROWS_OPEN + 1}>
                  {rest.map((s, i) => (
                    <HubRow key={s.slug} spot={s} position={ROWS_OPEN + i + 1} />
                  ))}
                </ol>
              </details>
            )}

            <p className="gd-spot-note">
              Ranked on today. The order changes every hour.
            </p>
          </div>
        </section>

        {/* ================================================================
            4. BY REGION — the same set as a map rather than a league table
            ================================================================ */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">By region</h2>
            <p className="gd-spot-lede">
              The ranking above answers &ldquo;where is good today&rdquo;. This answers
              &ldquo;where could I actually get to&rdquo;.
            </p>
            <div className="gd-hub-regions">
              {regions.map((r) => (
                <div key={r.label} className="gd-hub-region">
                  <h3 className="gd-hub-region-title">{r.label}</h3>
                  <ul className="gd-hub-region-list">
                    {r.items.map((s) => (
                      <li key={s.slug}>
                        <Link href={s.url}>
                          {s.name}
                          <span className="gd-hub-region-where">{s.region}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            5. SIBLINGS — the other things these same places decide
            ================================================================ */}
        {siblings.length > 0 && (
          <section className="gd-spot-section">
            <div className="gd-spot-inner">
              <h2 className="gd-spot-h2">Other things these places decide</h2>
              <p className="gd-spot-lede">
                Same spots, different criteria. Each has its own hub.
              </p>
              <ul className="gd-hub-chips">
                {siblings.map((a) => (
                  <li key={a.id}>
                    <Link href={a.url} className="gd-hub-chip">
                      <span className="capitalize">{a.name}</span>
                      <span className="gd-hub-chip-count">{a.spots}</span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/activities" className="gd-hub-chip is-all">
                    All {totalActivities} activities
                  </Link>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* ================================================================
            6. FAQ — same array as the JSON-LD above
            ================================================================ */}
        <section className="gd-spot-section">
          <div className="gd-spot-inner">
            <h2 className="gd-spot-h2">Questions people ask</h2>
            <div className="gd-hub-faq">
              {faqs.map((f) => (
                <div key={f.q} className="gd-hub-faq-item">
                  <h3 className="gd-hub-faq-q">{f.q}</h3>
                  <p className="gd-hub-faq-a">{f.a}</p>
                </div>
              ))}
            </div>
            <p className="gd-spot-colophon">
              Scored from Open-Meteo, Open-Meteo Marine and api.met.no. Last updated{' '}
              {new Date(updatedISO).toUTCString().slice(17, 22)} UTC.
            </p>
          </div>
        </section>

        {/*
          * `activity_hub`, not `footer`. The placement lands in the UTM and in
          * the `cross_promo_click` event, and telling the hubs apart from every
          * other GetTheApp on the site is the only way to answer whether they
          * send anyone anywhere — which is the question they were built to
          * answer.
          */}
        <GetTheApp placement="activity_hub" />
      </main>

      <Footer />
    </>
  );
}

// ============================================================================
// One row of the ranking
// ============================================================================

/**
 * The prose band form, as `bandWords` on the leaf page uses it.
 *
 * "Today is Prime for surfing" is not English, and the badge form cannot be
 * lower-cased into a sentence. Same table as `pages/[activity]/[location].tsx`
 * — it is small enough that a shared import would cost more than it saves, and
 * the leaf page's own comment explains why the vocabulary matters.
 */
const BEST_SENTENCE: Record<CallBand, string> = {
  prime: 'a prime day',
  worthALook: 'a day worth a look',
  marginal: 'nothing special',
  notToday: 'not the day',
  unsafe: 'one to sit out',
};

function HubRow({ spot, position }: { spot: RankedSpot; position: number }) {
  return (
    <li className="gd-hub-row">
      <Link href={spot.url} className="gd-hub-row-link">
        <span className="gd-hub-row-n">{String(position).padStart(2, '0')}</span>
        <span className="gd-hub-row-place">
          <span className="gd-hub-row-name">{spot.name}</span>
          <span className="gd-hub-row-where">
            {spot.region}, {spot.country}
          </span>
        </span>
        <span className="gd-hub-row-note">{spot.note}</span>
        <span className={`gd-spot-band is-${spot.band} gd-hub-row-band`}>
          <span className="gd-spot-band-label">{spot.bandLabel}</span>
        </span>
        <span className="gd-hub-row-score">{spot.score}</span>
      </Link>
    </li>
  );
}
