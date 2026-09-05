/**
 * Turning `/api/unified-weather` into rows a person can read.
 *
 * Shared by the evidence drawer and `/weather`, because they answer the same
 * question at different depths and there is no version of this codebase where
 * two readers of the same endpoint stay in agreement. The first one already
 * shipped broken once — written against OpenWeather One Call field names the
 * endpoint has never returned — and a second copy would have been a second
 * chance to do that.
 *
 * @module lib/godaisy/call/readings
 */

import type { RankedSection } from './evidence';

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
  hourly?: Array<{ timeISO?: string; tempC?: number; windMS?: number; precipMM?: number }>;
  daily?: Array<{ minC?: number; maxC?: number; windMS?: number; precipMM?: number; moonPhase?: number }>;
  marine?: { waveHeight?: number; wavePeriod?: number; swellHeight?: number; swellPeriod?: number };
  /** An ARRAY of extremes, not an object with one. */
  tides?: Array<{ time?: string; type?: string; height?: number }>;
  marineHourly?: Array<{ waterTempC?: number }>;
  airQuality?: { aqi?: number; components?: Record<string, number> };
  pollen?: Record<string, number | string | null>;
  soil?: { temp0cm?: number; temp6cm?: number; moisture0to1?: number };
  moon?: { illuminationPct?: number; moonriseISO?: string; moonsetISO?: string };
}

export interface Row { label: string; value: string }

/** Degrees to the eight points, because "215°" is a number and "SW" is a wind. */
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
const compass = (deg?: number) =>
  typeof deg === 'number' && Number.isFinite(deg) ? COMPASS[Math.round(deg / 45) % 8] : null;

/** Today's total from the hourly series, since the daily figure is not always there. */
const rainToday = (r: Readings): number | undefined => {
  const today = new Date().toISOString().slice(0, 10);
  const hours = (r.hourly ?? []).filter((h) => h.timeISO?.startsWith(today));
  if (!hours.length) return r.daily?.[0]?.precipMM;
  return hours.reduce((sum, h) => sum + (typeof h.precipMM === 'number' ? h.precipMM : 0), 0);
};

/**
 * The readings for one section.
 *
 * Nothing is defaulted: a missing field produces no row, never "undefined" and
 * never a zero standing in for an absence. A fabricated reading in a drawer
 * whose whole job is to be checkable is the one unforgivable bug in this file.
 */
export function rowsFor(section: RankedSection, r: Readings | null): Row[] {
  if (!r) return [];
  const n = (v: unknown, unit: string, dp = 0): string | null =>
    typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(dp)}${unit}` : null;
  const keep = (label: string, v: string | null): Row[] => (v ? [{ label, value: v }] : []);
  const kmh = (ms?: number) => (typeof ms === 'number' ? ms * 3.6 : undefined);
  const today = r.daily?.[0];

  switch (section.id) {
    case 'wind': {
      const dir = compass(r.windDeg);
      return [
        ...keep('Now', n(kmh(r.windSpeedMS), ' km/h')),
        ...keep('Today', n(kmh(today?.windMS), ' km/h')),
        ...keep('From the', dir),
      ];
    }
    case 'rain':
      return [
        ...keep('Today', n(rainToday(r), ' mm', 1)),
        ...keep('Next hour', n(r.hourly?.[0]?.precipMM, ' mm', 1)),
      ];
    case 'temperature':
      return [
        ...keep('Now', n(r.temperatureC, '°')),
        ...keep('Feels like', n(r.feelsLikeC, '°')),
        ...keep('High', n(today?.maxC, '°')),
        ...keep('Low', n(today?.minC, '°')),
      ];
    case 'sea':
      return [
        ...keep('Wave height', n(r.marine?.waveHeight, ' m', 1)),
        ...keep('Swell', n(r.marine?.swellHeight, ' m', 1)),
        ...keep('Swell period', n(r.marine?.swellPeriod ?? r.marine?.wavePeriod, ' s')),
        ...keep('Sea temperature', n(r.marineHourly?.[0]?.waterTempC, '°', 1)),
      ];
    case 'tide':
      // Two extremes is a tide; six is a timetable, and this is a drawer.
      return (r.tides ?? []).slice(0, 2).flatMap((t) => {
        const when = typeof t.time === 'string'
          ? new Date(t.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
          : null;
        const kind = typeof t.type === 'string' ? t.type : 'tide';
        return when ? [{ label: `${kind[0].toUpperCase()}${kind.slice(1)} water`, value: when }] : [];
      });
    case 'sky':
      return [
        ...keep('Cloud', n(r.cloudsPct, '%')),
        ...keep('Visibility', n(r.visibilityKm, ' km', 1)),
        ...keep('UV', n(r.uvi, '')),
      ];
    case 'air': {
      const worstPollen = Object.entries(r.pollen ?? {})
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => (b[1] as number) - (a[1] as number))[0];
      return [
        ...keep('Humidity', n(r.humidityPct, '%')),
        ...keep('Pressure', n(r.pressureHpa, ' hPa')),
        ...keep('Air quality', n(r.airQuality?.aqi, '')),
        ...keep('PM2.5', n(r.airQuality?.components?.pm2_5, ' µg/m³', 1)),
        ...(worstPollen ? [{ label: 'Most pollen', value: worstPollen[0].replace(/_/g, ' ') }] : []),
      ];
    }
    case 'ground':
      return [
        ...keep('Soil at the surface', n(r.soil?.temp0cm, '°')),
        ...keep('Soil at 6 cm', n(r.soil?.temp6cm, '°')),
        ...keep('Moisture, top layer', n(
          typeof r.soil?.moisture0to1 === 'number' ? r.soil.moisture0to1 * 100 : undefined, '%')),
      ];
    case 'night': {
      const time = (iso?: string) => (iso
        ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : null);
      return [
        ...keep('Moon', n(r.moon?.illuminationPct, '% lit')),
        ...keep('Moonrise', time(r.moon?.moonriseISO)),
        ...keep('Moonset', time(r.moon?.moonsetISO)),
      ];
    }
    default:
      return [];
  }
}
