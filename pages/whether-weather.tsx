import React from "react";
import { motion } from "framer-motion";
import { Share2, CloudRain, Umbrella, Wind, Cloud, Zap } from "lucide-react";

/**
 * Weather Forecast Explainer Page
 * — Next.js / React + TailwindCSS + daisyUI
 *
 * Drop this component into your app (e.g., app/(marketing)/weather-explainer/page.tsx)
 * or use it as a standalone page. It uses daisyUI utility classes for a clean, 
 * readable layout and tailwind-typography via the `prose` class.
 */

export default function WeatherExplainerPage() {
  return (
    <main className="min-h-screen bg-base-200">
      {/* Hero */}
      <section className="hero bg-base-100/70">
        <div className="hero-content text-center max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="badge badge-info badge-lg">
                <CloudRain className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Forecast 101</span>
              </div>
              <div className="badge badge-outline">Readable • Friendly • British English</div>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
              Why the Weather Forecast Sometimes Gets It Wrong
              <span className="block text-primary">(And What We Can Do About It)</span>
            </h1>
            
            <div className="mt-6 flex items-center justify-center gap-3">
              <button className="btn btn-primary btn-sm">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content grid */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Sidebar */}
          <aside className="lg:col-span-3 order-last lg:order-first">
            <nav className="card bg-base-100 shadow-sm sticky top-4">
              <div className="card-body">
                <h2 className="card-title text-base">On this page</h2>
                <ul className="menu menu-sm">
                  <li><a href="#opening">A familiar frustration</a></li>
                  <li><a href="#coverage">Sparse sensors & microclimates</a></li>
                  <li><a href="#instruments">Instrument quirks & data sharing</a></li>
                  <li><a href="#models">Models & resolution limits</a></li>
                  <li><a href="#politics">Politics in the weather</a></li>
                  <li><a href="#cope">Coping smartly</a></li>
                  <li><a href="#wrap">In short…</a></li>
                  
                </ul>
                <div className="divider my-2"></div>
                <div className="text-sm text-base-content/70">
                  <p className="mb-2">Quick tip:</p>
                  <p className="flex items-start gap-2"><Umbrella className="w-4 h-4 mt-0.5"/> Always keep a compact brolly in your bag.</p>
                  <p className="flex items-start gap-2 mt-1"><Wind className="w-4 h-4 mt-0.5"/> Check two sources when it looks marginal.</p>
                </div>
              </div>
            </nav>
          </aside>

          {/* Article */}
          <article className="lg:col-span-9">
            <div className="card bg-base-100 shadow">
              <div className="card-body">
                <div className="prose prose-sm sm:prose lg:prose-lg max-w-none">
                  <section id="opening">
                    <p>
                      Ah, the weather forecast: that trusty companion we all consult, only to find ourselves caught
                      unprepared in a sudden downpour or wilting under unexpected sunshine. If it sometimes feels like the
                      weather folks are just taking wild guesses, fear not—it’s not just your tea being too weak; there are
                      perfectly good reasons why forecasts mess up, and a few clever ways we can all cope.
                    </p>
                  </section>

                  <section id="coverage">
                    <h2 className="mt-8">Sensors aren’t everywhere (and microclimates are sneaky)</h2>
                    <p>
                      First off, it turns out the weather sensors aren’t exactly everywhere. Parts of Africa, remote northern
                      wastes, and even some spotty corners of the ocean are flying under the radar—literally. So, when your
                      local forecast is based on patchy info, it’s a bit like trying to bake a cake with missing ingredients.
                    </p>
                    <p>
                      And in cities, those pesky little microclimates—yes, your street can have its own mini weather—require a
                      swarm of fancy sensors, which, surprise surprise, are pricey and tricky to keep working. So predicting if
                      Mr. Jenkins down the road will need an umbrella? Still a bit of a lottery.
                    </p>
                  </section>

                  <section id="instruments">
                    <h2 className="mt-8">Instrument quirks & patchy data sharing</h2>
                    <p>
                      Then there’s the lovely quirks of the instruments themselves. Automated weather stations sometimes tell
                      their own tall tales, exaggerating temperatures or forgetting to measure when the rain really buckets down.
                      Plus, nation‑states (bless them) sometimes keep their weather data close to the chest or haven’t quite
                      digitised centuries of climate notes, making global teamwork a touch challenging.
                    </p>
                  </section>

                  <section id="models">
                    <h2 className="mt-8">Models smooth the world (and miss the cheeky bits)</h2>
                    <p>
                      Let’s talk models. These whiz‑bang computers attempt to guess the future by crunching tons of data, but
                      they’re working on grids bigger than your average British garden, so they tend to smooth out local
                      oddities—those rogue gusts or cheeky pop‑up showers don’t always make the cut. And with our minds boggled
                      by the sheer volume of information, these systems occasionally grit their teeth and take longer than we’d
                      like to spit out a forecast.
                    </p>
                  </section>

                  <section id="politics">
                    <h2 className="mt-8">A dash of politics</h2>
                    <div className="alert alert-warning">
                      <Cloud className="w-5 h-5" />
                      <span>
                        Some politicians love to pick fights with internationally recognised, world‑class weather services.
                        Whether it’s budget cuts or public sniping, they sometimes run down these invaluable institutions—perhaps
                        because blaming weather agencies is easier than addressing climate change or infrastructure needs.
                      </span>
                    </div>
                    <p className="mt-2">
                      It’s a pity because these organisations save lives and livelihoods every day, all while coping with the
                      same challenges and data quirks we’ve mentioned.
                    </p>
                  </section>

                  <section id="cope">
                    <h2 className="mt-8">How to keep calm and weather on</h2>
                    <ul>
                      <li>
                        Embrace a little scepticism—and always carry a brolly.
                      </li>
                      <li>
                        Check multiple forecast sources; sometimes two heads (or websites) are better than one.
                      </li>
                      <li>
                        Consider local knowledge: those weathered neighbours often know their patch better than any supercomputer.
                      </li>
                      <li>
                        Lean on tech: smartphone apps with hyper‑local data, community sensors, and AI are improving things fast.
                      </li>
                    </ul>

                    <div className="grid sm:grid-cols-2 gap-4 mt-4">
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <h3 className="card-title text-base"><Zap className="w-4 h-4"/> Quick practice</h3>
                          <p className="text-sm text-base-content/70">Pick two forecast apps and compare their next‑24‑hour outlook; note which one handles showers best in your area.</p>
                        </div>
                      </div>
                      <div className="card bg-base-200">
                        <div className="card-body">
                          <h3 className="card-title text-base"><Wind className="w-4 h-4"/> Local cues</h3>
                          <p className="text-sm text-base-content/70">Watch flags, tree‑tops, hills and sea‑breeze patterns—your microclimate has tells the grid might miss.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="wrap">
                    <h2 className="mt-8">In short…</h2>
                    <p>
                      Weather forecasting is a bit like trying to herd cats in a thunderstorm—tricky, a bit chaotic, and
                      occasionally surprising. But with a dash of humour, a pinch of preparedness, and an eye on emerging tech,
                      we can all outsmart the forecast—most days, at least.
                    </p>
                  </section>

                  
                </div>
              </div>
            </div>
                </article>
              </div>
            </section>
          </main>
        );
      }

export function WhetherWeatherPage() {
  return (
    <div className="container mx-auto p-4">
      <WeatherExplainerPage />
    </div>
  );
}
