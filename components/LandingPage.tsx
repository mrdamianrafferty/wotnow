/**
 * Go Daisy — public marketing landing page.
 *
 * Rendered server-side at `/` for non-authenticated web visitors so that
 * search engines and first-time visitors get rich, indexable content
 * instead of the app skeleton. Capacitor (native iOS/Android) and
 * logged-in users continue to see the app dashboard as before.
 *
 * Conditional rendering happens in `pages/index.tsx` via getServerSideProps.
 *
 * Single-file by design: easier for a non-developer maintainer to find,
 * read and edit every section without hunting through nested components.
 *
 * Sections in order:
 *   1. Hero
 *   2. How it works (3 steps)
 *   3. Activities (the SEO engine — every activity name in plain text)
 *   4. What we read (data sources)
 *   5. Top FAQs (with FAQPage JSON-LD inline)
 *   6. Android tester recruitment
 *   7. Final CTA
 *   8. SoftwareApplication JSON-LD (in the same Head as the FAQ JSON-LD)
 */

import React from 'react';
import Link from 'next/link';
import Head from 'next/head';
import AppHeader from './AppHeader';
import dynamic from 'next/dynamic';
import SEO from './SEO';

const Footer = dynamic(() => import('./footer'), { ssr: true });

// The App Store URL lives in `lib/daisyFamily` now. This file had its own copy
// with a shortened slug — `go-daisy` rather than Apple's own
// `go-daisy-the-active-life-app`. Apple resolves on the id and ignored it, so
// it worked; it just was not the app's name, and it had already drifted from
// the one the spot pages use.
import { APP_STORE_URL } from '../lib/daisyFamily';

// Where the primary CTA sends visitors who want to try the web app.
// `/login` shows the sign-up / sign-in screen.
/*
 * Onboarding, not the sign-in wall.
 *
 * This pointed at `/login` from before the redesign, when the app could not
 * tell you anything without an account. It can now: `/start` asks for three
 * sports and a place, writes the setup cookie and lands on the call, with no
 * account at any point. A button that says "free" and opens a sign-in form is
 * the single worst thing this page could do.
 *
 * `/` is not the answer either — a logged-out visitor is served this same
 * marketing page, so it would be a loop.
 */
const WEB_APP_CTA_URL = '/start';

// ============================================================================
// FAQ data — keep questions phrased exactly as people search for them.
// Update the question/answer text here and the JSON-LD updates automatically.
// ============================================================================


// ============================================================================
// Activity lists by category — full taxonomy from the app.
// Updating this list also updates the rendered SEO surface area.
// ============================================================================

interface ActivityCategory {
  name: string;
  icon: string;
  description: string;
  subCategories: { name: string; activities: string[] }[];
}

const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  {
    name: 'Active sports',
    icon: '🏃‍♂️',
    description:
      'Pitches, courts, water, wheels and walls. Every sport gets its own score because what makes a great day for one is often a wash-out for another.',
    subCategories: [
      {
        name: 'Team sports',
        activities: [
          'Football',
          'Cricket',
          'Rugby',
          'Basketball (outdoor)',
          'Beach volleyball',
          'American football',
          'Baseball',
          'Hurling',
          'Camogie',
          'Gaelic football',
          'Hockey',
          'Netball',
          'Ice hockey',
        ],
      },
      {
        name: 'Individual sports',
        activities: [
          'Golf',
          'Tennis',
          'Indoor tennis',
          'Squash',
          'Badminton',
          'Table tennis',
          'Archery',
          'Pickleball',
          'Indoor volleyball',
          'Padel',
        ],
      },
      {
        name: 'Water sports',
        activities: [
          'Surfing',
          'Stand-up paddleboarding (SUP)',
          'SUP at sea',
          'Kayaking',
          'Sea kayaking',
          'Canoeing',
          'Sea swimming',
          'Indoor swimming',
          'Snorkelling',
          'Scuba diving',
          'Sailing',
          'Inland sailing',
          'Windsurfing',
          'Inland windsurfing',
          'Kitesurfing',
          'Jet skiing',
          'Sea fishing (shore)',
          'Sea fishing (boat)',
        ],
      },
      {
        name: 'Action sports',
        activities: [
          'Mountain biking',
          'Road cycling',
          'Gravel biking',
          'Rock climbing',
          'Rock hopping',
          'Indoor climbing',
          'Skateboarding',
          'Rollerblading',
          'Motorbike riding',
        ],
      },
    ],
  },
  {
    name: 'Fitness & wellness',
    icon: '💪',
    description:
      'For the things you do to feel better. We score the indoor and outdoor versions separately because the conditions that matter are different.',
    subCategories: [
      {
        name: 'Mindfulness',
        activities: [
          'Yoga',
          'Outdoor yoga',
          'Meditation',
          'Outdoor meditation',
          'Pilates',
          'Martial arts',
          'Tai chi',
        ],
      },
      {
        name: 'Cardio & running',
        activities: [
          'Running',
          'Trail running',
          'Cycling',
          'Urban exploring',
        ],
      },
      {
        name: 'Strength & gym',
        activities: [
          'Gym workouts',
          'Outdoor gyms',
          'Zumba',
          'Boxing',
          'Spinning',
        ],
      },
    ],
  },
  {
    name: 'Outdoor activities',
    icon: '🌲',
    description:
      'The big-skies stuff. Nature, fishing and the deceptively important business of doing very little in pleasant weather.',
    subCategories: [
      {
        name: 'Nature',
        activities: [
          'Hiking',
          'Birdwatching',
          'Photography',
          'Foraging',
          'Mushroom hunting',
          'Wild swimming',
          'Outdoor gardening',
          'Stargazing',
        ],
      },
      {
        name: 'Fishing',
        activities: [
          'Fly fishing (freshwater)',
          'Coarse fishing',
          'Sea fishing (shore)',
          'Sea fishing (boat)',
          'Ice fishing',
        ],
      },
      {
        name: 'Kicking back & relaxing',
        activities: [
          'Picnicking',
          'Barbecues',
          'Beach days',
          'Camping',
          'Outdoor gardening',
          'Gaming',
          'Reading',
          'Going to the pub',
          'Outdoor reading',
          'Dog walking',
          'Outdoor playground',
          'Outdoor chess',
          'Outdoor painting',
          'Outdoor music',
        ],
      },
    ],
  },
  {
    name: 'Winter sports',
    icon: '❄️',
    description:
      'Snow and ice each have their own complicated relationship with the weather. We watch snow depth, fresh snowfall, wind chill at altitude, freeze-thaw history — and score skiing, snowboarding, cross-country, skating and natural ice separately.',
    subCategories: [
      {
        name: 'Snow sports',
        activities: ['Skiing (alpine)', 'Snowboarding', 'Cross-country skiing'],
      },
      {
        name: 'Ice sports',
        activities: [
          'Ice skating',
          'Curling',
          'Ice hockey',
          'Ice fishing',
          'Indoor ice hockey',
        ],
      },
    ],
  },
  {
    name: 'Creative & arts',
    icon: '🎨',
    description:
      'For the things that need a particular kind of light, a particular kind of quiet, or a garden that can handle a PA system.',
    subCategories: [
      {
        name: 'Visual arts',
        activities: [
          'Painting',
          'Outdoor painting (plein air)',
          'Crafts',
          'Photography',
          'Knitting',
          'DIY',
        ],
      },
      {
        name: 'Music & performance',
        activities: [
          'Playing records',
          'Making music',
          'Dance',
          'Outdoor music',
        ],
      },
      {
        name: 'Literature & learning',
        activities: ['Reading', 'Outdoor reading'],
      },
    ],
  },
  {
    name: 'Indoor recreation',
    icon: '🏠',
    description:
      'For the days the weather has other ideas. When the outdoor scores are bad, your indoor and social activities get a quiet promotion — so a wet Sunday is not a wasted one.',
    subCategories: [
      {
        name: 'Home activities',
        activities: [
          'Crafts',
          'Knitting',
          'Reading',
          'DIY',
          'Playing records',
          'Cooking',
          'Painting',
          'Gaming',
          'Online time',
        ],
      },
      {
        name: 'Social activities',
        activities: [
          'Going to the pub',
          'Table tennis',
          'Playing cards',
          'Watching a film',
          'Café days',
          'Cinema',
          'Museum',
          'Shopping',
          'Dance',
          'Gallery',
          'Bowling',
        ],
      },
      {
        name: 'Indoor sports',
        activities: [
          'Indoor climbing',
          'Squash',
          'Badminton',
          'Indoor tennis',
          'Indoor swimming',
          'Gym workouts',
          'Pilates',
          'Yoga',
          'Meditation',
        ],
      },
    ],
  },
];

// ============================================================================
// JSON-LD blocks for FAQ rich result + SoftwareApplication
// ============================================================================


const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Go Daisy',
  description:
    'Free weather app for 100+ activities — hiking, surfing, padel, cricket, stargazing, gardening and more. Reads wind, waves, tides, UV, pressure and sky to tell you when each activity is on.',
  applicationCategory: 'WeatherApplication',
  operatingSystem: 'iOS',
  url: 'https://godaisy.io',
  installUrl: APP_STORE_URL,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: ACTIVITY_CATEGORIES.map((c) => c.name).join(', '),
  publisher: {
    '@type': 'Organization',
    name: 'Go Daisy',
    url: 'https://godaisy.io',
  },
};

// ============================================================================
// Component
// ============================================================================

const LandingPage: React.FC = () => {
  return (
    <>
      <SEO
        title="Free weather app for 100+ activities — hiking, surfing, padel, cricket, yoga"
        description="Tell Go Daisy what you do — hiking, surfing, padel, cricket, pilates, stargazing, gardening, even pub afternoons — and we read the wind, waves, tides, UV and sky to tell you when each one is on. Free, ad-free. UK and Europe."
        url="https://godaisy.io"
        type="website"
      />

      <Head>
        {/*
          * The FAQPage structured data went with the visible FAQs.
          *
          * Google's rule is that FAQ markup must correspond to content a
          * visitor can actually see on that page. Keeping the JSON-LD after
          * removing the section would be a structured-data violation, and the
          * kind that gets a manual action rather than a warning. The asset is
          * not lost: `/faq` is a fuller version of the same questions and
          * carries its own markup.
          */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
      </Head>

      <AppHeader />

      <main className="gd-land">
        {/* =================================================================
            HERO
            ================================================================= */}
        <section className="gd-land-hero">
          <div className="gd-land-inner is-centred">
            <h1 className="gd-land-h1">
              Weather-perfect days for the things you actually love.
            </h1>
            <p className="gd-land-lede">
              Tell Go Daisy what you do — from surfing and stargazing to padel,
              pilates and pub afternoons — and we&rsquo;ll read the wind,
              waves, tides, UV and sky to tell you exactly when each one is on.
            </p>

            {/*
              * THE DOOR INTO THE REDESIGN, and it is temporary.
              *
              * `/` server-renders this landing page, not the app home screen —
              * the cookie fork — so this is what a stranger actually sees, and
              * nothing on it pointed at `/call`. The redesign was reachable
              * only by typing the URL or following a shared link, which is no
              * way to dogfood it.
              *
              * It sits BESIDE the existing primary CTA rather than replacing
              * it: which of the two should be primary is a product decision,
              * not a side effect of adding a link. Phase 7 makes `/call` the
              * home screen and deletes this file, and this with it.
              */}
            <div className="flex justify-center mb-4">
              <Link href="/call" className="gd-try-call gd-try-call--hero">
                <span className="gd-try-call-lead">Try the new Go Daisy →</span>
                <span className="gd-try-call-note">
                  One sentence telling you what today is good for. No sign-in.
                </span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-4">
              <Link
                href={WEB_APP_CTA_URL}
                className="gd-app-store"
              >
                Try the web app — free
              </Link>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="gd-land-alt"
              >
                Download for iPhone
              </a>
            </div>

            <p className="gd-land-small">
              Free, forever. No ads. No data sold. UK and Europe, 10 languages.
              iOS today, Android in closed beta —{' '}
              {/* Was an in-page anchor to a section removed for length. The
                  page it points at has always existed. */}
              <Link href="/android-testers" className="gd-land-link">
                help us launch
              </Link>
              .
            </p>

            <div className="mt-6 inline-block badge badge-lg badge-ghost">
              100+ activities. One weather-smart app. Outside <em>and</em> in.
            </div>
          </div>
        </section>

        {/* =================================================================
            HOW IT WORKS
            ================================================================= */}
        <section className="gd-land-band">
          <div className="gd-land-inner">
            <h2 className="gd-land-h2">
              How Go Daisy works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="gd-land-card">
                <div className="gd-land-card-body">
                  <div className="text-4xl mb-2">🧡</div>
                  <h3 className="card-title">1. Tell us what you love</h3>
                  <p>
                    Pick from over a hundred activities across sport, fitness,
                    nature, winter, creative pursuits and indoor recreation.
                    The more we know, the better we can read the weather for
                    it.
                  </p>
                </div>
              </div>
              <div className="gd-land-card">
                <div className="gd-land-card-body">
                  <div className="text-4xl mb-2">🌤️</div>
                  <h3 className="card-title">
                    2. We read the conditions for each one
                  </h3>
                  <p>
                    Wind, waves, tides, UV, pressure, cloud cover, sea
                    temperature, snow conditions, moon phase, ISS passes, soil
                    moisture. Not whether it&rsquo;s raining —{' '}
                    <em>whether it&rsquo;s your kind of weather</em>.
                  </p>
                </div>
              </div>
              <div className="gd-land-card">
                <div className="gd-land-card-body">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="card-title">
                    3. You get a &ldquo;go&rdquo; when conditions line up
                  </h3>
                  <p>
                    Open the app and see what today is made for. And when
                    the weather is properly grim? Go Daisy tells you that
                    too — and what to do instead.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTIVITIES — the SEO engine
            ================================================================= */}
        <section className="gd-land-band is-tint">
          <div className="max-w-6xl mx-auto">
            <h2 className="gd-land-h2">
              What Go Daisy is for
            </h2>
            <p className="gd-land-copy">
              Six worlds, more than a hundred ways to spend a day. Pick the
              ones you do. Ignore the ones you don&rsquo;t.
            </p>

            <div className="space-y-10">
              {ACTIVITY_CATEGORIES.map((category) => (
                <div key={category.name} className="card bg-base-100 shadow-lg">
                  <div className="gd-land-card-body">
                    <h3 className="card-title text-2xl mb-2">
                      <span className="text-3xl mr-2" aria-hidden="true">
                        {category.icon}
                      </span>
                      {category.name}
                    </h3>
                    <p className="gd-land-copy">
                      {category.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.subCategories.map((sub) => (
                        <div key={sub.name}>
                          <h4 className="gd-land-strong">
                            {sub.name}
                          </h4>
                          <p className="gd-land-small">
                            {sub.activities.join(' · ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =================================================================
            WHAT WE READ
            ================================================================= */}
        <section className="gd-land-band">
          <div className="gd-land-inner">
            <h2 className="gd-land-h2">
              The conditions we watch so you don&rsquo;t have to
            </h2>
            <p className="gd-land-copy">
              Professional-grade forecasts from Open-Meteo, Stormglass marine
              services and the Norwegian Meteorological Institute (api.met.no),
              plus tide data and astronomy ephemerides. For any hour of any
              day, Go Daisy can tell you:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  k: 'Air',
                  v: 'Temperature, "feels like", humidity, dewpoint, UV index, pressure and pressure trend, air quality.',
                },
                {
                  k: 'Wind',
                  v: 'Speed, gust, direction — and how that direction matters for your spot.',
                },
                {
                  k: 'Wet',
                  v: 'Rainfall in the last 24 hours, rainfall in the next 6, snow, cloud cover, fog risk.',
                },
                {
                  k: 'Sea',
                  v: 'Wave height, swell period and direction, sea surface temperature, tide times and heights.',
                },
                {
                  k: 'Sky',
                  v: 'Sunrise, sunset, civil/nautical/astronomical twilight, moonrise, moonset, moon phase and illumination, ISS pass-overs.',
                },
                {
                  k: 'Ground',
                  v: 'Soil temperature and soil moisture for gardeners, snow depth and freeze-thaw cycles for winter sports.',
                },
              ].map((item) => (
                <div key={item.k} className="gd-land-card">
                  <div className="gd-land-card-body">
                    <h3 className="text-lg font-semibold">{item.k}</h3>
                    <p className="gd-land-small">{item.v}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="gd-land-copy">
              For each activity you have told us you care about, we score how
              good <em>this hour</em> is for <em>that thing</em>. No mental
              arithmetic required.
            </p>
          </div>
        </section>

        {/* =================================================================
            TOP FAQS
        <section className="gd-land-band">
          <div className="gd-land-inner is-centred">
            <h2 className="gd-land-h2">
              Get out there. Or in. Whichever today asks for.
            </h2>
            <p className="gd-land-copy">
              Download Go Daisy for iPhone, or open the web app and tell us
              what you love. The forecast looks a lot more interesting when
              it&rsquo;s pointed at the things you actually do.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={WEB_APP_CTA_URL}
                className="gd-app-store"
              >
                Try the web app — free
              </Link>
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="gd-land-alt"
              >
                Download for iPhone
              </a>
            </div>
          </div>
        </section>

        {/* =================================================================
            TRUST / FOOTER STRIP
            ================================================================= */}
        <section className="gd-land-foot">
          <div className="gd-land-inner is-centred gd-land-small">
            <p className="mb-2">
              Built by independent makers in the UK and Asturias, Spain.
            </p>
            <p>
              Free for everyone, forever — supported by our specialist sister
              apps, not by ads or by selling your data. Weather data from
              Open-Meteo, Stormglass and api.met.no.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default LandingPage;
