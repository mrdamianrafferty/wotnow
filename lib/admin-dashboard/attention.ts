/**
 * "Needs attention" on /admin/apps, derived from the family summary by
 * rules. Pure: the same FamilySummary always gives the same list, worst
 * first, and an empty list means nothing needs attention.
 *
 * Every rule only fires on figures an app actually reported. An app or part
 * that is missing is its own item ("not connected"), never a silent zero
 * feeding another rule.
 */

import { FAMILY_APPS, type AppSnapshot, type FamilyAppId, type FamilySummary, type Part } from './family';

export type AttentionLevel = 'danger' | 'check' | 'waiting';

export interface AttentionItem {
  level: AttentionLevel;
  /** Stable, for React keys and tests. */
  rule: 'errors_rising' | 'not_reporting' | 'wrong_property' | 'automated_traffic' | 'android_missing';
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

/** The family's home markets: a spike from here is not suspicious on its own. */
export const HOME_COUNTRIES = new Set(['GB', 'IE']);

/** Thresholds, named so the tests and the copy agree. */
export const RULES = {
  errorsRisingPct: 50,
  errorsRisingMin: 100,
  wrongPropertyMaxUsers: 5,
  wrongPropertyMinErrors: 100,
  automatedShare: 0.3,
} as const;

const LEVEL_ORDER: Record<AttentionLevel, number> = {
  danger: 0,
  check: 1,
  waiting: 2,
};
const n = (x: number) => x.toLocaleString('en-GB');
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
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

function automatedTraffic(summary: FamilySummary): AttentionItem[] {
  const aud = summary.totals.audience;
  // Without store countries there is no way to say "no downloads from there"
  if (aud.visitors === 0 || aud.storeReporting === 0) return [];
  const stored = new Set(aud.storeCountries.filter((c) => c.value > 0).map((c) => c.code));
  const names = new Map(summary.apps.map((a) => [a.id, a.name]));
  return aud.countries
    .filter((c) => c.code !== null && !HOME_COUNTRIES.has(c.code) && c.value / aud.visitors >= RULES.automatedShare && !stored.has(c.code))
    .map((c) => ({
      level: 'check' as const,
      rule: 'automated_traffic' as const,
      apps: c.apps,
      label: c.apps.map((id) => names.get(id) ?? id).join(' · '),
      title: `${c.name} traffic looks automated`,
      body: `${n(c.value)} of ${n(aud.visitors)} visitors, and not one ${c.name} store download in 30 days. Filter it in GA4 before trusting user counts.`,
      short: 'Bot traffic',
      country: {
        code: c.code!,
        name: c.name,
        visitors: c.value,
        share: Math.round((c.value / aud.visitors) * 100),
      },
    }));
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

export function deriveAttention(summary: FamilySummary): AttentionItem[] {
  const { apps, totals } = summary;
  const items = [
    ...errorsRising(apps, totals.errors.value),
    ...notReporting(apps),
    ...wrongProperty(apps),
    ...automatedTraffic(summary),
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
