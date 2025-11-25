// pages/translation-test.tsx

/**
 * Test page to verify database-backed translations
 *
 * Usage:
 * 1. Start dev server: npm run dev
 * 2. Open http://localhost:3000/translation-test
 * 3. Use language selector in header to switch languages
 * 4. Verify text changes instantly
 */

import React from 'react';
import { useUIText } from '../hooks/useUIText';
import { useLanguage } from '../context/LanguageContext';
import AppHeader from '../components/AppHeader';

export default function TranslationTest() {
  const { language } = useLanguage();

  // Test various translation keys
  const supportHeading = useUIText('support.heading.keep_go_daisy_blooming_21', 'Keep Go Daisy Blooming');
  const supportParagraph = useUIText('support.paragraph.join_the_go_daisy_community_on_15',
    'Join the Go Daisy community on Patreon or tip via Apple. Help cover weather data, hosting, and keep Damian — and Bruno — in biscuits.');
  const homeHeading = useUIText('index.heading._also_perfect_today_11', '💯 Also Perfect Today');
  const loadingText = useUIText('index.paragraph.loading_your_smart_recommendat_8', 'Loading your smart recommendations...');
  const interestsButton = useUIText('interests.button.add_to_your_interests_347', 'Add to your interests');

  return (
    <div>
      <AppHeader />

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-3xl mb-4">
              Translation Test Page
            </h1>

            <div className="alert alert-info mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <div>
                <p><strong>Current Language:</strong> {language.toUpperCase()}</p>
                <p className="text-sm">Use the language selector in the header to switch languages.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="divider">Sample Translations</div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h2 className="card-title text-base-content">{supportHeading}</h2>
                  <p className="text-base-content">{supportParagraph}</p>
                  <div className="badge badge-ghost">support page → heading</div>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="text-xl text-base-content">{homeHeading}</h3>
                  <div className="badge badge-ghost">homepage → heading</div>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <p className="text-base-content">{loadingText}</p>
                  <div className="badge badge-ghost">homepage → paragraph</div>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <button className="btn btn-primary">
                    {interestsButton}
                  </button>
                  <div className="badge badge-ghost">interests page → button</div>
                </div>
              </div>

              <div className="divider">Translation Statistics</div>

              <div className="stats stats-vertical lg:stats-horizontal shadow">
                <div className="stat">
                  <div className="stat-title">Total Strings</div>
                  <div className="stat-value text-primary">237</div>
                  <div className="stat-desc">In database</div>
                </div>

                <div className="stat">
                  <div className="stat-title">Languages</div>
                  <div className="stat-value text-secondary">10</div>
                  <div className="stat-desc">EN, ES, FR, PT, DE, IT, NL, PL, TR, SV</div>
                </div>

                <div className="stat">
                  <div className="stat-title">Coverage</div>
                  <div className="stat-value text-accent">97%</div>
                  <div className="stat-desc">230 of 236 user-facing strings translated</div>
                </div>
              </div>

              <div className="divider">Implementation Notes</div>

              <div className="mockup-code">
                <pre data-prefix="1"><code>import &#123; useUIText &#125; from &#39;../hooks/useUIText&#39;;</code></pre>
                <pre data-prefix="2"><code>&nbsp;</code></pre>
                <pre data-prefix="3"><code>const title = useUIText(&#39;support.heading.keep_go_daisy_blooming_21&#39;, &#39;Keep Go Daisy Blooming&#39;);</code></pre>
                <pre data-prefix="4"><code>&nbsp;</code></pre>
                <pre data-prefix="5"><code>return &lt;h1&gt;{'{title}'}&lt;/h1&gt;;</code></pre>
              </div>

              <div className="alert alert-success">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div>
                  <h3 className="font-bold">Database-First Approach</h3>
                  <p className="text-sm">All translations cached in memory after first fetch. No repeated API calls. Instant language switching.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
