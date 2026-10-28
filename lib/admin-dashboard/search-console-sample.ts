/**
 * Made-up Search Console figures for /admin/apps?sample=1. Its own file so the
 * page can load it in the browser: search-console.ts holds the service-account
 * signing, which is server-only.
 */

import { pctDelta } from './family';
import type { SearchConsoleSummary, SearchRow, SiteSearch } from './search-console';
import type { Section } from './types';

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const grantHint = (account: string, property: string) =>
  `Add ${account} as a Restricted user on ${property} (Search Console → Settings → Users and permissions → Add user).`;

/** Same windows as searchWindows: 28 days ending three days ago, and the 28 before. */
function windows(now: Date) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * DAY;
  return { current: { from: iso(end - 27 * DAY), to: iso(end) }, previous: { from: iso(end - 55 * DAY), to: iso(end - 28 * DAY) } };
}

export function sampleSearchConsole(now: Date): Section<SearchConsoleSummary> {
  const w = windows(now);
  const row = (key: string, clicks: number, impressions: number, position: number): SearchRow => ({
    key,
    clicks,
    impressions,
    ctr: round1((clicks / impressions) * 100),
    position,
  });
  const ok = (clicks: number, prevClicks: number, impressions: number, prevImpressions: number, host: string, queries: string[]): Section<SiteSearch> => ({
    state: 'ok',
    data: {
      clicks: { value: clicks, previous: prevClicks, delta: pctDelta(clicks, prevClicks) },
      impressions: { value: impressions, previous: prevImpressions, delta: pctDelta(impressions, prevImpressions) },
      ctr: { value: round1((clicks / impressions) * 100), previous: round1((prevClicks / prevImpressions) * 100) },
      position: { value: 18.4, previous: 21.2 },
      topQueries: queries.map((q, i) => row(q, Math.round(clicks / (i + 3)), Math.round(impressions / (i + 4)), round1(6 + i * 3.1))),
      topPages: ['/', '/about', '/blog', '/pricing', '/help'].map((p, i) =>
        row(`https://${host}${p}`, Math.round(clicks / (i + 2)), Math.round(impressions / (i + 3)), round1(8 + i * 2.4)),
      ),
    },
  });
  const account = 'grewp-analytics-reader@grewp-fdbd2.iam.gserviceaccount.com';
  const missing = (p: string): Section<SiteSearch> => ({ state: 'not_configured', missing: [], hint: grantHint(account, p) });
  return {
    state: 'ok',
    data: {
      window: w.current,
      previous: w.previous,
      account,
      fetchedAt: now.toISOString(),
      sites: [
        {
          id: 'godaisy',
          name: 'Go Daisy',
          property: 'sc-domain:godaisy.io',
          result: ok(412, 380, 21_840, 19_310, 'godaisy.io', ['go daisy', 'surf forecast today', 'stargazing tonight', 'best time to hike', 'wind forecast']),
        },
        {
          id: 'growdaisy',
          name: 'Grow Daisy',
          property: 'sc-domain:godaisy.io',
          result: ok(96, 120, 8_420, 9_105, 'grow.godaisy.io', [
            'when to sow broad beans',
            'grow daisy',
            'companion plants for tomatoes',
            'garlic planting',
            'rhubarb forcing',
          ]),
        },
        {
          id: 'risedaisy',
          name: 'Rise Daisy',
          property: 'sc-domain:risedaisy.com',
          result: ok(1_208, 1_015, 64_300, 58_120, 'www.risedaisy.com', [
            'river test fishing',
            'mayfly hatch 2026',
            'rise daisy',
            'blue winged olive',
            'chalk stream fishing',
          ]),
        },
        { id: 'findr', name: 'Findr', property: 'https://fishfindr.eu/', result: missing('https://fishfindr.eu/') },
        {
          id: 'flycast',
          name: 'Fly Cast',
          property: 'sc-domain:flycastcoach.com',
          result: ok(58, 41, 3_920, 2_870, 'flycastcoach.com', ['fly casting lessons', 'double haul', 'fly cast coach', 'roll cast', 'casting app']),
        },
        { id: 'grewp', name: 'Grewp', property: 'sc-domain:grewp.org', result: { state: 'error', message: 'Search Console 500: Backend Error' } },
      ],
    },
  };
}
