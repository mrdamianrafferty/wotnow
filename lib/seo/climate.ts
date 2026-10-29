/**
 * "Month by month": what the weather and water are usually like at a place, for
 * the measures that matter to one activity, and which months our own seasonal
 * guide calls in season.
 *
 * WHY THIS AND NOT A "BEST MONTHS" SCORE. The scoring engine is built for a
 * live forecast: it reads wave direction against the beach, swell period,
 * gusts, visibility and the parts of the day, and it treats an input it does
 * not have as neutral. Historical data lacks several of those, so re-scoring
 * five years of it would quietly inflate every month, on thousands of pages,
 * as advice. This states measured facts instead (average wave height, sea
 * temperature, rainy days) and never claims a verdict of its own. The only
 * judgement on the page is `seasonalMonths`, which a person wrote.
 *
 * A page shows this only when every measure its activity needs exists for its
 * place. A coastal activity at a place with no marine data gets nothing, not a
 * partial table.
 *
 * Numbers come from data/climate/normals.json, built by
 * scripts/build-climate-normals.ts and committed.
 *
 * @module lib/seo/climate
 */

import normalsFile from '../../data/climate/normals.json';
import { activityTypes } from '../../data/activityTypes';
import type { LandNormals, MarineNormals } from './climateAggregate';

export type MeasureKey = 'maxTemp' | 'minTemp' | 'rainDays' | 'snowDays' | 'frostDays' | 'wind' | 'wave' | 'seaTemp';

export interface MeasureInfo {
  label: string;
  unit: string;
  decimals: number;
  source: 'land' | 'marine';
}

export const MEASURES: Record<MeasureKey, MeasureInfo> = {
  maxTemp: { label: 'Daytime high', unit: '°C', decimals: 0, source: 'land' },
  minTemp: { label: 'Overnight low', unit: '°C', decimals: 0, source: 'land' },
  rainDays: { label: 'Rainy days', unit: 'days', decimals: 0, source: 'land' },
  snowDays: { label: 'Snowy days', unit: 'days', decimals: 0, source: 'land' },
  frostDays: { label: 'Frosty days', unit: 'days', decimals: 0, source: 'land' },
  wind: { label: 'Average wind', unit: 'km/h', decimals: 0, source: 'land' },
  wave: { label: 'Offshore wave height', unit: 'm', decimals: 1, source: 'marine' },
  seaTemp: { label: 'Sea temperature', unit: '°C', decimals: 0, source: 'marine' },
};

/**
 * What each place-specific activity shows, in the order it reads best. Explicit
 * on purpose: which numbers matter to ice skating is a decision, not something
 * to infer from a tag. A test fails when an activity gets pages but no entry.
 */
export const ACTIVITY_MEASURES: Record<string, MeasureKey[]> = {
  american_football: ['maxTemp', 'rainDays', 'wind'],
  baseball: ['maxTemp', 'rainDays', 'wind'],
  hurling_camogie: ['maxTemp', 'rainDays', 'wind'],
  gaelic_football: ['maxTemp', 'rainDays', 'wind'],
  surfing: ['wave', 'seaTemp', 'wind', 'rainDays'],
  sea_kayaking: ['wind', 'wave', 'seaTemp', 'rainDays'],
  stand_up_paddleboarding: ['wind', 'wave', 'seaTemp', 'rainDays'],
  sup_sea: ['wind', 'wave', 'seaTemp', 'rainDays'],
  jet_skiing: ['wind', 'wave', 'seaTemp', 'rainDays'],
  sailing: ['wind', 'wave', 'seaTemp', 'rainDays'],
  windsurfing: ['wind', 'wave', 'seaTemp', 'maxTemp'],
  kitesurfing: ['wind', 'wave', 'seaTemp', 'maxTemp'],
  snorkeling: ['seaTemp', 'wave', 'maxTemp', 'rainDays'],
  scuba_diving: ['seaTemp', 'wave', 'maxTemp', 'rainDays'],
  sea_swimming: ['seaTemp', 'wave', 'maxTemp', 'rainDays'],
  sea_fishing_shore: ['wave', 'wind', 'seaTemp', 'rainDays'],
  sea_fishing_boat: ['wave', 'wind', 'seaTemp', 'rainDays'],
  beach: ['maxTemp', 'seaTemp', 'rainDays', 'wind'],
  skiing: ['snowDays', 'frostDays', 'maxTemp', 'wind'],
  snowboarding: ['snowDays', 'frostDays', 'maxTemp', 'wind'],
  cross_country_skiing: ['snowDays', 'frostDays', 'maxTemp', 'wind'],
  ice_skating: ['frostDays', 'minTemp', 'snowDays', 'maxTemp'],
  ice_hockey: ['frostDays', 'minTemp', 'snowDays', 'maxTemp'],
  ice_fishing: ['frostDays', 'minTemp', 'snowDays', 'maxTemp'],
  rock_climbing: ['maxTemp', 'rainDays', 'wind', 'minTemp'],
  mountain_biking: ['maxTemp', 'rainDays', 'wind', 'minTemp'],
  gravel_biking: ['maxTemp', 'rainDays', 'wind', 'minTemp'],
  trail_running: ['maxTemp', 'rainDays', 'wind', 'minTemp'],
  mushroom_hunting: ['rainDays', 'maxTemp', 'minTemp', 'frostDays'],
};

/**
 * What an activity shows where the water has waves but no water temperature (the Great Lakes, Puget Sound).
 *
 * Only for activities where wind and waves are the question and the water's temperature is secondary: you can
 * sail, paddle or fish from a boat in cold water. NOT for swimming, snorkelling, diving or the beach, where
 * the temperature is the point: those get no block rather than one that leaves out the main number. The
 * temperature slot is given to the air's daytime high, which is real and relevant.
 */
export const WAVES_ONLY_MEASURES: Record<string, MeasureKey[]> = {
  surfing: ['wave', 'wind', 'maxTemp', 'rainDays'],
  sea_kayaking: ['wind', 'wave', 'maxTemp', 'rainDays'],
  stand_up_paddleboarding: ['wind', 'wave', 'maxTemp', 'rainDays'],
  sup_sea: ['wind', 'wave', 'maxTemp', 'rainDays'],
  jet_skiing: ['wind', 'wave', 'maxTemp', 'rainDays'],
  sailing: ['wind', 'wave', 'maxTemp', 'rainDays'],
  windsurfing: ['wind', 'wave', 'maxTemp', 'rainDays'],
  kitesurfing: ['wind', 'wave', 'maxTemp', 'rainDays'],
  sea_fishing_shore: ['wave', 'wind', 'maxTemp', 'rainDays'],
  sea_fishing_boat: ['wave', 'wind', 'maxTemp', 'rainDays'],
};

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ─── Words ───────────────────────────────────────────────────────────

/** "April to October", "November to March" across the new year, "April, June and July" when split. */
export function describeMonths(months: number[]): string | null {
  const set = [...new Set(months.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b);
  if (set.length === 0) return null;
  if (set.length === 12) return 'all year';
  const has = new Set(set);
  // A run starts at a month whose predecessor (wrapping December to January) is absent
  const runs: number[][] = [];
  for (const m of set) {
    if (has.has(m === 1 ? 12 : m - 1)) continue;
    const run = [m];
    let next = m === 12 ? 1 : m + 1;
    while (has.has(next) && next !== m) {
      run.push(next);
      next = next === 12 ? 1 : next + 1;
    }
    runs.push(run);
  }
  const name = (m: number) => MONTH_NAMES[m - 1];
  const parts = runs.map((r) => (r.length === 1 ? name(r[0]) : r.length === 2 ? `${name(r[0])} and ${name(r[1])}` : `${name(r[0])} to ${name(r[r.length - 1])}`));
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

const round = (n: number, decimals: number) => (decimals === 0 ? String(Math.round(n)) : n.toFixed(decimals));

interface Extremes {
  hi: { month: number; value: number };
  lo: { month: number; value: number };
}

export function extremes(series: number[]): Extremes {
  let hi = 0;
  let lo = 0;
  series.forEach((v, i) => {
    if (v > series[hi]) hi = i;
    if (v < series[lo]) lo = i;
  });
  return { hi: { month: hi, value: series[hi] }, lo: { month: lo, value: series[lo] } };
}

/** One factual sentence about one measure's year, or null when there is nothing worth saying. */
export function sentenceFor(key: MeasureKey, series: number[], opts: { openWater?: boolean } = {}): string | null {
  const { hi, lo } = extremes(series);
  const m = (i: number) => MONTH_NAMES[i];
  const v = (n: number) => round(n, MEASURES[key].decimals);
  switch (key) {
    case 'maxTemp':
      return `Daytime highs peak at ${v(hi.value)}°C in ${m(hi.month)} and fall to ${v(lo.value)}°C in ${m(lo.month)}.`;
    case 'minTemp':
      return `Overnight lows range from ${v(hi.value)}°C in ${m(hi.month)} down to ${v(lo.value)}°C in ${m(lo.month)}.`;
    case 'seaTemp':
      return `The sea is warmest in ${m(hi.month)} at ${v(hi.value)}°C and coldest in ${m(lo.month)} at ${v(lo.value)}°C.`;
    case 'wind':
      return `Winds average ${v(hi.value)} km/h in ${m(hi.month)}, the windiest month, and ${v(lo.value)} km/h in ${m(lo.month)}, the calmest.`;
    case 'wave':
      // "Offshore" is right for a sea and wrong for a lake or a sound, which have an open middle and no offshore
      return `${opts.openWater ? 'Waves on the open water' : 'Offshore waves'} are biggest in ${m(hi.month)} (the day's highest averages ${v(hi.value)} m) and smallest in ${m(lo.month)} (${v(lo.value)} m).`;
    case 'rainDays':
      return `${m(hi.month)} is the wettest month, with about ${v(hi.value)} days of 1 mm or more; ${m(lo.month)} is the driest, with about ${v(lo.value)}.`;
    case 'snowDays':
      return hi.value < 1 ? 'Snow on the ground is rare here: fewer than one snowy day in any month.' : `Snow is most likely in ${m(hi.month)}, with about ${v(hi.value)} snowy days.`;
    case 'frostDays':
      return hi.value < 1 ? 'A frost is rare here: fewer than one frosty day in any month.' : `Frost is most common in ${m(hi.month)}, with about ${v(hi.value)} days below freezing.`;
  }
}

// ─── The block a page shows ──────────────────────────────────────────

export interface MonthByMonth {
  place: string;
  activityName: string;
  /** Measures in display order, each with twelve values (January first). */
  rows: { key: MeasureKey; label: string; unit: string; decimals: number; values: number[] }[];
  /** Months our seasonal guide calls in season (1-12), or null when the activity has no guide. */
  seasonal: number[] | null;
  seasonSentence: string | null;
  sentences: string[];
  /** Where the numbers come from, in a sentence. */
  basis: string;
}

export interface NormalsFile {
  landYears: string[];
  marineYears: string[];
  locations: Record<string, { land: LandNormals; marine?: MarineNormals }>;
}

const DEFAULT_FILE = normalsFile as unknown as NormalsFile;

export function monthByMonth(activityId: string, place: { slug: string; name: string }, activityName: string, file: NormalsFile = DEFAULT_FILE): MonthByMonth | null {
  const entry = file.locations[place.slug];
  const full = ACTIVITY_MEASURES[activityId];
  if (!full || !entry) return null;
  // Waves but no water temperature: the activities that do not need one use their own list; the rest get no block
  const wavesOnly = !!entry.marine && !entry.marine.seaTemp && full.includes('seaTemp');
  const wanted = wavesOnly ? WAVES_ONLY_MEASURES[activityId] : full;
  if (!wanted) return null;

  const rows: MonthByMonth['rows'] = [];
  for (const key of wanted) {
    const info = MEASURES[key];
    const series = info.source === 'land' ? (entry.land as unknown as Record<string, number[]>)[key] : (entry.marine as unknown as Record<string, number[]> | undefined)?.[key];
    // Every measure the activity needs, or no block: a partial table would imply the rest do not matter
    if (!series || series.length !== 12) return null;
    rows.push({ key, label: wavesOnly && key === 'wave' ? 'Wave height, open water' : info.label, unit: info.unit, decimals: info.decimals, values: series });
  }

  const seasonal = activityTypes.find((a) => a.id === activityId)?.seasonalMonths ?? null;
  const seasonText = seasonal && seasonal.length ? describeMonths(seasonal) : null;
  const usesMarine = rows.some((r) => MEASURES[r.key].source === 'marine');
  const [l0, l1] = file.landYears;
  const [m0, m1] = file.marineYears;
  const usesTemp = rows.some((r) => r.key === 'seaTemp');
  const basis = usesMarine
    ? usesTemp
      ? `Averages of daily weather ${l0} to ${l1} and of waves and sea temperature ${m0} to ${m1}, from ERA5 reanalysis data (about 25 km resolution; waves are measured offshore, not in the surf at the beach). Not a forecast.`
      : `Averages of daily weather ${l0} to ${l1} and of waves ${m0} to ${m1}, from ERA5 reanalysis data (about 25 km resolution; waves are measured on open water, not at the shore). Water temperature is not available for this water, so it is not shown. Not a forecast.`
    : `Averages of daily weather ${l0} to ${l1}, from ERA5 reanalysis data (about 25 km resolution). Not a forecast.`;

  return {
    place: place.name,
    activityName,
    rows,
    seasonal: seasonal && seasonal.length ? seasonal : null,
    seasonSentence: seasonText ? (seasonText === 'all year' ? 'Our seasonal guide counts it as an all-year activity.' : `Our seasonal guide puts ${activityName.toLowerCase()} in season from ${seasonText}.`) : null,
    sentences: rows.map((r) => sentenceFor(r.key, r.values, { openWater: wavesOnly })).filter((s): s is string => !!s),
    basis,
  };
}
