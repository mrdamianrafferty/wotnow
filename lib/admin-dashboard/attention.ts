/**
 * "Needs attention" on /admin/apps, derived from the family summary by
 * rules. Pure: the same FamilySummary always gives the same list, worst
 * first, and an empty list means nothing needs attention.
 *
 * Every rule only fires on figures an app actually reported. An app or part
 * that is missing is its own item ("not connected"), never a silent zero
 * feeding another rule.
 */

import { adjustUsers, familyUsers, HOME_COUNTRIES } from './automated';
import { FAMILY_APPS, type AppSnapshot, type FamilyAppId, type FamilySummary, type Part, type PlayPart } from './family';

export type AttentionLevel = 'danger' | 'check' | 'waiting';

export interface AttentionItem {
  level: AttentionLevel;
  /** Stable, for React keys and tests. */
  rule: 'errors_rising' | 'not_reporting' | 'wrong_property' | 'automated_traffic' | 'android_missing' | 'analytics_disagree' | 'automated_vercel' | 'play_release_halted' | 'play_release_draft' | 'play_rollout' | 'rating_low' | 'review_low' | 'play_unreadable';
  /** Apps it is about; empty for a family-wide item. */
  apps: FamilyAppId[];
  /** Who it is about, as shown: an app name, several, or "Android". */
  label: string;
  title: string;
  body: string;
  /** A two- or three-word version for the app card's status pill. */
  short: string;
  /** automated_traffic only: the country, so the page can flag it without parsing copy. */
  country?: { code: string; name: string; visitors: number; share: number };
}

export { HOME_COUNTRIES };

/** Thresholds, named so the tests and the copy agree. */
export const RULES = {
  errorsRisingPct: 50,
  errorsRisingMin: 100,
  wrongPropertyMaxUsers: 5,
  wrongPropertyMinErrors: 100,
  /** Either counter needs this many people before the other being far lower means anything. */
  disagreeMinVisitors: 20,
  /** ...and "far lower" is under this share of it. */
  disagreeRatio: 0.25,
  /** Vercel: a country whose visitors view this many pages each is a script, not people. */
  botViewsPerVisitor: 15,
  /** ...once it has this many visitors or views, so a single curious reader cannot trip it. */
  botMinVisitorsOrViews: 50,
  /** Google Play: a running average under this, or down this much in 30 days, is worth a look. */
  ratingLow: 4,
  ratingDrop: 0.3,
} as const;

const LEVEL_ORDER: Record<AttentionLevel, number> = {
  danger: 0,
  check: 1,
  waiting: 2,
};
const n = (x: number) => x.toLocaleString('en-GB');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const NO_PART: Part<never> = { state: 'not_configured', missing: [] };
const okData = <T>(p: Part<T>): T | null => (p.state === 'ok' ? p.data : null);

const PART_LABELS = {
  downloads: 'Store downloads',
  revenue: 'Revenue',
  analytics: 'Analytics',
  health: 'Health',
} as const;
type PartKey = keyof typeof PART_LABELS;

/** What is wrong with a part, as a phrase after its label ("Health: …"). Null when nothing is. */
function partProblem(p: Part<unknown>): string | null {
  if (p.state === 'error') return `error: ${p.message}`;
  if (p.state === 'not_configured') {
    if (p.missing.length) return `not configured (${p.missing.join(', ')})`;
    return p.note ? p.note.replace(/\.$/, '') : 'not configured';
  }
  return null;
}

/** The same, as a sentence on its own. */
function partSentence(label: string, p: Part<unknown>, why: string): string {
  if (p.state === 'error') return `${cap(why.replace(/^error: /, ''))}.`.replace(/\.\.$/, '.');
  if (p.state === 'not_configured' && !p.missing.length && p.note) return `${cap(why)}.`;
  return `${label} is ${why}.`;
}

function errorsRising(apps: AppSnapshot[], familyErrors: number): AttentionItem[] {
  return apps.flatMap((a) => {
    const e = okData(a.health)?.errors;
    if (!e || e.value < RULES.errorsRisingMin || e.delta === null || e.delta < RULES.errorsRisingPct) return [];
    const share = familyErrors > 0 ? Math.round((e.value / familyErrors) * 100) : 0;
    return [
      {
        level: 'danger' as const,
        rule: 'errors_rising' as const,
        apps: [a.id],
        label: a.name,
        title: `Errors up ${e.delta}% in a week`,
        body: `${n(e.value)} error events against ${n(e.previous)} the week before${share >= 50 ? `, ${share}% of the family total` : ''}. Open its top issues in Sentry.`,
        short: 'Errors rising',
      },
    ];
  });
}

function notReporting(apps: AppSnapshot[]): AttentionItem[] {
  return apps.flatMap((a): AttentionItem[] => {
    if (a.status !== 'ok') {
      return [
        {
          level: 'check',
          rule: 'not_reporting',
          apps: [a.id],
          label: a.name,
          title: a.status === 'not_configured' ? 'Not connected to this dashboard' : 'Didn’t answer',
          body: `${a.message ?? 'No response'}${a.missing?.length ? ` Set ${a.missing.join(' and ')}.` : ''}`,
          short: a.status === 'not_configured' ? 'Not connected' : 'Unavailable',
        },
      ];
    }
    const parts: { label: string; part: Part<unknown> }[] = (Object.keys(PART_LABELS) as PartKey[]).map((k) => ({ label: PART_LABELS[k], part: a[k] }));
    // Audience is new: an app that has not shipped it yet is counted in the Audience section, not here
    if (a.audience.state === 'error') parts.push({ label: 'Audience', part: a.audience });
    if (a.webRevenue && a.webRevenue.state !== 'ok') parts.push({ label: 'Web revenue', part: a.webRevenue });
    const problems = parts
      .map((p) => ({ ...p, why: partProblem(p.part) }))
      .filter((p): p is { label: string; part: Part<unknown>; why: string } => p.why !== null);
    if (problems.length === 0) return [];
    const [first] = problems;
    return [
      {
        level: 'check',
        rule: 'not_reporting',
        apps: [a.id],
        label: a.name,
        title:
          problems.length === 1 ? `${first.label} ${first.part.state === 'error' ? 'failed' : 'isn’t connected'}` : `${problems.length} sources not reporting`,
        body: problems.length === 1 ? partSentence(first.label, first.part, first.why) : problems.map((p) => `${p.label}: ${p.why}`).join('. ') + '.',
        short: problems.length === 1 ? `${first.label} ${first.part.state === 'error' ? 'failing' : 'not connected'}` : `${problems.length} sources missing`,
      },
    ];
  });
}

function wrongProperty(apps: AppSnapshot[]): AttentionItem[] {
  return apps.flatMap((a) => {
    const users = okData(a.analytics)?.activeUsers;
    if (!users || users.value > RULES.wrongPropertyMaxUsers) return [];
    const dl = okData(a.downloads);
    const downloads14 = dl ? dl.total.value + dl.total.previous : 0;
    const errors = okData(a.health)?.errors?.value ?? 0;
    if (downloads14 === 0 && errors < RULES.wrongPropertyMinErrors) return [];
    const evidence = [
      downloads14 > 0 && `${n(downloads14)} store downloads in 14 days`,
      errors >= RULES.wrongPropertyMinErrors && `${n(errors)} error events this week`,
    ]
      .filter(Boolean)
      .join(' and ');
    return [
      {
        level: 'check' as const,
        rule: 'wrong_property' as const,
        apps: [a.id],
        label: a.name,
        title: `Only ${n(users.value)} active user${users.value === 1 ? '' : 's'}`,
        body: `Yet ${evidence} say people use it. GA_PROPERTY_ID probably points at the wrong GA4 property.`,
        short: 'Check GA4 property',
      },
    ];
  });
}

/** The countries the adjusted active-users figure leaves out (automated.ts), one item each, naming the apps and how many users. */
function automatedTraffic(summary: FamilySummary): AttentionItem[] {
  const views = summary.apps.map((a) => ({ a, v: adjustUsers(a) }));
  return familyUsers(summary.apps).countries.map((c) => {
    const per = views.flatMap(({ a, v }) => {
      const f = v.flagged.find((x) => x.code === c.code);
      return f ? [{ a, f, total: v.audienceTotal }] : [];
    });
    const users = per.reduce((s, x) => s + x.f.users, 0);
    const total = per.reduce((s, x) => s + x.total, 0);
    const detail = per.map(({ a, f, total: t }) => `${n(f.users)} of ${n(t)} ${a.name} users (${f.share}%)`).join(', ');
    const how = per.some((x) => x.f.basis === 'vercel') ? 'pages per visitor far above the rest' : 'a mostly desktop audience';
    return {
      level: 'check' as const,
      rule: 'automated_traffic' as const,
      apps: per.map((x) => x.a.id),
      label: per.map((x) => x.a.name).join(' · '),
      title: `Likely automated traffic from ${c.name}`,
      body: `${detail}, left out of the adjusted active users: no ${c.name} store download in 30 days and ${how}. The raw GA4 figure is still shown.`,
      short: 'Bot traffic',
      country: { code: c.code, name: c.name, visitors: users, share: total > 0 ? Math.round((users / total) * 100) : 0 },
    };
  });
}

/** GA4 needs consent and Vercel does not, so a wide gap either way means a tag or script is broken. */
function analyticsDisagree(apps: AppSnapshot[]): AttentionItem[] {
  return apps.flatMap((a): AttentionItem[] => {
    const v = okData(a.vercel ?? NO_PART)?.visitors.value;
    const g = okData(a.analytics)?.activeUsers?.value;
    if (v === undefined || g === undefined) return [];
    const ga4Low = v >= RULES.disagreeMinVisitors && g < v * RULES.disagreeRatio;
    const vercelLow = g >= RULES.disagreeMinVisitors && v < g * RULES.disagreeRatio;
    if (!ga4Low && !vercelLow) return [];
    return [
      {
        level: 'check',
        rule: 'analytics_disagree',
        apps: [a.id],
        label: a.name,
        title: 'Analytics disagree',
        body: `Vercel counted ${n(v)} visitor${v === 1 ? '' : 's'} and GA4 ${n(g)} active user${g === 1 ? '' : 's'} this week. Check the ${ga4Low ? 'GA4 tag (is it blocked, or on the wrong property?)' : 'Vercel script (is <Analytics /> on the page?)'}.`,
        short: 'Analytics disagree',
      },
    ];
  });
}

/** Vercel counts every request that runs its script, so one country's pages-per-visitor gives a crawler away. */
function automatedVercel(apps: AppSnapshot[]): AttentionItem[] {
  return apps.flatMap((a): AttentionItem[] => {
    const v = okData(a.vercel ?? NO_PART);
    if (!v) return [];
    const c = v.countries
      .filter((x) => x.pageviews / Math.max(x.visitors, 1) > RULES.botViewsPerVisitor && (x.visitors >= RULES.botMinVisitorsOrViews || x.pageviews >= RULES.botMinVisitorsOrViews))
      .sort((x, y) => y.pageviews - x.pageviews)[0];
    if (!c) return [];
    return [
      {
        level: 'check',
        rule: 'automated_vercel',
        apps: [a.id],
        label: a.name,
        title: `Likely automated traffic from ${c.name}`,
        body: `${n(c.visitors)} visitor${c.visitors === 1 ? '' : 's'} from ${c.name} made ${n(c.pageviews)} page views (${Math.round(c.pageviews / Math.max(c.visitors, 1))} each) on Vercel. People don’t browse like that.`,
        short: 'Bot traffic',
      },
    ];
  });
}

function androidMissing(apps: AppSnapshot[]): AttentionItem[] {
  // Only apps that ship on Android: Hungerford is web and iOS only
  const onAndroid = new Set(FAMILY_APPS.filter((f) => f.platforms.includes('android')).map((f) => f.id));
  const dl = apps
    .filter((a) => onAndroid.has(a.id))
    .map((a) => okData(a.downloads))
    .filter((d): d is NonNullable<typeof d> => d !== null);
  if (dl.length === 0) return [];
  const androidAny = dl.some((d) => d.android !== null && d.android.value + d.android.previous > 0);
  const ios = dl.reduce((a, d) => a + (d.ios ? d.ios.value + d.ios.previous : 0), 0);
  if (androidAny || ios === 0) return [];
  return [
    {
      level: 'waiting',
      rule: 'android_missing',
      apps: [],
      label: 'Android',
      title: 'No Play downloads recorded',
      body: `None of the ${dl.length} apps reporting downloads has an Android download in 14 days, against ${n(ios)} on iOS. Usually the Play reports access is still pending.`,
      short: 'Android pending',
    },
  ];
}

const stars = (x: number) => x.toFixed(1);

/** Google Play: a halted or waiting production release, a rollout under way, and a rating that is low or falling. */
function playStatus(apps: AppSnapshot[]): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const a of apps) {
    const play = okData(a.play ?? NO_PLAY);
    if (!play) continue;
    const r = play.release;
    const label = r?.name ? `“${r.name}”` : 'The production release';
    const pct = r?.userFraction != null ? `${Math.round(r.userFraction * 100)}%` : null;
    if (r?.status === 'halted') {
      items.push({
        level: 'danger',
        rule: 'play_release_halted',
        apps: [a.id],
        label: a.name,
        title: 'Play rollout halted',
        body: `${label} is halted${pct ? ` at ${pct}` : ''} on Google Play, so new users are not getting it. Resume or replace it in Play Console.`,
        short: 'Rollout halted',
      });
    } else if (r?.status === 'draft') {
      items.push({
        level: 'waiting',
        rule: 'play_release_draft',
        apps: [a.id],
        label: a.name,
        title: 'Play release not sent',
        body: `${label} is still a draft on the production track. Send it for review in Play Console when it is ready.`,
        short: 'Draft release',
      });
    } else if (r?.status === 'inProgress') {
      items.push({
        level: 'waiting',
        rule: 'play_rollout',
        apps: [a.id],
        label: a.name,
        title: pct ? `Rolling out to ${pct}` : 'Rolling out',
        body: `${label} is a staged rollout on Google Play${pct ? `, at ${pct} of users` : ''}. Raise it, or halt it if errors climb.`,
        short: pct ? `Rollout ${pct}` : 'Rolling out',
      });
    }

    const rating = play.rating;
    if (rating) {
      const drop = rating.previous !== null ? rating.previous - rating.average : 0;
      if (rating.average < RULES.ratingLow || drop >= RULES.ratingDrop - 1e-9) {
        items.push({
          level: 'check',
          rule: 'rating_low',
          apps: [a.id],
          label: a.name,
          title: drop >= RULES.ratingDrop - 1e-9 ? `Play rating down to ${stars(rating.average)}` : `Play rating is ${stars(rating.average)}`,
          body:
            drop >= RULES.ratingDrop - 1e-9
              ? `Down from ${stars(rating.previous!)} thirty days ago. Read the recent reviews in Play Console.`
              : `Under ${stars(RULES.ratingLow)} stars. Read the recent reviews in Play Console.`,
          short: 'Rating dropped',
        });
      }
    }
  }

  // A 1–2 star review nobody has answered, this week
  for (const a of apps) {
    const reviews = okData(a.play ?? NO_PLAY)?.reviews;
    if (!reviews || reviews.lowUnanswered === 0) continue;
    const worst = reviews.recent[0];
    const quote = worst?.text ? `“${worst.text.length > 140 ? `${worst.text.slice(0, 139)}…` : worst.text}”` : 'with no comment';
    items.push({
      level: 'check',
      rule: 'review_low',
      apps: [a.id],
      label: a.name,
      title: reviews.lowUnanswered === 1 ? 'A low Play review needs a reply' : `${reviews.lowUnanswered} low Play reviews need a reply`,
      body: `${worst ? `${worst.stars}★${worst.version ? ` on ${worst.version}` : ''}: ` : ''}${quote}. Reply in Play Console.`,
      short: 'Low review',
    });
  }

  // One line for a shared cause (the API not enabled, the account not invited) rather than one per app
  const broken = apps.filter((a) => a.play?.state === 'error');
  if (broken.length) {
    const first = broken[0].play as Extract<Part<PlayPart>, { state: 'error' }>;
    items.push({
      level: 'check',
      rule: 'play_unreadable',
      apps: broken.map((a) => a.id),
      label: broken.map((a) => a.name).join(' · '),
      title: 'Google Play didn’t answer',
      body: first.message,
      short: 'Play unreadable',
    });
  }
  return items;
}

const NO_PLAY: Part<PlayPart> = { state: 'not_configured', missing: [] };

export function deriveAttention(summary: FamilySummary): AttentionItem[] {
  const { apps, totals } = summary;
  const items = [
    ...errorsRising(apps, totals.errors.value),
    ...notReporting(apps),
    ...wrongProperty(apps),
    ...automatedTraffic(summary),
    ...analyticsDisagree(apps),
    ...automatedVercel(apps),
    ...playStatus(apps),
    ...androidMissing(apps),
  ];
  // Stable sort: level first, rule order within a level
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => LEVEL_ORDER[a.it.level] - LEVEL_ORDER[b.it.level] || a.i - b.i)
    .map((x) => x.it);
}

/** The worst item about one app, for its card's status pill; null when healthy. */
export function appAttention(items: AttentionItem[], id: FamilyAppId): AttentionItem | null {
  return items.find((it) => it.apps.includes(id) && it.rule !== 'automated_traffic') ?? null;
}
