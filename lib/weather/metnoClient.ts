/**
 * MET Norway Locationforecast 2.0 `complete`, cached across instances.
 *
 * met.no is free, global, and asks clients to cache: its terms require an
 * identifying User-Agent, at most 4 decimals of position, and that a response
 * is reused until it expires rather than re-requested (it updates roughly
 * hourly). Every caller that wants a met.no forecast should come through here,
 * so a point is fetched once per TTL however many routes and crons ask.
 *
 * met.no costs nothing per call, where Open-Meteo bills every request against a
 * monthly plan (9.1M calls in 30 days against 1M, 2026-10), so prefer it where
 * it carries what a feature needs. It often doesn't: outside the Nordics there
 * are no gusts or rain probability, and even there gusts and UV stop after
 * ~2.5 days (see lib/grow/dailyForecast.ts).
 *
 * The caller chooses the rounding (the key uses the coordinates it is given);
 * anything past 4 decimals is trimmed here because met.no rejects it.
 */
import { sharedCached, roundCoord } from '../cache/sharedFetchCache';

export interface MetNoInstantDetails {
  air_temperature?: number;
  air_pressure_at_sea_level?: number;
  relative_humidity?: number;
  wind_speed?: number;
  wind_speed_of_gust?: number;
  wind_from_direction?: number;
  cloud_area_fraction?: number;
  dew_point_temperature?: number;
  ultraviolet_index_clear_sky?: number;
  fog_area_fraction?: number;
}

export interface MetNoPeriod {
  summary?: { symbol_code?: string };
  details?: {
    precipitation_amount?: number;
    probability_of_precipitation?: number;
    air_temperature_max?: number;
    air_temperature_min?: number;
  };
}

export interface MetNoTimestep {
  time: string;
  data: {
    instant?: { details?: MetNoInstantDetails };
    next_1_hours?: MetNoPeriod;
    next_6_hours?: MetNoPeriod;
    next_12_hours?: MetNoPeriod;
  };
}

export interface MetNoCompleteResponse {
  properties?: { timeseries?: MetNoTimestep[] };
}

/** met.no updates about hourly; 30 minutes keeps us well inside its Expires. */
const METNO_TTL_S = 30 * 60;
const METNO_FAILURE_TTL_S = 5 * 60;
const METNO_TIMEOUT_MS = 8_000;

function userAgent(): string {
  return process.env.METNO_USER_AGENT || 'Go Daisy/1.0 (hello@godaisy.io)';
}

/** Fetch (or reuse) the `complete` forecast for a point. Throws on failure. */
export async function fetchMetNoComplete(lat: number, lon: number): Promise<MetNoCompleteResponse> {
  const rLat = roundCoord(lat, 4);
  const rLon = roundCoord(lon, 4);
  const { value } = await sharedCached<MetNoCompleteResponse>(
    `metno-complete:v1:${rLat},${rLon}`,
    { ttlS: METNO_TTL_S, failureTtlS: METNO_FAILURE_TTL_S, name: 'metno-complete' },
    async () => {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${rLat}&lon=${rLon}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent(), Accept: 'application/json' },
        signal: AbortSignal.timeout(METNO_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`met.no HTTP ${res.status}`);
      const body = (await res.json()) as MetNoCompleteResponse;
      if (!body?.properties?.timeseries?.length) throw new Error('met.no empty timeseries');
      return body;
    },
  );
  return value;
}
