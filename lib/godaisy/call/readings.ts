/**
 * Turning `/api/unified-weather` into rows a person can read.
 *
 * Shared by the drawn conditions page and its "See every number" table, which answer the same
 * question at different depths and there is no version of this codebase where
 * two readers of the same endpoint stay in agreement. The first one already
 * shipped broken once — written against OpenWeather One Call field names the
 * endpoint has never returned — and a second copy would have been a second
 * chance to do that.
 *
 * @module lib/godaisy/call/readings
 */

import type { RankedSection } from './evidence';
import { localeOf, tr_, num as fmt } from '@/lib/godaisy/i18n';
import type { LangCode, TKey } from '@/lib/godaisy/i18n/types';

/**
 * `/api/unified-weather`, as it actually answers.
 *
 * THE FIRST VERSION OF THIS WAS WRITTEN AGAINST A GUESS. It read `wind_speed`,
 * `temp_max`, `rain`, `pop` — OpenWeather One Call names, because that is the
 * shape the forecast pipeline imitates internally. This endpoint answers in its
 * own shape: `windSpeedMS`, `maxC`, `precipMM`, `cloudsPct`. Every key missed,
 * every section rendered "Nothing published for this", and the drawer looked
 * like a working feature with no data behind it — which is exactly how it
 * shipped, because the empty state was indistinguishable from a quiet day.
 *
 * Units are in the names and they are not the ones the app uses: wind is m/s
 * where `WeatherData` is km/h, visibility is already km.
 */
export interface Readings {
  temperatureC?: number;
  feelsLikeC?: number;
  humidityPct?: number;
  pressureHpa?: number;
  /** METRES PER SECOND. */
  windSpeedMS?: number;
  windDeg?: number;
  /** Already kilometres. */
  visibilityKm?: number;
  uvi?: number;
  cloudsPct?: number;
  hourly?: Array<{
    timeISO?: string; tempC?: number; windMS?: number; windDeg?: number; precipMM?: number;
    /** Metres. Present at coastal places only. */
    waveHeightM?: number;
    /** WMO code: 45/48 fog, 71-77 and 85/86 snow, 95+ thunder. */
    weatherCode?: number;
    /** UV index for the hour. */
    uvi?: number;
    /**
     * Centimetres. (Until 12 Nov 2026 this was Open-Meteo's metres passed
     * through unconverted — Tromsø's 9 cm arrived as 0.08.)
     */
    snowDepthCm?: number;
    /** Snowfall, mm per hour (Open-Meteo's cm × 10). */
    snowfallRateMmH?: number;
  }>;
  /**
   * `precipMM` is ABSENT on a dry day, not zero. Sunrise, sunset and the moon
   * are on the first day only.
   */
  daily?: Array<{
    dateISO?: string; minC?: number; maxC?: number; windMS?: number; windDeg?: number;
    precipMM?: number; summary?: string; moonPhase?: number;
    sunriseISO?: string; sunsetISO?: string;
  }>;
  sunriseISO?: string;
  sunsetISO?: string;
  dewPointC?: number;
  pressureTrend?: string;
  marine?: { waveHeight?: number; wavePeriod?: number; swellHeight?: number; swellPeriod?: number };
  /** An ARRAY of extremes, not an object with one. */
  tides?: Array<{ time?: string; type?: string; height?: number }>;
  marineHourly?: Array<{ timeISO?: string; waterTempC?: number; waveHeightM?: number }>;
  seaTemp?: number;
  airQuality?: { aqi?: number; components?: Record<string, number> };
  pollen?: Record<string, number | string | null>;
  soil?: { temp0cm?: number; temp6cm?: number; moisture0to1?: number };
  moon?: {
    illuminationPct?: number; moonriseISO?: string; moonsetISO?: string;
    /** 0-1, new to new. */
    phaseFraction?: number;
    /** The PLACE's zone, e.g. "Europe/London" — the one clock times are told in. */
    timezone?: string;
  };
}

export interface Row { label: string; value: string }

/** Today's total from the hourly series, since the daily figure is not always there. */
const rainToday = (r: Readings): number | undefined => {
  const today = new Date().toISOString().slice(0, 10);
  const hours = (r.hourly ?? []).filter((h) => h.timeISO?.startsWith(today));
  if (!hours.length) return r.daily?.[0]?.precipMM;
  return hours.reduce((sum, h) => sum + (typeof h.precipMM === 'number' ? h.precipMM : 0), 0);
};

/**
 * What the ground is like to walk on, from the top centimetre of soil.
 *
 * "38%" told nobody anything: it is volumetric water content (m³ of water per
 * m³ of soil, here 0-1), and whether 38% is a dry path or a bog depends on
 * knowing that the scale tops out in the mid-40s. So it is said in words.
 *
 * THE CUT-OFFS ARE FROM THE MODEL'S OWN RANGE, not from a soil-science table.
 * Open-Meteo's 0-1 cm layer was sampled hourly for 92 days (Aug-Nov 2026) at
 * seven places. It saturates at about 0.44 across the UK; Keswick and Edale sat
 * between 0.35 and 0.44 the whole time; London and Norwich ran from about 0.08
 * in a dry September to 0.35 after November rain; Madrid went down to 0.05.
 * The bands split that spread so the fells read muddy most days, a dry
 * lowland summer reads hard, and a wet lowland week reads soggy.
 *
 * It is a model with no idea of the soil type: sand drains at values where
 * clay is still sticky. Fine for "do I need boots", not for anything finer.
 *
 * Frozen wins over wet, because frozen mud is hard ground.
 */
export const UNDERFOOT_BANDS = [
  'Hard and dry', 'Firm', 'Soft', 'A bit soggy', 'Muddy', 'Very muddy',
] as const;
export type Underfoot = (typeof UNDERFOOT_BANDS)[number] | 'Frozen hard';

export function underfoot(moisture?: number, surfaceTempC?: number): Underfoot | null {
  if (typeof moisture !== 'number' || !Number.isFinite(moisture)) return null;
  if (typeof surfaceTempC === 'number' && surfaceTempC <= 0) return 'Frozen hard';
  if (moisture < 0.15) return 'Hard and dry';
  if (moisture < 0.25) return 'Firm';
  if (moisture < 0.32) return 'Soft';
  if (moisture < 0.37) return 'A bit soggy';
  if (moisture < 0.41) return 'Muddy';
  return 'Very muddy';
}

/**
 * The readings for one section.
 *
 * Nothing is defaulted: a missing field produces no row, never "undefined" and
 * never a zero standing in for an absence. A fabricated reading in a drawer
 * whose whole job is to be checkable is the one unforgivable bug in this file.
 */
export function rowsFor(section: RankedSection, r: Readings | null, lang?: LangCode): Row[] {
  if (!r) return [];
  const L = localeOf(lang);
  const T = (key: TKey) => tr_(L, key);
  const n = (v: unknown, unit: string, dp = 0): string | null =>
    typeof v === 'number' && Number.isFinite(v) ? `${fmt(L, v, dp)}${unit}` : null;
  const keep = (label: string, v: string | null): Row[] => (v ? [{ label, value: v }] : []);
  const kmh = (ms?: number) => (typeof ms === 'number' ? ms * 3.6 : undefined);
  const today = r.daily?.[0];
  const compassOf = (deg?: number) =>
    typeof deg === 'number' && Number.isFinite(deg) ? L.compassShort[Math.round(deg / 45) % 8] : null;
  const clock = (iso?: string) => (iso
    ? new Date(iso).toLocaleTimeString(L.intl, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    : null);

  switch (section.id) {
    case 'wind':
      return [
        ...keep(T('fact_now'), n(kmh(r.windSpeedMS), ' km/h')),
        ...keep(T('fact_today'), n(kmh(today?.windMS), ' km/h')),
        ...keep(T('fact_from_the'), compassOf(r.windDeg)),
      ];
    case 'rain':
      return [
        ...keep(T('fact_today'), n(rainToday(r), ' mm', 1)),
        ...keep(T('fact_next_hour'), n(r.hourly?.[0]?.precipMM, ' mm', 1)),
      ];
    case 'temperature':
      return [
        ...keep(T('fact_now'), n(r.temperatureC, '°C')),
        ...keep(T('fact_feels'), n(r.feelsLikeC, '°C')),
        ...keep(T('fact_high'), n(today?.maxC, '°C')),
        ...keep(T('fact_low'), n(today?.minC, '°C')),
      ];
    case 'sea':
      return [
        ...keep(T('fact_wave_height'), n(r.marine?.waveHeight, ' m', 1)),
        ...keep(T('fact_swell'), n(r.marine?.swellHeight, ' m', 1)),
        ...keep(T('fact_swell_period'), n(r.marine?.swellPeriod ?? r.marine?.wavePeriod, ' s')),
        ...keep(T('fact_sea_temp'), n(r.marineHourly?.[0]?.waterTempC, '°C', 1)),
      ];
    case 'tide':
      // Two extremes is a tide; six is a timetable, and this is a drawer.
      return (r.tides ?? []).slice(0, 2).flatMap((t) => {
        const when = typeof t.time === 'string' ? clock(t.time) : null;
        const label = T(t.type === 'high' ? 'fact_high_water' : t.type === 'low' ? 'fact_low_water' : 'fact_tide');
        return when ? [{ label, value: when }] : [];
      });
    case 'sky':
      return [
        ...keep(T('fact_cloud'), n(r.cloudsPct, '%')),
        ...keep(T('fact_visibility'), n(r.visibilityKm, ' km', 1)),
        ...keep(T('fact_uv'), n(r.uvi, '')),
      ];
    case 'air': {
      const worstPollen = Object.entries(r.pollen ?? {})
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      return [
        ...keep(T('fact_humidity'), n(r.humidityPct, '%')),
        ...keep(T('fact_pressure'), n(r.pressureHpa, ' hPa')),
        ...keep(T('fact_air_quality'), n(r.airQuality?.aqi, '')),
        ...keep(T('fact_pm25'), n(r.airQuality?.components?.pm2_5, ' µg/m³', 1)),
        ...(worstPollen
          ? [{ label: T('fact_pollen'), value: L.t[`pollen_${worstPollen[0]}`] ?? worstPollen[0].replace(/_/g, ' ') }]
          : []),
      ];
    }
    case 'ground': {
      const band = underfoot(r.soil?.moisture0to1, r.soil?.temp0cm);
      return [
        ...keep(T('fact_soil_surface'), n(r.soil?.temp0cm, '°C')),
        ...keep(T('fact_soil_6'), n(r.soil?.temp6cm, '°C')),
        ...keep(T('fact_underfoot'), band ? L.underfoot[band].label : null),
      ];
    }
    case 'night':
      return [
        ...keep(T('fact_moon'), n(r.moon?.illuminationPct, '')
          ? tr_(L, 'moon_lit', { pct: n(r.moon?.illuminationPct, '') as string }) : null),
        ...keep(T('fact_moonrise'), clock(r.moon?.moonriseISO)),
        ...keep(T('fact_moonset'), clock(r.moon?.moonsetISO)),
      ];
    default:
      return [];
  }
}
