import type { NextApiRequest, NextApiResponse } from 'next';
import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { FALLBACK_CONDITIONS, type FallbackConditionPayload } from '../../../lib/findr/fallbackConditions';
import { FALLBACK_RECTANGLE_OPTIONS } from '../../../lib/findr/fallbackRectangles';
import { normalizeRectangleCode } from '../../../lib/findr/rectangle';

type ConditionsSource = 'supabase' | 'fallback';

interface ConditionsRow {
  rectangle_code?: string | null;
  captured_at?: string | null;
  sea_temp_c?: number | string | null;
  chlorophyll_mg_m3?: number | string | null;
  dissolved_oxygen_mg_l?: number | string | null;
  salinity_psu?: number | string | null;
  nitrate_umol_l?: number | string | null;
  phosphate_umol_l?: number | string | null;
  wave_height_m?: number | string | null;
  wind_speed_kts?: number | string | null;
  wind_direction_deg?: number | string | null;
  next_high_tide_iso?: string | null;
  next_low_tide_iso?: string | null;
  hourly_marine_json?: unknown;
  daily_marine_json?: unknown;
  source?: string | null;
}

interface RectangleMeta {
  code: string;
  name: string;
  region: string;
  centerLat: number;
  centerLon: number;
  bounds?: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
}

function cloneFallbackPayload(): FallbackConditionPayload {
  return typeof structuredClone === 'function'
    ? structuredClone(FALLBACK_CONDITIONS)
    : (JSON.parse(JSON.stringify(FALLBACK_CONDITIONS)) as FallbackConditionPayload);
}

function normaliseNumber(input: unknown): number | undefined {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const parsed = Number.parseFloat(input);
    if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function parseIsoString(input: unknown): string | null {
  if (typeof input === 'string' && input.trim().length > 0) {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return null;
}

function parseHourlySeries(input: unknown): FallbackConditionPayload['snapshot']['hourly'] | undefined {
  const rawArray = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(input);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        })()
      : null;

  if (!rawArray) return undefined;

  return rawArray
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const time = typeof record.time === 'string' ? record.time : null;
      if (!time) return null;
      const waveHeight = normaliseNumber(record.waveHeightM);
      const windSpeed = normaliseNumber(record.windSpeedKts);
      const seaTemp = normaliseNumber(record.seaTemperatureC);
      const tideMeters = normaliseNumber(record.tideMeters);

      return {
        time,
        waveHeightM: waveHeight ?? 0,
        windSpeedKts: windSpeed ?? 0,
        seaTemperatureC: seaTemp ?? 0,
        tideMeters: tideMeters ?? 0,
      };
    })
    .filter((entry): entry is FallbackConditionPayload['snapshot']['hourly'][number] => entry !== null);
}

function parseDailySeries(input: unknown): FallbackConditionPayload['snapshot']['daily'] | undefined {
  const rawArray = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(input);
            return Array.isArray(parsed) ? parsed : null;
          } catch {
            return null;
          }
        })()
      : null;

  if (!rawArray) return undefined;

  return rawArray
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label : null;
      const dateLabel = typeof record.dateLabel === 'string' ? record.dateLabel : label;
      if (!label || !dateLabel) return null;

      const waveHeight = normaliseNumber(record.waveHeightM);
      const seaTemp = normaliseNumber(record.seaTemperatureC);
      const windSpeed = normaliseNumber(record.windSpeedKts);
      const fishingScore = normaliseNumber(record.fishingScore);
      const summary = typeof record.summary === 'string' ? record.summary : '';

      return {
        label,
        dateLabel,
        waveHeightM: waveHeight ?? 0,
        seaTemperatureC: seaTemp ?? 0,
        windSpeedKts: windSpeed ?? 0,
        fishingScore: Math.round(fishingScore ?? 0),
        summary,
      };
    })
    .filter((entry): entry is FallbackConditionPayload['snapshot']['daily'][number] => entry !== null);
}

function applyConditionsRow(base: FallbackConditionPayload, row: ConditionsRow): void {
  const capturedAt = parseIsoString(row.captured_at);
  if (capturedAt) {
    base.snapshot.capturedAt = capturedAt;
  }

  const marine = base.snapshot.marine;
  const maybeSeaTemp = normaliseNumber(row.sea_temp_c);
  if (maybeSeaTemp !== undefined) marine.seaTemperatureC = maybeSeaTemp;
  const maybeChl = normaliseNumber(row.chlorophyll_mg_m3);
  if (maybeChl !== undefined) marine.chlorophyllMgM3 = maybeChl;
  const maybeOx = normaliseNumber(row.dissolved_oxygen_mg_l);
  if (maybeOx !== undefined) marine.dissolvedOxygenMgL = maybeOx;
  const maybeSalinity = normaliseNumber(row.salinity_psu);
  if (maybeSalinity !== undefined) marine.salinityPsu = maybeSalinity;
  const maybeNitrate = normaliseNumber(row.nitrate_umol_l);
  if (maybeNitrate !== undefined) marine.nitrateUmolL = maybeNitrate;
  const maybePhosphate = normaliseNumber(row.phosphate_umol_l);
  if (maybePhosphate !== undefined) marine.phosphateUmolL = maybePhosphate;
  const maybeWaveHeight = normaliseNumber(row.wave_height_m);
  if (maybeWaveHeight !== undefined) marine.waveHeightM = maybeWaveHeight;
  const maybeWindSpeed = normaliseNumber(row.wind_speed_kts);
  if (maybeWindSpeed !== undefined) marine.windSpeedKts = maybeWindSpeed;
  const maybeWindDirection = normaliseNumber(row.wind_direction_deg);
  if (maybeWindDirection !== undefined) marine.windDirectionDeg = maybeWindDirection;

  const nextHigh = parseIsoString(row.next_high_tide_iso);
  const nextLow = parseIsoString(row.next_low_tide_iso);
  if (nextHigh) base.snapshot.tides.nextHighIso = nextHigh;
  if (nextLow) base.snapshot.tides.nextLowIso = nextLow;

  const hourly = parseHourlySeries(row.hourly_marine_json);
  if (hourly && hourly.length > 0) {
    base.snapshot.hourly = hourly;
  }

  const daily = parseDailySeries(row.daily_marine_json);
  if (daily && daily.length > 0) {
    base.snapshot.daily = daily;
  }
}

function getFallbackRectangleMeta(code: string): RectangleMeta {
  const fallback = FALLBACK_RECTANGLE_OPTIONS.find((option) => option.code === code);
  if (fallback) {
    return {
      code,
      name: fallback.label,
      region: fallback.region,
      centerLat: fallback.centerLat,
      centerLon: fallback.centerLon,
    };
  }

  return {
    code,
    name: code,
    region: 'Unknown region',
    centerLat: 0,
    centerLon: 0,
  };
}

async function fetchRectangleMeta(supabase: ReturnType<typeof getSupabaseServerClient>, code: string): Promise<RectangleMeta> {
  const sources = ['findr_rectangles', 'ices_rectangles'] as const;
  let lastError: PostgrestError | null = null;

  for (const table of sources) {
    const { data, error } = await supabase
      .from(table)
      .select('rectangle_code, region, center_lat, center_lon, lat_south, lat_north, lon_west, lon_east')
      .eq('rectangle_code', code)
      .maybeSingle();

    if (error) {
      lastError = error;
      if (isMissingRelationError(error)) {
        continue;
      }
      console.warn(`[findr] Failed to load rectangle meta from ${table}`, error.message);
      continue;
    }

    if (data) {
      const region = typeof data.region === 'string' && data.region.trim() ? data.region.trim() : code;
      const centerLat = normaliseNumber(data.center_lat);
      const centerLon = normaliseNumber(data.center_lon);
      const latSouth = normaliseNumber(data.lat_south);
      const latNorth = normaliseNumber(data.lat_north);
      const lonWest = normaliseNumber(data.lon_west);
      const lonEast = normaliseNumber(data.lon_east);

      if (centerLat !== undefined && centerLon !== undefined) {
        const result: RectangleMeta = {
          code,
          name: region,
          region,
          centerLat,
          centerLon,
        };
        
        // Add bounds if all coordinates are available
        if (latSouth !== undefined && latNorth !== undefined && lonWest !== undefined && lonEast !== undefined) {
          result.bounds = {
            south: latSouth,
            north: latNorth,
            west: lonWest,
            east: lonEast,
          };
        }
        
        return result;
      }
    }
  }

  if (lastError && !isMissingRelationError(lastError)) {
    console.warn('[findr] Rectangle meta query errors exhausted, falling back to static options', lastError.message);
  }

  return getFallbackRectangleMeta(code);
}

function isMissingRelationError(error: PostgrestError | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === '42703';
}

function buildResponsePayload(code: string, meta: RectangleMeta): FallbackConditionPayload {
  const payload = cloneFallbackPayload();
  payload.rectangle.code = code;
  payload.rectangle.name = meta.name;
  payload.rectangle.region = meta.region;
  payload.rectangle.centerLat = meta.centerLat;
  payload.rectangle.centerLon = meta.centerLon;
  payload.rectangle.bounds = meta.bounds;
  payload.snapshot.capturedAt = new Date().toISOString();
  return payload;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rectangleParam = Array.isArray(req.query.rectangleCode)
    ? req.query.rectangleCode[0]
    : (req.query.rectangleCode as string | undefined) ?? (Array.isArray(req.query.rectangle) ? req.query.rectangle[0] : (req.query.rectangle as string | undefined));

  const normalizedCode = rectangleParam ? normalizeRectangleCode(rectangleParam) : null;

  if (!normalizedCode) {
    const fallback = cloneFallbackPayload();
    res.setHeader('x-findr-conditions-source', 'fallback');
    return res.status(200).json({ ...fallback, source: 'fallback' satisfies ConditionsSource });
  }

  try {
    const supabase = getSupabaseServerClient();
    const meta = await fetchRectangleMeta(supabase, normalizedCode);
    const payload = buildResponsePayload(normalizedCode, meta);

    const { data, error } = await supabase
      .from('findr_conditions_latest')
      .select(
        'rectangle_code, captured_at, sea_temp_c, chlorophyll_mg_m3, dissolved_oxygen_mg_l, salinity_psu, nitrate_umol_l, phosphate_umol_l, wave_height_m, wind_speed_kts, wind_direction_deg, next_high_tide_iso, next_low_tide_iso, hourly_marine_json, daily_marine_json, source'
      )
      .eq('rectangle_code', normalizedCode)
      .maybeSingle();

    if (error) {
      if (!isMissingRelationError(error)) {
        console.error('[findr] Failed to load live conditions', { rectangle: normalizedCode, error: error.message });
      }
      res.setHeader('x-findr-conditions-source', 'fallback');
      return res.status(200).json({ ...payload, source: 'fallback' satisfies ConditionsSource });
    }

    if (!data) {
      res.setHeader('x-findr-conditions-source', 'fallback');
      return res.status(200).json({ ...payload, source: 'fallback' satisfies ConditionsSource });
    }

    applyConditionsRow(payload, data);

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=43200');
    res.setHeader('x-findr-conditions-source', 'supabase');
    return res.status(200).json({ ...payload, source: 'supabase' satisfies ConditionsSource });
  } catch (error) {
    console.error('[findr] Unexpected conditions API error', error);
    const fallback = cloneFallbackPayload();
    res.setHeader('x-findr-conditions-source', 'fallback');
    return res.status(200).json({ ...fallback, source: 'fallback' satisfies ConditionsSource });
  }
}