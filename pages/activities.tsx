/**
 * `/activities` — every activity Go Daisy keeps pages for.
 *
 * The top of the estate. It was in the sitemap at priority 0.8 for months while
 * returning 404, because `pages/[activity]/` held only `[location].tsx` and
 * nothing sat above it; the design handoff's own breadcrumb reads
 * "Go Daisy › Activities › Surfing" for a page that did not exist. It is here
 * now, and it is what every spot page and every hub breadcrumbs up to.
 *
 * WHAT IT IS NOT. The old landing page carried this taxonomy as ~104 activity
 * names rendered `{sub.activities.join(' · ')}` inside a `<p>` — plain text, no
 * links, a wall. That is the thing this replaces: the same taxonomy, every
 * entry a real indexable link to a page that answers a question.
 *
 * A STATIC PAGE ON PURPOSE. It scores nothing and fetches no forecast, so it is
 * generated once and revalidated daily rather than hourly. The hubs carry
 * today; this carries the shape.
 *
 * @module pages/activities
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { GetStaticProps } from 'next';
import SEO from '../components/SEO';
import { PageHeader } from '../components/call/PageHeader';
import GetTheApp from '../components/GetTheApp';
import { getAllSeoPagePaths, getLocationsForActivity } from '../data/seoLocations';
import { activityTypes } from '../data/activityTypes';
import { activityIdToSlug, prettyActivityName } from '../lib/seo/activityNames';
import { activitiesWithHubs } from './[activity]/index';

const Footer = dynamic(() => import('../components/footer'), { ssr: false });

interface Entry {
  id: string;
  name: string;
  /** The hub where there is one, otherwise the single spot page. */
  url: string;
  spots: number;
  hasHub: boolean;
}

interface ActivitiesProps {
  groups: Array<{ category: string; items: Entry[] }>;
  totalActivities: number;
  totalPages: number;
  totalHubs: number;
}

/**
 * Display order for the categories, home-market first.
 *
 * `activityTypes` carries them in whatever order the data files merged, which
 * puts "Creative & Arts" above "Active Sports" on a page about going outside.
 * Anything not named here falls to the end in its own order rather than being
 * dropped — a new category should look wrong, not disappear.
 */
const CATEGORY_ORDER = [
  'Active Sports',
  'Outdoor Activities',
  'Winter Sports',
  'Outdoor Leisure',
  'Fitness & Wellness',
  'Creative & Arts',
];

export const getStaticProps: GetStaticProps<ActivitiesProps> = async () => {
  const counts = new Map<string, number>();
  for (const { activity } of getAllSeoPagePaths()) {
    counts.set(activity, (counts.get(activity) ?? 0) + 1);
  }

  const hubs = new Set(activitiesWithHubs());
  const byId = new Map(activityTypes.map((a) => [a.id, a]));

  const entries: Array<Entry & { category: string }> = [...counts.keys()]
    .map((id) => {
      const activity = byId.get(id);
      const spots = counts.get(id) ?? 0;
      /*
       * An activity with too few spots for a hub still gets a link — to its one
       * spot page. Hurling and Gaelic football are the two, both at Dublin.
       * Sending them nowhere would recreate the orphaning this page exists to
       * end, one page at a time.
       */
      const only = hubs.has(id) ? null : getLocationsForActivity(id)[0];
      return {
        id,
        name: prettyActivityName(id),
        url: hubs.has(id)
          ? `/${activityIdToSlug(id)}`
          : `/${activityIdToSlug(id)}/${only?.slug ?? ''}`,
        spots,
        hasHub: hubs.has(id),
        category: activity?.category ?? 'Everything else',
      };
    })
    .filter((e) => e.url.endsWith('/') === false);

  const categories = [
    ...CATEGORY_ORDER.filter((c) => entries.some((e) => e.category === c)),
    ...[...new Set(entries.map((e) => e.category))].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  const groups = categories.map((category) => ({
    category,
    items: entries
      .filter((e) => e.category === category)
      .sort((a, b) => b.spots - a.spots || a.name.localeCompare(b.name))
      .map(({ id, name, url, spots, hasHub }) => ({ id, name, url, spots, hasHub })),
  }));

  return {
    props: {
      groups,
      totalActivities: activityTypes.length,
      totalPages: getAllSeoPagePaths().length,
      totalHubs: hubs.size,
    },
    // Daily. Nothing here changes with the weather — only with the dataset.
    revalidate: 86_400,
  };
};

export default function ActivitiesIndex({
  groups,
  totalActivities,
  totalPages,
  totalHubs,
}: ActivitiesProps) {
  const canonicalUrl = 'https://godaisy.io/activities';
  const pageTitle = 'Every activity Go Daisy scores';
  const pageDescription =
    `${totalActivities} activities, ${totalHubs} of them with a ranked page of the best places ` +
    `today — surfing, hiking, padel, cricket, stargazing, sea swimming and more. ` +
    `Live weather scoring, free and ad-free.`;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Go Daisy', item: 'https://godaisy.io' },
      { '@type': 'ListItem', position: 2, name: 'Activities', item: canonicalUrl },
    ],
  };

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} url={canonicalUrl} />
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
        />
      </Head>

      <PageHeader />

      <main className="gd-spot">
        <section className="gd-spot-hero">
          <div className="gd-spot-inner">
            <nav className="gd-spot-crumbs" aria-label="Breadcrumb">
              <Link href="/">Go Daisy</Link>
              {' › '}
              <span>Activities</span>
            </nav>

            <h1 className="gd-spot-q">What do you actually do?</h1>

            <p className="gd-spot-lede">
              Go Daisy scores {totalActivities} of them, each on its own terms — what makes a good
              day for surfing is a write-off for cricket. {totalHubs} have a page ranking the best
              places today, across {totalPages.toLocaleString('en-GB')} spot pages in all.
            </p>
            <p className="gd-spot-prose">
              And this is a shortlist, not a limit: the scoring takes a coordinate, so anywhere on
              earth can be scored for any of them.{' '}
              <Link href="/start" className="gd-hub-cta">
                Set up your own — free
              </Link>
            </p>
          </div>
        </section>

        {groups.map((g) => (
          <section key={g.category} className="gd-spot-section">
            <div className="gd-spot-inner">
              <h2 className="gd-spot-h2">{g.category}</h2>
              <ul className="gd-hub-chips">
                {g.items.map((a) => (
                  <li key={a.id}>
                    <Link href={a.url} className="gd-hub-chip">
                      <span className="capitalize">{a.name}</span>
                      {/*
                        * The count is the honest signal of what is behind the
                        * link: a hub ranking 106 places and a single spot page
                        * should not look identical.
                        */}
                      <span className="gd-hub-chip-count">
                        {a.spots}
                        {!a.hasHub && <span className="sr-only"> spot page</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}

        <GetTheApp placement="activities_index" />
      </main>

      <Footer />
    </>
  );
}
