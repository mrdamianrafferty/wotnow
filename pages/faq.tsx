/**
 * Go Daisy — full FAQ page at /faq (lowercase URL).
 *
 * Replaces the role that the existing `pages/FAQs.tsx` was filling with a
 * lowercase, indexable URL. The existing FAQs.tsx (with the surf grading
 * deep-dive) can stay as a more specialist sub-page if you want, or its
 * content can be folded into the surf-specific FAQs below.
 *
 * SEO surface:
 *   - `<h1>` with the primary FAQ keyword
 *   - All Q/A in plain text in the rendered HTML
 *   - FAQPage JSON-LD for the rich-result expand/collapse arrows
 *   - Internal links back to the landing page and across to the app
 */

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import AppHeader from '../components/AppHeader';
import dynamic from 'next/dynamic';
import SEO from '../components/SEO';

const Footer = dynamic(() => import('../components/footer'), { ssr: false });

// ============================================================================
// FAQ content — grouped so the page is scannable and so JSON-LD can include
// every question. Update text here; JSON-LD updates automatically.
// ============================================================================

interface FaqItem {
  q: string;
  a: string;
}

interface FaqGroup {
  title: string;
  items: FaqItem[];
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What does Go Daisy do?',
        a: "Go Daisy is a free weather app organised around the things you want to do, not the weather itself. You tell it which activities you care about — from surfing and hiking to padel, cricket and Sunday pub afternoons — and it reads the forecast to tell you when conditions are right for each one. Less '70% chance of rain at 3pm', more 'great evening for a swim, terrible morning for the bike, classic museum afternoon.'",
      },
      {
        q: 'How many activities does Go Daisy cover?',
        a: 'Over 100, organised into six worlds: active sports (team, individual, water, action), fitness and wellness, outdoor activities (nature, fishing, kicking back), winter sports (snow and ice), creative and arts, and indoor recreation. The full list is on the home page — and you only see the ones you tell us you care about.',
      },
      {
        q: 'Is Go Daisy free?',
        a: 'Yes — completely. No paywall, no premium tier, no ads, no in-app purchases. Go Daisy is the part of what we do that is for everyone, and we mean to keep it that way.',
      },
      {
        q: 'How does Go Daisy make money if it is free?',
        a: 'It does not, directly — and that is the point. Go Daisy is free because it is how people discover what we do. We make our living from deeper specialist apps for people who go further into one thing: Findr for sea anglers, Rise Daisy for fly fishers, and Grow Daisy for serious gardeners. If you discover through Go Daisy that one of those is yours, we hope you will come along. If not, Go Daisy is yours, free, forever — no upsell screens, no premium features kept behind a wall.',
      },
      {
        q: 'Do you sell my data?',
        a: 'No. Go Daisy is independent and not ad-funded. We use your location to fetch weather for it, and we store your activity preferences so the app remembers them. See our privacy policy for full detail.',
      },
      {
        q: 'Who makes Go Daisy?',
        a: 'A small independent team based in the UK and Asturias, Spain. We also make Findr (for sea anglers), Rise Daisy (for fly fishers), and Grow Daisy (for gardeners). All four apps share the same idea: weather should be answered as a question about your life, not as a list of numbers.',
      },
    ],
  },
  {
    title: 'Activities',
    items: [
      {
        q: 'Which activities does Go Daisy cover?',
        a: 'Currently over 100 activities across six categories: active sports (water, team, individual, action), fitness and wellness (mindfulness, cardio, strength), outdoor activities (nature, fishing, kicking back), winter sports (snow and ice), creative and arts (visual, music, literature), and indoor recreation (home, social, indoor sports).',
      },
      {
        q: 'Does Go Daisy cover water sports?',
        a: 'Yes — surfing, stand-up paddleboarding (SUP) on sea and inland, kayaking and sea kayaking, canoeing, sea swimming, wild swimming, snorkelling, sailing on sea and inland, windsurfing on sea and inland, kitesurfing, jet skiing, scuba diving and sea fishing from shore or boat. We pull wave height, swell period and direction, wind, sea temperature, tides and UV from Stormglass marine services and score each sport on its own terms — because "good for SUP" and "good for kitesurfing" are almost opposite forecasts.',
      },
      {
        q: 'Does Go Daisy cover wild swimming?',
        a: 'Yes. Wild swimming has its own score, separate from sea swimming and indoor swimming, because the things that make a wild swim safe and pleasant are different: water temperature trend, air temperature for the exit, recent rainfall (for run-off and visibility), and current weather at the spot rather than five miles away.',
      },
      {
        q: 'Does Go Daisy cover football and team sports?',
        a: 'Yes — football, rugby, cricket, hockey, netball, basketball (outdoor), beach volleyball, American football, baseball, hurling, camogie, Gaelic football and ice hockey. Outdoor team sports are scored on rainfall in the previous 24 hours and the next 6, ground conditions, wind, and visibility. Cricketers in particular get a strict answer because cricket has the strictest weather; GAA fans get proper treatment instead of being a footnote.',
      },
      {
        q: 'Does Go Daisy cover padel and pickleball?',
        a: 'Yes — and they are scored properly, not just lumped under "tennis". Padel scores account for wind on the cage and surface drying time; pickleball scores account for wind on the ball, court conditions and the hot-hour curve. Both are also covered in their indoor-court forms where the weather still matters for getting to the court but not for the game itself.',
      },
      {
        q: 'Does Go Daisy cover hiking and trail running?',
        a: 'Yes. Hiking and trail running get separate scores from road running because mountain conditions behave differently from valley conditions — we read cloud base, freezing level, wind chill at altitude, and ground saturation where the data supports it. What is comfortable in the car park can be properly nasty on the tops, and Go Daisy tries to tell you that before you set off.',
      },
      {
        q: 'Does Go Daisy cover cycling?',
        a: 'Yes — road cycling, mountain biking, gravel biking, urban cycling for getting about, and motorbike riding. We weight wind direction and gust speed heavily — a calm 15°C morning with a 30 mph crosswind is not the same ride as a calm 15°C morning without one.',
      },
      {
        q: 'Does Go Daisy cover stargazing and astronomy?',
        a: 'Yes. Stargazing gets a clear-sky score combining cloud cover, moon phase, moon illumination, twilight times (civil, nautical, astronomical) and ISS pass-overs. We do not replace star charts like Stellarium — Go Daisy answers the earlier question: is tonight even worth driving out for?',
      },
      {
        q: 'Does Go Daisy cover winter sports?',
        a: 'Yes — skiing (alpine), snowboarding, cross-country skiing, ice skating, ice hockey (outdoor and indoor), curling, and ice fishing. We read snow depth and fresh snowfall for alpine sports, wind chill at altitude, and freeze-thaw history for natural ice. Skiing and cross-country do not want the same conditions, and we score them separately.',
      },
      {
        q: 'Does Go Daisy cover fishing?',
        a: 'Yes — fly fishing on freshwater, coarse fishing, sea fishing from the shore, sea fishing from a boat, and ice fishing. Go Daisy gives you the everyday "is this a fishing day?" answer. For deeper specialist work — river gauges and hatch timing for fly fishers, tide-by-tide marks and bait windows for sea anglers — our sister apps Rise Daisy and Findr go several layers deeper than a general activity app reasonably can.',
      },
      {
        q: 'Does Go Daisy cover gardening?',
        a: 'Yes — outdoor gardening is in the everyday list, scored on soil moisture, soil temperature, frost risk, wind, rainfall and UV so you know whether today is a sowing day, a watering day, a mowing day, a frost-cloth day, or none of the above. For dedicated kitchen-garden and allotment planning with a full plant database, our sister app Grow Daisy at grow.godaisy.io is the right home for that.',
      },
      {
        q: 'What about indoor activities? Does Go Daisy work when the weather is bad?',
        a: 'Yes — and that is where it earns its keep. Go Daisy covers indoor swimming, indoor climbing, indoor tennis, squash, badminton, gym workouts, pilates, yoga, meditation, plus social and home days: pub afternoons, cinema, museums, galleries, bowling, cooking, reading, gaming, crafts, knitting, DIY, making music. When the outdoor scores are bad, the indoor and social activities you have picked get a quiet promotion — so a wet Sunday is not a wasted one.',
      },
      {
        q: 'Does Go Daisy cover yoga, pilates and meditation?',
        a: 'Yes — all three, in both indoor and outdoor versions. Outdoor yoga, outdoor meditation, and pilates and yoga as indoor practices are scored separately, because what matters for a quiet rooftop yoga session (wind, UV, air quality) does not matter for a studio class.',
      },
      {
        q: 'Does Go Daisy cover photography and painting outdoors?',
        a: 'Yes — outdoor painting (plein air) and photography both get dedicated scores. We read light quality, cloud cover, golden-hour times, wind on the easel, and the seasonal sun-angle changes that matter for both.',
      },
    ],
  },
  {
    title: 'Coverage & technology',
    items: [
      {
        q: 'Where in the world does Go Daisy work?',
        a: 'The UK and the rest of Europe — that is where our forecast partners give us the best resolution and where we have tuned the activity scoring. The app works further afield, but UK, Ireland, France, Spain, Portugal, Italy, Germany, the Netherlands, Poland, Sweden and Turkey are the regions where we are confident the predictions are sharp.',
      },
      {
        q: 'What languages does Go Daisy support?',
        a: 'English, Spanish, French, Portuguese, German, Italian, Dutch, Polish, Turkish and Swedish.',
      },
      {
        q: 'Is Go Daisy on Android?',
        a: 'The Android version is built and in closed beta. Google Play asks new apps to put twelve testers through a fortnight of real-world use before launching to the public, and we are recruiting that group now. If you have an Android phone and would like to be one of them, see the Android testers section on the home page. The web app at godaisy.io works in any browser, on any phone, in the meantime.',
      },
      {
        q: 'How is Go Daisy different from Windy, the Met Office app, or AccuWeather?',
        a: 'The general weather apps tell you the weather and trust you to interpret it. Go Daisy tells you whether your thing is on. Windy gives you a beautiful wind map; the Met Office gives you the authoritative UK forecast; AccuWeather gives you the headline numbers. Go Daisy reads the same kinds of data — from Open-Meteo, Stormglass and api.met.no — and then applies it to whichever activities you have told us you do, so you do not have to do the mental arithmetic of "is 14 mph from the south-west too much for a paddleboard at my local lake?" every time you open the app.',
      },
      {
        q: 'Where does the weather data come from?',
        a: 'Open-Meteo for general forecasts, air quality and pollen, Stormglass for marine, wave and tide data, and api.met.no (the Norwegian Meteorological Institute) for high-resolution Northern European forecasting. Tide data and astronomy come from established public ephemerides. We do not run our own weather model — we read the best public and commercial ones and turn the numbers into activity decisions.',
      },
      {
        q: 'How does the surf traffic-light work?',
        a: 'We blend the main ingredients of good surf — wave size, period, swell direction, wind, and tide — into a 0–100 score, then map it to a simple colour: green is fun, clean and safe for intermediates; amber is surfable but mixed; red is poor or unsafe for non-experts. We apply strict safety gates so conditions that are too large or powerful for intermediates are always red-flagged. If a beach orientation is unknown, we grade conservatively and note that wind impact is estimated.',
      },
      {
        q: 'How often is the forecast updated?',
        a: 'Hourly for general conditions and marine data where the underlying provider supports it. Tides and astronomy are calculated continuously. The activity scores recalculate every time you open the app, so the answer is always fresh against the latest forecast.',
      },
    ],
  },
];

// ============================================================================
// JSON-LD for FAQ rich result — built from the same content above
// ============================================================================

const allItems = FAQ_GROUPS.flatMap((g) => g.items);

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: allItems.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: f.a,
    },
  })),
};

// ============================================================================
// Page
// ============================================================================

export default function FAQPage() {
  return (
    <>
      <SEO
        title="Frequently asked questions"
        description="Everything about Go Daisy — what activities we cover (surf, hiking, padel, cricket, stargazing, fishing, gardening and 100+ more), where the data comes from, and how the scoring works. Free, ad-free, UK and Europe."
        url="https://godaisy.io/faq"
      />

      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      </Head>

      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content">
        <section className="px-4 py-12 md:py-20 bg-gradient-to-b from-base-200 to-base-100">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Go Daisy — frequently asked questions
            </h1>
            <p className="text-lg text-base-content/80">
              The full answers — to which activities Go Daisy covers, where
              the data comes from, and what makes a good day for each thing.
            </p>
          </div>
        </section>

        <section className="px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-12">
            {FAQ_GROUPS.map((group) => (
              <div key={group.title}>
                <h2 className="text-2xl md:text-3xl font-bold mb-6">
                  {group.title}
                </h2>
                <div className="join join-vertical w-full">
                  {group.items.map((item) => (
                    <div
                      key={item.q}
                      className="collapse collapse-arrow join-item border border-base-300 bg-base-100"
                    >
                      <input type="checkbox" aria-label={item.q} />
                      <h3 className="collapse-title text-lg font-medium">
                        {item.q}
                      </h3>
                      <div className="collapse-content">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-4 py-16 bg-base-200">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Still curious?
            </h2>
            <p className="text-base-content/80 mb-6">
              Open Go Daisy and pick the activities you care about. The
              answers it gives you for the next seven days will tell you more
              than any FAQ can.
            </p>
            {/* `/start` rather than `/`: a logged-out visitor gets the
                marketing page at `/`, and onboarding needs no account. */}
            <Link href="/start" className="btn btn-primary btn-lg">
              Try the web app — free
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
