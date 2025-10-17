// FAQs.tsx
// Site-wide FAQ for Go Daisy. Single accordion with clear, friendly answers.
// British English spellings. DaisyUI/ Tailwind classes.

import AppHeader from "../components/AppHeader";
import Footer from "../components/footer";

export default function SurfSiteFAQ() {
  const Item: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="collapse collapse-arrow join-item border border-base-300 bg-base-100">
      <input type="checkbox" />
      <div className="collapse-title text-lg font-medium">{title}</div>
      <div className="collapse-content prose prose-sm max-w-none">{children}</div>
    </div>
  );

  return (
    <>
      <AppHeader />

      <main className="min-h-screen bg-base-100 text-base-content p-6 md:p-12" data-theme="corporate">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Go Daisy — Frequently Asked Questions</h2>

              <div className="join join-vertical w-full mt-4">
                {/* Surf grading explainer */}
                <Item title="How does the surf traffic-light work?">
                  <p>
                    We blend the main ingredients of good surf — <b>wave size</b>, <b>period</b>, <b>swell direction</b>, <b>wind</b>, and <b>tide</b> — into a 0–100 score, then map it to a simple colour:
                  </p>
                  <ul>
                    <li><b>Green</b> — fun, clean and safe for intermediates.</li>
                    <li><b>Amber</b> — surfable but mixed (wind/tide/consistency may be off).</li>
                    <li><b>Red</b> — poor or unsafe for non-experts.</li>
                  </ul>
                  <p>
                    We apply strict <b>safety gates</b> so conditions that are too large or powerful (for intermediates) are always red-flagged. If a beach’s orientation is unknown, we grade conservatively and note that wind impact is estimated. Tides are pulled from the <b>Stormglass Tides API</b> (separate from the main marine feed).
                  </p>
                </Item>

                {/* Data sources */}
                <Item title="Where does the data come from?">
                  <ul>
                    <li><b>Waves & wind:</b> Stormglass marine data (multi-model aggregate).</li>
                    <li><b>Tides:</b> Stormglass Tides API (queried separately for accuracy).</li>
                    <li><b>Spot metadata:</b> beach orientation, tide windows and local notes stored in Go Daisy.</li>
                  </ul>
                  <p>
                    We prefer <b>swell-specific</b> variables (height/period/direction) over “combined wave” to avoid wind-sea distortion.
                  </p>
                </Item>

                {/* Update cadence */}
                <Item title="How often is the forecast updated?">
                  <p>
                    Hourly time-steps for swell and wind; tides follow the official tide table schedule. We refresh the forecast data several times per day as providers publish updates.
                  </p>
                </Item>

                {/* Beach orientation handling */}
                <Item title="What if the beach orientation isn’t known?">
                  <p>
                    We still grade the hour, but we reduce the weight of wind/direction and show “Beach orientation unknown — wind impact estimated.” You can set the orientation later and the grades will automatically improve in accuracy.
                  </p>
                </Item>

                {/* Tides */}
                <Item title="Why do tides matter so much?">
                  <p>
                    Many breaks only work within a certain tide height band. Big spring ranges amplify rip currents and shorebreak — especially with long-period swells. We include a tide score and additional <b>tide safety flags</b> (e.g., spring + long period).
                  </p>
                </Item>

                {/* Safety */}
                <Item title="How do you keep it safe for intermediates?">
                  <p>
                    We use a safety check that forces <b>RED</b> when thresholds are exceeded (e.g., too much long-period power, excessive height, strong onshore winds, severe gusts, tide far outside the workable window). These gates override everything else.
                  </p>
                </Item>

                {/* Best slot */}
                <Item title="How do you choose the best hour of the day?">
                  <p>
                    We score each hour separately and highlight the top pick, preferring <b>Green &gt; Amber &gt; Red</b> when scores are close. You’ll also see short reasons (e.g., “Offshore 8 kt”, “Near tide turn”).
                  </p>
                </Item>

                {/* Colours */}
                <Item title="What do the colours mean exactly?">
                  <ul>
                    <li><b>0–44</b>: Red</li>
                    <li><b>45–69</b>: Amber</li>
                    <li><b>70–100</b>: Green</li>
                  </ul>
                  <p>
                    We also provide a graded colour ramp (scarlet → amber → bold green) to show nuance within each band.
                  </p>
                </Item>

                {/* Icons & licensing */}
                <Item title="Which icons do you use, and are they royalty-free?">
                  <p>
                    We stick to royalty-free libraries like <b>Lucide</b> (MIT), <b>Heroicons</b> (MIT) and <b>SVG Repo</b> (CC0). If we include any CC-BY assets (e.g., Game Icons), we add clear attribution in the app.
                  </p>
                  <ul>
                    <li><b>Green/Amber/Red</b>: same wave glyph tinted by score.</li>
                    <li><b>Period</b>: animated phase speed (e.g., “waves every 10 s”).</li>
                    <li><b>Height</b>: relative size element (e.g., buoy mast or stacked crests) to avoid confusion with period.</li>
                  </ul>
                </Item>

                {/* Accessibility */}
                <Item title="Is the design accessible?">
                  <p>
                    We use high-contrast colour choices, avoid relying on colour alone (badges + labels), respect <code>prefers-reduced-motion</code> for animations, and provide aria-labels for icons. Text on coloured backgrounds uses white with subtle shadow for legibility.
                  </p>
                </Item>

                {/* Regions */}
                <Item title="Which regions are supported?">
                  <p>
                    Anywhere covered by Stormglass. Local accuracy improves when we add spot-specific settings (orientation, tide windows, wind shelter notes).
                  </p>
                </Item>

                {/* Privacy */}
                <Item title="What data do you store about me?">
                  <p>
                    Minimal. If you opt in, we keep your skill level, unit preferences, and favourite spots to personalise grades. No tracking of precise location without explicit permission.
                  </p>
                </Item>

                {/* Known limitations */}
                <Item title="Known limitations">
                  <ul>
                    <li>Sandbar shifts can make otherwise “green” ingredients underperform.</li>
                    <li>Local wind eddies and cliffs can differ from model wind — we adjust when we have crowd-sourced notes.</li>
                    <li>Extreme events (storms, rogue sets) aren’t perfectly captured by any model; always use judgement on the day.</li>
                  </ul>
                </Item>

                {/* Contact */}
                <Item title="How can I give feedback or report an issue?">
                  <p>
                    Please use the in-app feedback button or email <a href="mailto:hello@godaisy.app">hello@godaisy.app</a>. Screenshots help.
                  </p>
                </Item>

                {/* --- TODOs for you to complete --- */}
                <Item title="To-dos / next improvements (for the team)">
                  <ul>
                    <li><b>TODO:</b> Add a per-spot <i>beach orientation</i> list (bearing in degrees) and a quick editor.</li>
                    <li><b>TODO:</b> Define <i>tide profiles</i> per spot (min/max workable height, stage weights, near-turn bonus).</li>
                    <li><b>TODO:</b> Add an <i>Attribution</i> page (if using any CC-BY icons) — include names/links.</li>
                    <li><b>TODO:</b> Expose <i>unit preferences</i> (metres/feet, knots/km h) and persist per user.</li>
                    <li><b>TODO:</b> Implement <i>multi-skill</i> views (Novice / Intermediate / Advanced toggle) affecting safety gates.</li>
                    <li><b>TODO:</b> Add <i>push notifications</i> for “green window starts in X minutes”.</li>
                    <li><b>TODO:</b> Add an <i>accessibility contrast check</i> to the colour ramp (WCAG AA for badges).</li>
                    <li><b>TODO:</b> Optional “<i>local knowledge</i>” notes per spot (e.g., wind shelter, mid-tide banks).</li>
                  </ul>
                </Item>

                {/* Legal */}
                <Item title="Disclaimer">
                  <p>
                    Forecasts are guidance, not guarantees. Ocean conditions can change rapidly. Always follow local advice and surf within your ability.
                  </p>
                </Item>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
// Disable static generation
export async function getServerSideProps() {
  return { props: {} };
}
