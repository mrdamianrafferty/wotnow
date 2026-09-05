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
const WEB_APP_CTA_URL = '/login';

// ============================================================================
// FAQ data — keep questions phrased exactly as people search for them.
// Update the question/answer text here and the JSON-LD updates automatically.
// ============================================================================

interface FaqItem {
  q: string;
  a: string;
}

const TOP_FAQS: FaqItem[] = [
  {
    q: 'What does Go Daisy do?',
    a: "Go Daisy is a free weather app organised around the things you want to do, not the weather itself. You tell it which activities you care about — from surfing and hiking to padel, cricket and Sunday pub afternoons — and it reads the forecast to tell you when conditions are right for each one. Less '70% chance of rain at 3pm', more 'great evening for a swim, terrible morning for the bike, classic museum afternoon.'",
  },
  {
    q: 'How many activities does Go Daisy cover?',
    a: 'Over 100, organised into six worlds: active sports (team, individual, water, action), fitness and wellness, outdoor activities (nature, fishing, kicking back), winter sports, creative and arts, and indoor recreation. You only see the ones you tell us you care about.',
  },
  {
    q: 'Is Go Daisy free?',
    a: 'Yes — completely. No paywall, no premium tier, no ads, no in-app purchases. Go Daisy is the part of what we do that is for everyone, supported by our deeper specialist apps for anglers, fly fishers and gardeners.',
  },
  {
    q: 'Does Go Daisy cover water sports?',
    a: 'Yes — surfing, stand-up paddleboarding (SUP) on sea and inland, kayaking and sea kayaking, canoeing, sea swimming, wild swimming, snorkelling, sailing on sea and inland, windsurfing on sea and inland, kitesurfing, jet skiing, scuba diving and sea fishing from shore or boat. We pull wave height, swell period and direction, wind, sea temperature, tides and UV from Stormglass marine services and score each sport on its own terms.',
  },
  {
    q: 'Does Go Daisy cover padel, pickleball and team sports?',
    a: 'Yes — and they are scored properly, not lumped under "tennis". Padel and pickleball each have their own scoring; team sports include football, rugby, cricket, basketball, beach volleyball, American football, baseball, hurling, camogie, Gaelic football, hockey, netball and ice hockey. Cricket gets the strictest answer because cricket has the strictest weather.',
  },
  {
    q: 'What about winter sports and indoor activities?',
    a: 'Yes to both. Winter: skiing (alpine), snowboarding, cross-country skiing, ice skating, curling, ice hockey, ice fishing. Indoor: indoor climbing, indoor tennis, squash, badminton, indoor swimming, gym, pilates, yoga, meditation — plus social and home days like the pub, cinema, museums, galleries, bowling, cooking, reading, gaming, crafts and making music. When the outdoor scores are bad, the indoor activities you have picked get a quiet promotion.',
  },
  {
    q: 'How is Go Daisy different from Windy or the Met Office?',
    a: 'General weather apps tell you the weather and trust you to interpret it. Go Daisy tells you whether your thing is on. We read the same kinds of data — from Open-Meteo, Stormglass and api.met.no — and then apply it to whichever activities you have told us you do, so you do not have to do the mental arithmetic of "is 14 mph from the south-west too much for a paddleboard at my local lake?" every time you open the app.',
  },
  {
    q: 'Is Go Daisy on Android?',
    a: 'The Android version is built and in closed beta. Google Play asks new apps to put twelve testers through a fortnight of real-world use before launching to the public, and we are recruiting that group now. If you have an Android phone and would like to be one of our twelve, see the Android testers section on this page. The web app at godaisy.io works in any browser, on any phone, in the meantime.',
  },
];

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

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: TOP_FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
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
              <a href="#android-testers" className="link link-primary">
                help us launch
              </a>
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
            ================================================================= */}
        <section className="gd-land-band is-tint">
          <div className="gd-land-inner">
            <h2 className="gd-land-h2">
              Frequently asked questions
            </h2>

            <div className="join join-vertical w-full">
              {TOP_FAQS.map((faq, i) => (
                <div
                  key={faq.q}
                  className="gd-land-faq"
                >
                  <input
                    type="checkbox"
                    aria-label={faq.q}
                    defaultChecked={i === 0}
                  />
                  <h3 className="collapse-title text-lg font-medium">
                    {faq.q}
                  </h3>
                  <div className="collapse-content">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link href="/faq" className="link link-primary">
                See the full FAQ &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            ANDROID TESTER RECRUITMENT
            ================================================================= */}
        <section
          id="android-testers"
          className="px-4 py-16 bg-gradient-to-b from-base-100 to-base-200"
        >
          <div className="gd-land-inner is-centred">
            <div className="text-5xl mb-4" aria-hidden="true">
              🤖
            </div>
            <h2 className="gd-land-h2">
              Help us launch on Android.
            </h2>
            <p className="gd-land-copy">
              The Android version of Go Daisy is built and ready. Google Play
              asks us to find twelve testers to use it on real Android phones
              for two weeks before we can release it to the world — so
              that&rsquo;s what we&rsquo;re doing.
            </p>

            <ul className="gd-land-copy">
              <li>
                <span className="text-success">✓</span> Early access to Go
                Daisy on Android, before anyone else
              </li>
              <li>
                <span className="text-success">✓</span> Free lifetime access
                to our specialist sister apps (Findr, Rise Daisy, Grow Daisy)
                when they ship on Android
              </li>
              <li>
                <span className="text-success">✓</span> A direct line to us
                for feedback
              </li>
            </ul>

            <p className="gd-land-small">
              About ten minutes a week of normal use. No bug-hunting expected.
              We just need real phones in real hands for the fortnight Google
              needs.
            </p>

            {/*
              TODO: wire this button to a real sign-up form.
              Simplest path: a Supabase table `android_testers` with columns
              email, country, primary_activity, created_at — and a Resend
              confirmation email. See the Android tester recruitment plan
              for details.
            */}
            <Link
              href="/android-testers"
              className="gd-app-store"
            >
              Sign me up as an Android tester &rarr;
            </Link>
          </div>
        </section>

        {/* =================================================================
            FINAL CTA
            ================================================================= */}
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
