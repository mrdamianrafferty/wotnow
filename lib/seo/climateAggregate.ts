/**
 * Turning years of daily weather into twelve numbers per measure.
 *
 * Pure, and kept apart from the script that fetches the data, so the arithmetic
 * that ends up on a public page is tested without a network. The script
 * (scripts/build-climate-normals.ts) is the only caller.
 *
 * "Days a month" measures (rain, snow, frost) are an average over the years
 * supplied: the number of qualifying days in that calendar month, summed over
 * all years, divided by the number of years that have that month. So 16 rain
 * days in January means "in a typical January, about 16 days had 1 mm or
 * more", not a percentage and not a total.
 *
 * @module lib/seo/climateAggregate
 */

export const RAIN_DAY_MM = 1;
export const SNOW_DAY_CM = 1;
export const FROST_BELOW_C = 0;

export interface DailyLand {
  time: string[]; // YYYY-MM-DD
  tmax: (number | null)[];
  tmin: (number | null)[];
  precip: (number | null)[];
  snowfall: (number | null)[]; // cm
  windMean: (number | null)[]; // km/h
}

export interface LandNormals {
  /** Mean of the daily highs, °C, per calendar month (index 0 = January). */
  maxTemp: number[];
  minTemp: number[];
  /** Typical number of days with at least 1 mm of rain. */
  rainDays: number[];
  /** Typical number of days with at least 1 cm of snowfall. */
  snowDays: number[];
  /** Typical number of days with a minimum below 0 °C. */
  frostDays: number[];
  /** Mean of the daily mean wind at 10 m, km/h. */
  wind: number[];
}

export interface MarineNormals {
  /** Mean of each day's highest offshore wave, m. */
  wave: number[];
  /**
   * Mean water-surface temperature, °C. Absent where the model has waves but no water temperature at all
   * (the Great Lakes, Puget Sound): never filled in from somewhere else.
   */
  seaTemp?: number[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const monthOf = (isoDay: string) => Number(isoDay.slice(5, 7)) - 1;
const yearOf = (isoDay: string) => isoDay.slice(0, 4);

/** Mean of the non-null values in each month; null when a month has none. */
function monthlyMean(times: string[], values: (number | null)[]): (number | null)[] {
  const sum = new Array(12).fill(0);
  const n = new Array(12).fill(0);
  times.forEach((t, i) => {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) {
      sum[monthOf(t)] += v;
      n[monthOf(t)] += 1;
    }
  });
  return sum.map((s, m) => (n[m] ? s / n[m] : null));
}

/** Average number of qualifying days per calendar month, over the years that have that month. */
function monthlyDayCount(times: string[], values: (number | null)[], qualifies: (v: number) => boolean): (number | null)[] {
  const days = new Array(12).fill(0);
  const years: Set<string>[] = Array.from({ length: 12 }, () => new Set());
  times.forEach((t, i) => {
    const v = values[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    years[monthOf(t)].add(yearOf(t));
    if (qualifies(v)) days[monthOf(t)] += 1;
  });
  return days.map((d, m) => (years[m].size ? d / years[m].size : null));
}

/** Twelve numbers, or null if any month has no data at all: a gap is not published as a zero. */
function complete(series: (number | null)[]): number[] | null {
  if (series.some((v) => v === null)) return null;
  return (series as number[]).map(round1);
}

export function landNormals(d: DailyLand): LandNormals | null {
  const out = {
    maxTemp: complete(monthlyMean(d.time, d.tmax)),
    minTemp: complete(monthlyMean(d.time, d.tmin)),
    rainDays: complete(monthlyDayCount(d.time, d.precip, (v) => v >= RAIN_DAY_MM)),
    snowDays: complete(monthlyDayCount(d.time, d.snowfall, (v) => v >= SNOW_DAY_CM)),
    frostDays: complete(monthlyDayCount(d.time, d.tmin, (v) => v < FROST_BELOW_C)),
    wind: complete(monthlyMean(d.time, d.windMean)),
  };
  return Object.values(out).every((v) => v !== null) ? (out as LandNormals) : null;
}

export function marineNormals(daily: { time: string[]; waveMax: (number | null)[] }, hourly: { time: string[]; sst: (number | null)[] }): MarineNormals | null {
  const wave = complete(monthlyMean(daily.time, daily.waveMax));
  if (!wave) return null;
  // No temperature readings at all means this water has no temperature series: waves only. A series with some
  // months present and others missing is a broken fetch, not a lake, and is refused rather than half-published.
  const anyTemp = hourly.sst.some((v) => typeof v === 'number' && Number.isFinite(v));
  if (!anyTemp) return { wave };
  // Hourly values carry an ISO time with an hour; only the date part is read
  const sea = complete(monthlyMean(hourly.time, hourly.sst));
  return sea ? { wave, seaTemp: sea } : null;
}
