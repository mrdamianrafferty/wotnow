/**
 * Go Daisy — the front door.
 *
 * Rendered server-side at `/` for a visitor with neither a Supabase session nor
 * a setup cookie. Capacitor and everyone signed in get the app; see
 * `pages/index.tsx`.
 *
 * WHAT THIS REPLACES, AND WHY IT HAD TO GO.
 *
 * A taxonomy wall. Six categories and 104 activity names rendered as
 * `{sub.activities.join(' · ')}` inside a `<p>` — plain text, no links — under
 * the promise "Weather-perfect days for the things you actually love". The same
 * wall the redesign removed from onboarding, still standing on the front door,
 * and the reason a homepage with 4,396 spot pages beneath it linked to exactly
 * none of them: twenty internal links, every one of them to `/login`, `/start`,
 * `/AboutUs` or a legal page.
 *
 * THE TWO DIRECTIONS, TAKEN TOGETHER.
 *
 * The marketing handoff offered three and asked which. This is 1a's hero on
 * 1c's spine, because they answer different halves of the same failure.
 *
 * 1a — "this morning's call" — is the strongest opening in the set. Proof over
 * promise: a real verdict lockup, photographed, and the two kinds of no
 * underneath it, so the page never asks the reader to imagine anything. It is
 * the answer to disbelief, which is the barrier for anyone who has met a
 * weather app before.
 *
 * 1c — "what do you actually do?" — is the only direction whose taxonomy is
 * made of real links. That is not decoration: it is the fix for the orphaning,
 * because every chip is now a hub at `/[activity]` that ranks real places. It
 * is the answer to a crawler, and to self-service.
 *
 * 1b's flat-colour treatment cannot coexist with 1a's photography — the handoff
 * says so and it is right — and its missed-days framing is a guilt trip the
 * copy has to keep arguing with. Left out.
 *
 * EVERY SENTENCE IS THE APP'S OWN. The verdict grammar, the band words, the
 * four hours, the seeded five — all lifted from `lib/godaisy/call/` and
 * `components/call/SetupSteps.tsx` rather than written fresh. A landing page
 * that speaks differently from the product is a landing page that mis-sells it.
 *
 * @module components/LandingPage
 */

import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { PageHeader } from './call/PageHeader';
import dynamic from 'next/dynamic';
import SEO from './SEO';
import GetTheApp from './GetTheApp';
import { APP_STORE_URL } from '../lib/daisyFamily';
import { activityIdToSlug, prettyActivityName } from '../lib/seo/activityNames';
import { DEFAULT_SPORTS } from '../lib/godaisy/call/setup';

const Footer = dynamic(() => import('./footer'), { ssr: true });

/**
 * Onboarding, not the sign-in wall.
 *
 * `/start` asks for sports, a place and an hour, writes the setup cookie and
 * lands on the call, with no account at any point. A button that says "free"
 * and opens a sign-in form is the single worst thing this page could do.
 */
const WEB_APP_CTA_URL = '/start';

export interface LandingPageProps {
  /**
   * The chip row: activities that have a hub to link to.
   *
   * Passed in from `pages/index.tsx` rather than computed here, so the front
   * door does not import the estate's data layer into its own bundle.
   */
  chips: Array<{ id: string; name: string; href: string }>;
  /** How many activities the app scores, and how many spot pages exist. */
  totalActivities: number;
  totalSpotPages: number;
}

// ============================================================================
// The seeded five, in the order onboarding offers them
// ============================================================================

/**
 * The seeds onboarding starts you with, lit in the chip row.
 *
 * Imported rather than retyped — a second copy of this list is a list that will
 * be wrong, and the page would then light five chips that onboarding does not
 * pick. Onboarding seeds five and caps at twelve, and its own line is "Three is
 * plenty to start with", so the copy says that rather than "pick three".
 *
 * Only three of the five reach the row: `cafe` and `reading` are weather-
 * independent and so have no hub to link to. That is the correct outcome and
 * not a gap to paper over — a chip is a promise of a page that answers "where
 * is good for this today", and the weather does not decide either of them.
 */
const SEEDED: readonly string[] = DEFAULT_SPORTS;

// ============================================================================
// The three verdicts, and the two kinds of no
// ============================================================================

/**
 * Specimens, and labelled as such by their kicker.
 *
 * NOT TODAY'S REAL CALL. `/` is served with `Cache-Control: private, no-store`
 * and varies by auth state, so a live verdict here would be an uncached
 * forecast fetch on every anonymous request to the most important page on the
 * site — and a wrong one the moment it went stale. The voice rules forbid a
 * confident sentence over incomplete data, and "Today is a surf day" printed
 * over a day it has not read is exactly that.
 *
 * So each carries a day and a place in its kicker, the way a share card does,
 * and reads as a record of something rather than a claim about now. The live
 * version of this is one tap away and ranks real places: `/surfing`.
 */
const VERDICTS = [
  {
    kicker: 'Tuesday · Hampstead Heath',
    lead: 'Tuesday is',
    clause: 'a trail running day.',
    reason: 'Dry, 17°C. Best in the evening.',
    band: 'prime' as const,
  },
  {
    kicker: 'Wednesday · Clissold Park',
    lead: 'Wednesday is',
    clause: 'nothing special.',
    reason: 'Gusting to 41 km/h with 1.2 mm of rain. Friday is the one.',
    band: 'marginal' as const,
  },
  {
    kicker: 'Thursday · Clissold Park',
    lead: 'Thursday is',
    clause: 'a write-off for padel.',
    reason: '3.1 mm of rain. Friday is the one.',
    band: 'notToday' as const,
  },
];

/** `HOUR_OPTIONS` from `components/call/SetupSteps.tsx`, verbatim. */
const HOURS = [
  { label: 'First thing', when: '6am' },
  { label: 'With the kettle on', when: '7am' },
  { label: 'On the way out', when: '8am' },
  { label: 'The night before', when: '7pm' },
];

/** What the engine reads before anyone is awake. */
const FACTS = [
  { label: 'Wave', value: '1.5 m' },
  { label: 'Swell period', value: '11 s' },
  { label: 'Wind', value: '11 km/h' },
  { label: 'Gust', value: '19 km/h' },
  { label: 'Water', value: '16°C' },
  { label: 'Rain', value: '0.0 mm' },
];

// ============================================================================
// Structured data
// ============================================================================

const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Go Daisy',
  description:
    'Free weather app that scores over a hundred activities — surfing, hiking, padel, cricket, stargazing, sea swimming and more — and sends one sentence a day telling you what today is good for.',
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'iOS',
  url: 'https://godaisy.io',
  installUrl: APP_STORE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  publisher: { '@type': 'Organization', name: 'Go Daisy', url: 'https://godaisy.io' },
};

// ============================================================================
// Component
// ============================================================================

const LandingPage: React.FC<LandingPageProps> = ({
  chips,
  totalActivities,
  totalSpotPages,
}) => {
  /*
   * Enough to show the range, few enough to stay a hero rather than the wall
   * this page is replacing. The rest are one link away at `/activities`, whose
   * whole job is the full list. `landingChips` has already ordered them.
   */
  const shown = chips.slice(0, 19);

  return (
    <>
      <SEO
        title="One sentence a day, about the things you actually do"
        description={`Go Daisy scores ${totalActivities} activities — surfing, trail running, padel, stargazing, sea swimming — against the wind, waves, tides and sky, and tells you what today is good for. Free, ad-free, no account to start.`}
        url="https://godaisy.io"
        type="website"
      />

      <Head>
        {/*
          * The FAQPage markup went with the visible FAQs, and stays gone:
          * Google requires FAQ structured data to correspond to content a
          * visitor can see, and keeping it after removing the section is the
          * kind of violation that earns a manual action rather than a warning.
          * `/faq` carries the fuller version and its own markup.
          */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
      </Head>

      <PageHeader />

      <main className="gd-land">
        {/* =================================================================
            1. THE CALL — proof, before any promise
            ================================================================= */}
        <section className="gd-land-shout">
          <Image
            className="gd-land-shout-photo"
            src="/landing/hero-surf.webp"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className="gd-land-shout-body">
            <p className="gd-land-kicker">Croyde Bay · Saturday, 7:00 am</p>
            <p className="gd-land-lead">Today is</p>
            <h1 className="gd-land-verdict">a surf day.</h1>
            <p className="gd-land-shout-reason">
              1.5 m at 11 seconds. Best before six, and the wind gets up after that.
            </p>
          </div>
        </section>

        <section className="gd-land-band">
          <div className="gd-land-inner gd-land-thesis">
            <div>
              <h2 className="gd-land-h2">
                That is the entire app. One sentence, at an hour you choose, about the
                things you actually do.
              </h2>
              <p className="gd-land-copy">
                Not a forecast to interpret. A decision already made, with the numbers
                behind it one tap away if you want to argue.
              </p>
            </div>
            <div className="gd-land-cta">
              <Link href={WEB_APP_CTA_URL} className="gd-app-store">
                Start Go Daisy — free
              </Link>
              <p className="gd-land-small gd-land-cta-alt">
                Three questions, no account. Or{' '}
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gd-land-link"
                >
                  get it on your iPhone
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* =================================================================
            2. WHAT DO YOU ACTUALLY DO — 1c's spine, and the links that
               make this page part of the site rather than a poster
            ================================================================= */}
        <section className="gd-land-band is-tint">
          <div className="gd-land-inner">
            <h2 className="gd-land-h2">What do you actually do?</h2>
            <p className="gd-land-copy">
              Three is plenty to start with. Go Daisy reads the wind, waves, water
              temperature, soil and sky for exactly those — then sends one sentence
              when the day is worth it.
            </p>

            {/*
              * REAL LINKS, WHICH IS THE POINT.
              *
              * The wall this replaces rendered a hundred and four activity names
              * as text inside a paragraph. These go to `/[activity]` — a hub
              * ranking every place with a page for that activity, today. It is
              * the only thing on this page a crawler can follow into the estate,
              * and until the hubs existed there was nowhere for it to go.
              */}
            <ul className="gd-hub-chips gd-land-chips">
              {shown.map((c) => (
                <li key={c.id}>
                  <Link
                    href={c.href}
                    className={`gd-hub-chip${SEEDED.includes(c.id) ? ' is-seeded' : ''}`}
                  >
                    <span className="capitalize">{c.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/activities" className="gd-hub-chip is-all">
                  Show everything ({totalActivities})
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* =================================================================
            3. THE TWO KINDS OF NO — the most under-sold thing it does
            ================================================================= */}
        <section className="gd-land-band">
          <div className="gd-land-inner">
            <p className="gd-land-eyebrow">What arrives</p>
            <h2 className="gd-land-h2">Always one clause. Often the clause is no.</h2>
            <p className="gd-land-copy">
              And a no always names the next yes — otherwise the app has told you to
              close it and given you no reason to come back.
            </p>

            <div className="gd-land-verdicts">
              {VERDICTS.map((v) => (
                <div key={v.kicker} className={`gd-land-vcard is-${v.band}`}>
                  <p className="gd-land-kicker is-dark">{v.kicker}</p>
                  <p className="gd-land-vcard-lead">{v.lead}</p>
                  <p className="gd-land-vcard-clause">{v.clause}</p>
                  <p className="gd-land-vcard-reason">{v.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            4. THE WORKING
            ================================================================= */}
        <section className="gd-land-band is-tint">
          <div className="gd-land-inner">
            <div className="gd-land-worked">
              <h2 className="gd-land-h2">Read before you were awake</h2>
              <p className="gd-land-small">Open-Meteo · Stormglass · api.met.no</p>
            </div>
            <dl className="gd-land-facts">
              {FACTS.map((f) => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="gd-land-copy">
              Thirty-odd readings an hour, {totalActivities} activities, five bands — so
              the thing on your phone can be four words long. Tap the sentence and the
              working comes up underneath it.
            </p>
          </div>
        </section>

        {/* =================================================================
            5. SPOTS — already scored, and readable without an account
            ================================================================= */}
        <section className="gd-land-band">
          <div className="gd-land-inner">
            <h2 className="gd-land-h2">
              {totalSpotPages.toLocaleString('en-GB')} places, already scored
            </h2>
            <p className="gd-land-copy">
              Look one up without signing up for anything — every one carries today&rsquo;s
              answer, the week ahead and the reasoning behind the number. The app is just
              the part that remembers to tell you.
            </p>
            <p>
              <Link href="/activities" className="gd-land-alt">
                Browse every activity
              </Link>
            </p>
          </div>
        </section>

        {/* =================================================================
            6. ONE MESSAGE A DAY — the hours, from SetupSteps
            ================================================================= */}
        <section className="gd-land-band is-dark">
          <div className="gd-land-inner is-centred">
            <h2 className="gd-land-h2 is-light">One message a day. Nothing else, ever.</h2>
            <p className="gd-land-copy is-light">You pick when it lands.</p>
            <ul className="gd-land-hours">
              {HOURS.map((h) => (
                <li key={h.when}>
                  <span className="gd-land-hour-label">{h.label}</span>
                  <span className="gd-land-hour-when">{h.when}</span>
                </li>
              ))}
            </ul>
            <div className="gd-land-cta">
              <Link href={WEB_APP_CTA_URL} className="gd-app-store">
                Start Go Daisy — free
              </Link>
              <p className="gd-land-small gd-land-cta-alt is-light">
                Sports, a place, an hour. No account at any point.
              </p>
            </div>
          </div>
        </section>

        {/*
          * The same block the spot pages and the hubs carry, with its own
          * placement so the UTMs and `cross_promo_click` can tell the front
          * door apart from everything else.
          */}
        <GetTheApp placement="landing" />

        <section className="gd-land-foot">
          <div className="gd-land-inner is-centred gd-land-small">
            <p>
              Free for everyone, forever — supported by our specialist sister apps, not by
              ads or by selling your data. Built by independent makers in the UK and
              Asturias, Spain. iOS today, Android in closed beta —{' '}
              <Link href="/android-testers" className="gd-land-link">
                help us launch
              </Link>
              .
            </p>
            {/*
              * A narrow escape hatch, not a second CTA. `/` renders this page
              * for anyone with neither a session nor a setup cookie — which
              * includes someone who has both, on a cleared browser. "Start Go
              * Daisy — free" would walk them through onboarding a second time.
              */}
            <p className="gd-land-signin">
              Already have an account?{' '}
              <Link href="/login" className="gd-land-link">
                Sign in
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;

// ============================================================================
// Props, built where the data layer already lives
// ============================================================================

/**
 * The chip row's contents, ordered to show the range.
 *
 * Exported for `pages/index.tsx` to call inside `getServerSideProps`, so the
 * estate's data files stay out of this component's bundle.
 *
 * NOT BY SPOT COUNT. Sorting descending put archery, outdoor basketball, BBQ
 * and beach volleyball at the front — the universal activities all sit at 106
 * and tie, so the row filled with whatever the array happened to hold first.
 * A page whose claim is "it scores the thing you actually do" opening on a
 * near-alphabetical run of the most generic entries argues the opposite.
 *
 * The counts describe a real spread: the sea sports sit at 13–14 because they
 * need a coast, the mountain ones at 24–46, and the universal ones at 106. So
 * the row samples evenly across that spread, which puts surfing beside hiking
 * beside padel — the breadth the sentence above it is claiming.
 *
 * The seeds come first regardless, because they are what onboarding will offer
 * on the next screen and the two should agree.
 */
export function landingChips(
  hubIds: readonly string[],
  spotCounts: ReadonlyMap<string, number>,
): LandingPageProps['chips'] {
  const chip = (id: string) => ({
    id,
    name: prettyActivityName(id),
    href: `/${activityIdToSlug(id)}`,
  });

  const seeds = DEFAULT_SPORTS.filter((id) => hubIds.includes(id));
  const bySpecificity = [...hubIds]
    .filter((id) => !seeds.includes(id))
    .sort(
      (a, b) =>
        (spotCounts.get(a) ?? 0) - (spotCounts.get(b) ?? 0) || a.localeCompare(b),
    );

  /*
   * Evenly spaced indices across the sorted range, then the remainder appended
   * so nothing is lost — the component takes the first N and `/activities`
   * has the rest.
   */
  const SAMPLE = 16;
  const step = Math.max(1, Math.floor(bySpecificity.length / SAMPLE));
  const sampled: string[] = [];
  for (let i = 0; i < bySpecificity.length && sampled.length < SAMPLE; i += step) {
    sampled.push(bySpecificity[i]);
  }
  const remainder = bySpecificity.filter((id) => !sampled.includes(id));

  return [...seeds, ...sampled, ...remainder].map(chip);
}
