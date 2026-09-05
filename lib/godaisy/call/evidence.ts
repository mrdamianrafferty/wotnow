/**
 * What the drawer shows, and in what order — phase 5.
 *
 * `weather.tsx` is 1,603 lines of dashboard: eight sections in a fixed order,
 * every one of them always open, none of them aware of what you came to do. It
 * is a good dashboard. The redesign's argument is that a dashboard is the wrong
 * shape — you do not want eight readings, you want the answer, and then the
 * evidence for it if you doubt it.
 *
 * SO THE ORDER IS THE FEATURE. The sections are ranked by which inputs actually
 * moved the verdict, using the criteria the scorer already computes and used to
 * throw away. On a day called off for gusts, wind is the first thing you see.
 * On a surf day decided by a short swell period, the sea is. The fixed order in
 * `weather.tsx` can only ever be right by accident.
 *
 * Nothing here fetches or renders. It decides what belongs where and what comes
 * first, so that decision is testable without a browser.
 *
 * @module lib/godaisy/call/evidence
 */

export type EvidenceSectionId =
  | 'wind' | 'rain' | 'temperature' | 'sea' | 'tide'
  | 'sky' | 'air' | 'ground' | 'night';

export interface EvidenceSection {
  id: EvidenceSectionId;
  /** Sentence case, the reader's language — never the model's. */
  title: string;
  /**
   * The criterion keys that make this section relevant.
   *
   * Taken from the condition strings in `data/activities`, which is the only
   * place these names are defined. A key not listed here still renders its
   * section, just never gets promoted by it.
   */
  keys: readonly string[];
}

/**
 * Every section, in the order they fall back to.
 *
 * The fallback matters more than it looks: most sections have no criterion
 * pointing at them on most days — nothing in the library scores tides — so for
 * them this IS the order. It runs roughly outside-in: what the day is doing,
 * then what the ground and air are doing, then the night.
 */
export const EVIDENCE_SECTIONS: readonly EvidenceSection[] = [
  { id: 'wind',        title: 'Wind',              keys: ['windSpeed', 'gust', 'windRelative', 'windDirection', 'beaufort'] },
  { id: 'rain',        title: 'Rain',              keys: ['precipitation', 'precipitationHours', 'rainWindow', 'snowfallRateMmH', 'snowDepth'] },
  { id: 'temperature', title: 'Temperature',       keys: ['temperature', 'airTemperature', 'feelsLike', 'apparentTemperature'] },
  { id: 'sea',         title: 'The sea',           keys: ['waveHeight', 'swellHeight', 'swellPeriod', 'waterTemperature', 'seaState'] },
  { id: 'tide',        title: 'Tides',             keys: ['tide', 'tideState'] },
  { id: 'sky',         title: 'Sky and light',     keys: ['clouds', 'cloudCover', 'visibility', 'uvIndex', 'daylight'] },
  { id: 'air',         title: 'Air',               keys: ['humidity', 'airQuality', 'aqi', 'pollen', 'dewPoint', 'pressure'] },
  { id: 'ground',      title: 'Underfoot',         keys: ['soilMoisture', 'soilTemperature', 'mud', 'groundCondition'] },
  { id: 'night',       title: 'After dark',        keys: ['moonPhase', 'moonIllumination', 'darkness', 'cloudCoverNight'] },
];

const SECTION_FOR_KEY: ReadonlyMap<string, EvidenceSectionId> = new Map(
  EVIDENCE_SECTIONS.flatMap((s) => s.keys.map((k) => [k, s.id] as const)),
);

/** What the drawer was given about one criterion the scorer weighed. */
export interface Weighed {
  key: string;
  /** 0-1. LOW means this criterion is what held the day back. */
  score: number;
  value?: number;
}

export interface RankedSection extends EvidenceSection {
  /**
   * Why it is where it is, when a criterion put it there.
   *
   * Absent for a section nothing scored — which is most of them on most days,
   * and is why the drawer must not claim every section is evidence.
   */
  because?: Weighed;
}

/**
 * The sections, most relevant first.
 *
 * Promotion is by the criteria the scorer weighed, in the order it ranked them
 * — which is most-limiting first, so a section whose criterion nearly failed
 * sits above one whose criterion sailed through.
 *
 * A section is promoted ONLY BY ITS WEAKEST criterion. Wind can be pointed at
 * by `windSpeed`, `gust` and `windRelative` at once; ranking by each of them
 * separately would let three comfortable wind criteria outrank one marginal sea
 * criterion, which reverses the point of the exercise.
 *
 * Everything not promoted keeps the declared fallback order behind them, so the
 * drawer is always complete: the reader who doubts the verdict gets the whole
 * picture, just with the relevant part at the top.
 */
export function rankSections(weighed: readonly Weighed[] | undefined): RankedSection[] {
  const best = new Map<EvidenceSectionId, Weighed>();
  let rank = 0;
  const order = new Map<EvidenceSectionId, number>();

  for (const w of weighed ?? []) {
    const id = SECTION_FOR_KEY.get(w.key);
    if (!id) continue;
    const held = best.get(id);
    if (!held || w.score < held.score) best.set(id, w);
    if (!order.has(id)) order.set(id, rank++);
  }

  const byId = new Map(EVIDENCE_SECTIONS.map((s) => [s.id, s]));
  const promoted: RankedSection[] = [...order.entries()]
    // Re-sort by the criterion score rather than first-seen: `best` may have
    // been replaced by a weaker sibling after the section was first recorded.
    .sort((a, b) => {
      const sa = best.get(a[0])?.score ?? 1;
      const sb = best.get(b[0])?.score ?? 1;
      return sa === sb ? a[1] - b[1] : sa - sb;
    })
    .map(([id]) => ({ ...(byId.get(id) as EvidenceSection), because: best.get(id) }));

  const rest = EVIDENCE_SECTIONS.filter((s) => !best.has(s.id));
  return [...promoted, ...rest];
}

/**
 * Whether a section is worth showing at all for this activity.
 *
 * The sea and the tides are not evidence for a bike ride, and a drawer that
 * shows them anyway is the dashboard again. Sections with no criterion pointing
 * at them are kept — most have none — but the two that are purely coastal are
 * dropped unless the day is.
 */
const COASTAL_ONLY: ReadonlySet<EvidenceSectionId> = new Set(['sea', 'tide']);

export function visibleSections(
  weighed: readonly Weighed[] | undefined,
  opts: { coastal: boolean },
): RankedSection[] {
  return rankSections(weighed).filter((s) => opts.coastal || !COASTAL_ONLY.has(s.id));
}
