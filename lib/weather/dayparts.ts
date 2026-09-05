/**
 * Cutting an hourly series into parts of a day — phase 1b.
 *
 * Lives on its own because it has two callers that must agree: the Open-Meteo
 * adapter the app runs on, and `scripts/print-calls.ts`, which is how the
 * sentences are read before anyone believes them. Two definitions of "morning"
 * in one codebase is a bug waiting for a Tuesday, and the script existing to
 * check the app's output is worth nothing if it is checking different arithmetic.
 *
 * The boundaries are the ones `rainWindowFor` has always used — <6 overnight,
 * <12 morning, <18 afternoon, else evening. The voice already speaks in them.
 *
 * WIND IS NORMALISED TO KM/H HERE, at the edge, once. Open-Meteo will answer in
 * either unit depending on what the caller asked for, and `WeatherData` is km/h
 * throughout; converting downstream instead means every consumer has to know
 * which request produced its input, and the failure is silent — 8 m/s read as
 * 8 km/h is a stiff breeze reported as a calm morning.
 *
 * @module lib/weather/dayparts
 */

/**
 * One part of one day.
 *
 * Every field is optional because the source publishes what it publishes, and
 * the scoring models read an ABSENT criterion as neutral rather than bad — so a
 * fabricated value is worse than a missing one.
 */
export interface DaypartAggregate {
  /** Hourly samples that fell in this part. Below ~3 the aggregates are thin. */
  hours: number;
  temperature?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  /** Total over the part, mm. */
  precipitation?: number;
  /** Hours of the part that saw any rain, on the same `> 0` test the daily figure uses. */
  precipitationHours?: number;
  /** km/h, whatever unit the series arrived in. */
  windspeed?: number;
  windspeedMax?: number;
  gustspeed?: number;
  /** Degrees, at the windiest hour of the part — never a mean. */
  windDirection?: number;
  /** Metres. */
  visibility?: number;
  humidity?: number;
  uvIndex?: number;
  /** m³/m³, as published. Callers convert to percent where the criteria are in percent. */
  soilMoisture?: number;
  cloudCover?: number;
}

/** The three parts a call can name. */
export const PART_ORDER = ['morning', 'afternoon', 'evening'] as const;
export type DaypartName = (typeof PART_ORDER)[number];

/**
 * Overnight is aggregated and never offered as a window.
 *
 * "Best overnight" is not advice for anything in the library, and what happens
 * after dark reads the evening part instead. It is bucketed rather than
 * discarded so the boundaries stay the rain window's, which has always had
 * four.
 *
 * That "reads the evening part" was a description of intent for months and not
 * of behaviour: `scoreParts` scored all three parts for everything, so
 * stargazing was judged on the sky at ten in the morning and the call said
 * "Best in the morning" under it. `usableParts` in `window.ts` is where the
 * intent is now actually enforced, off the `night` tag — and stargazing is the
 * only activity carrying it, camping included, which this comment used to
 * claim otherwise.
 */
export type BucketName = 'overnight' | DaypartName;

export function bucketFor(hour: number): BucketName {
  return hour < 6 ? 'overnight' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/** Open-Meteo's hourly block: parallel arrays keyed by field name, plus `time`. */
export interface HourlySeries {
  time?: string[];
  [field: string]: unknown;
}

export interface DaypartOptions {
  /** The unit the wind fields arrived in. Output is always km/h. */
  windUnit?: 'ms' | 'kmh';
  /** Open-Meteo field names, where a caller requested different ones. */
  fields?: Partial<Record<keyof typeof DEFAULT_FIELDS, string>>;
}

const DEFAULT_FIELDS = {
  temperature: 'temperature_2m',
  precipitation: 'precipitation',
  windspeed: 'wind_speed_10m',
  gust: 'wind_gusts_10m',
  direction: 'wind_direction_10m',
  visibility: 'visibility',
  humidity: 'relative_humidity_2m',
  uvIndex: 'uv_index',
  soilMoisture: 'soil_moisture_0_to_7cm',
  cloudCover: 'cloud_cover',
} as const;

const mean = (a?: number[]) => (a?.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined);
const sum = (a?: number[]) => (a?.length ? a.reduce((x, y) => x + y, 0) : undefined);
const max = (a?: number[]) => (a?.length ? Math.max(...a) : undefined);
const min = (a?: number[]) => (a?.length ? Math.min(...a) : undefined);

/**
 * The direction at the WINDIEST hour, not a mean.
 *
 * Averaging 350° and 10° gives 180°, which is the opposite wind — and direction
 * is the difference between the best birding of the year and a cold day with no
 * birds in it, so getting it backwards is not a rounding error.
 */
const dirAtPeak = (wind?: number[], deg?: number[]) => {
  if (!wind?.length || !deg?.length) return undefined;
  let best = 0;
  for (let i = 1; i < wind.length && i < deg.length; i++) if (wind[i] > wind[best]) best = i;
  return deg[best];
};

/**
 * Aggregate an hourly series into `{ 'YYYY-MM-DD': { morning: …, … } }`.
 *
 * Timestamps are read as the source wrote them — the two callers both request
 * their series in the timezone they intend, so no conversion happens here. An
 * hourly block requested in UTC and bucketed as local time would put a summer
 * evening in the afternoon, which is why the callers, not this function, own it.
 */
export function aggregateDayparts(
  hourly: HourlySeries | undefined,
  opts: DaypartOptions = {},
): Record<string, Partial<Record<BucketName, DaypartAggregate>>> {
  const out: Record<string, Partial<Record<BucketName, DaypartAggregate>>> = {};
  const times = hourly?.time;
  if (!Array.isArray(times) || !times.length) return out;

  const field = { ...DEFAULT_FIELDS, ...(opts.fields ?? {}) };
  const toKmh = opts.windUnit === 'kmh' ? (v?: number) => v : (v?: number) => (typeof v === 'number' ? v * 3.6 : undefined);

  type Bag = Record<string, number[]>;
  const acc: Record<string, Partial<Record<BucketName, Bag>>> = {};

  for (let h = 0; h < times.length; h++) {
    const t = times[h];
    if (typeof t !== 'string' || t.length < 13) continue;
    const dateStr = t.slice(0, 10);
    const bucket = bucketFor(Number(t.slice(11, 13)));
    const bag: Bag = ((acc[dateStr] ??= {})[bucket] ??= {});
    for (const [key, name] of Object.entries(field)) {
      const v = (hourly?.[name] as (number | null)[] | undefined)?.[h];
      if (typeof v === 'number' && Number.isFinite(v)) (bag[key] ??= []).push(v);
    }
  }

  for (const [dateStr, byBucket] of Object.entries(acc)) {
    out[dateStr] = {};
    for (const [bucket, bag] of Object.entries(byBucket) as Array<[BucketName, Bag]>) {
      const rain = bag.precipitation;
      out[dateStr][bucket] = {
        hours: bag.temperature?.length ?? 0,
        temperature: mean(bag.temperature),
        temperatureMin: min(bag.temperature),
        temperatureMax: max(bag.temperature),
        precipitation: sum(rain),
        precipitationHours: rain ? rain.filter((v) => v > 0).length : undefined,
        windspeed: toKmh(mean(bag.windspeed)),
        windspeedMax: toKmh(max(bag.windspeed)),
        gustspeed: toKmh(max(bag.gust)),
        windDirection: dirAtPeak(bag.windspeed, bag.direction),
        visibility: mean(bag.visibility),
        humidity: mean(bag.humidity),
        uvIndex: max(bag.uvIndex),
        soilMoisture: mean(bag.soilMoisture),
        cloudCover: mean(bag.cloudCover),
      };
    }
  }
  return out;
}
