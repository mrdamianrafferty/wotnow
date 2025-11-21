import type { NextApiRequest, NextApiResponse } from 'next';
import type { PostgrestError } from '@supabase/supabase-js';

import { getSupabaseServerClient } from '../../../lib/supabase/serverClient';
import { FALLBACK_CONDITIONS, type FallbackConditionPayload } from '../../../lib/findr/fallbackConditions';
import { FALLBACK_RECTANGLE_OPTIONS } from '../../../lib/findr/fallbackRectangles';
import { normalizeRectangleCode } from '../../../lib/findr/rectangle';
import { calculateWaterClarity } from '../../../lib/utils/waterClarity';
import {
  fetchMetNoMarineSeries,
  fetchOpenMeteoMarineSeries,
} from '../../../lib/services/weatherService';


type ConditionsSource = 'supabase' | 'fallback';

// Weather API response structure (from unified-weather)
interface WeatherHourlyEntry {
  timeISO?: string;
  tempC?: number;
  feelsLikeC?: number;
  description?: string;
  icon?: string;
  precipMM?: number;
  pop?: number; // Probability of precipitation
  windMS?: number; // Wind speed in meters per second
  windDeg?: number; // Wind direction in degrees
}

interface WeatherApiResponse {
  hourly?: WeatherHourlyEntry[];
  source?: string;
}

interface ConditionsRow {
  rectangle_code?: string | null;
  captured_at?: string | null;
  sea_temp_c?: number | string | null;
  chlorophyll_mg_m3?: number | string | null;
  kd490?: number | string | null;
  dissolved_oxygen_mg_l?: number | string | null;
  salinity_psu?: number | string | null;
  nitrate_umol_l?: number | string | null;
  phosphate_umol_l?: number | string | null;
  wave_height_m?: number | string | null;
  wind_speed_kts?: number | string | null;
  wind_direction_deg?: number | string | null;
  // Ocean currents (Phase 2)
  current_east_ms?: number | string | null;
  current_north_ms?: number | string | null;
  current_speed_ms?: number | string | null;
  current_direction_deg?: number | string | null;
  // Ocean dynamics (Phase 2)
  mixed_layer_depth_m?: number | string | null;
  sea_surface_height_m?: number | string | null;
  // Food chain indicators (Phase 2)
  zooplankton_mmol_m3?: number | string | null;
  phytoplankton_mmol_m3?: number | string | null;
  primary_production_mg_c_m3_day?: number | string | null;
  // Wave details (Phase 2)
  wave_direction_deg?: number | string | null;
  wave_period_s?: number | string | null;
  wind_sea_height_m?: number | string | null;
  swell_height_m?: number | string | null;
  // Tides and metadata
  next_high_tide_iso?: string | null;
  next_low_tide_iso?: string | null;
  // Week 1: Real-time bite score factors
  tide_phase?: string | null;
  tide_flow_speed_ms?: number | string | null;
  air_pressure_hpa?: number | string | null;
  cloud_cover_pct?: number | string | null;
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
      const airTemp = normaliseNumber(record.airTempC);
      const weatherIcon = typeof record.weatherIcon === 'string' ? record.weatherIcon : null;
      const precipMM = normaliseNumber(record.precipMM);
      const precipProbability = normaliseNumber(record.precipProbability);

      return {
        time,
        waveHeightM: waveHeight ?? 0,
        windSpeedKts: windSpeed ?? 0,
        seaTemperatureC: seaTemp ?? 0,
        tideMeters: tideMeters ?? null, // Optional field, null if not available
        waveDirectionDeg: normaliseNumber(record.waveDirectionDeg),
        wavePeriodS: normaliseNumber(record.wavePeriodS),
        windDirectionDeg: normaliseNumber(record.windDirectionDeg),
        airTempC: airTemp ?? null,
        weatherIcon: weatherIcon,
        precipMM: precipMM ?? null,
        precipProbability: precipProbability ?? null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
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
        windDirectionDeg: normaliseNumber(record.windDirectionDeg),
        fishingScore: fishingScore !== undefined ? Math.round(fishingScore) : undefined,
        summary: summary || undefined,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

/**
 * Fetch weather data from the unified weather waterfall and merge into hourly marine data.
 * Uses the FREE waterfall: NWS (US) → Met.no (EU) → Open-Meteo (global) → OpenWeather (fallback)
 * 
 * Note: We use precise coordinates (4dp ~11m) here because:
 * - Rectangle system is only for marine data (Copernicus DB)
 * - Weather waterfall has its own optimized caching (3-6h TTL)
 * - No benefit to rounding since we're calling our own cached endpoint
 */
async function fetchAndMergeWeatherData(
  payload: FallbackConditionPayload,
  preciseLat: number,
  preciseLon: number,
  host?: string
): Promise<void> {
  try {
    // **PHASE 2 FIX**: Use dynamic host instead of hardcoded localhost:3000
    // Prevents failures in production and when dev server runs on different ports
    const baseUrl = host || 'http://localhost:3002';
    const weatherUrl = `${baseUrl}/api/unified-weather?lat=${preciseLat}&lon=${preciseLon}`;
    const response = await fetch(weatherUrl, {
      headers: { 'User-Agent': 'WotNow-Findr-Conditions' }
    });
    
    if (!response.ok) {
      console.warn(`[findr] Weather fetch failed: ${response.status}`);
      return;
    }

    const weatherData = await response.json() as WeatherApiResponse;
    
    if (!weatherData.hourly || weatherData.hourly.length === 0) {
      console.warn('[findr] No hourly weather data available');
      return;
    }

    // Create a map of weather data by timestamp for fast lookup
    const weatherByTime = new Map<string, WeatherHourlyEntry>();
    for (const entry of weatherData.hourly) {
      if (entry.timeISO) {
        // Normalize to hourly timestamp (remove minutes/seconds)
        const normalizedTime = new Date(entry.timeISO);
        normalizedTime.setMinutes(0, 0, 0);
        weatherByTime.set(normalizedTime.toISOString(), entry);
      }
    }

    // Merge weather data into existing hourly marine data
    for (const marineEntry of payload.snapshot.hourly) {
      const normalizedTime = new Date(marineEntry.time);
      normalizedTime.setMinutes(0, 0, 0);
      const weatherEntry = weatherByTime.get(normalizedTime.toISOString());
      
      if (weatherEntry) {
        // Merge weather fields into marine data
        marineEntry.airTempC = weatherEntry.tempC ?? null;
        marineEntry.weatherIcon = weatherEntry.icon ?? null;
        marineEntry.precipMM = weatherEntry.precipMM ?? null;
        marineEntry.precipProbability = weatherEntry.pop ?? null;
        
        // Override wind data from weather if available (more accurate than marine forecast)
        // Convert from m/s to knots (1 m/s = 1.94384 knots)
        if (weatherEntry.windMS !== undefined && weatherEntry.windMS !== null) {
          marineEntry.windSpeedKts = Math.round(weatherEntry.windMS * 1.94384);
        }
        if (weatherEntry.windDeg !== undefined && weatherEntry.windDeg !== null) {
          marineEntry.windDirectionDeg = Math.round(weatherEntry.windDeg);
        }
      }
    }

    console.log(`[findr] Merged weather data from ${weatherData.source || 'unknown'} for ${preciseLat.toFixed(4)},${preciseLon.toFixed(4)}`);
  } catch (error) {
    console.error('[findr] Failed to fetch/merge weather data:', error);
    // Don't throw - weather is supplementary, marine data is still valid
  }
}

/**
 * Fetch live wave data for user's precise fishing location (not rectangle center).
 * Uses the same waterfall strategy as weather: MET Norway → Open-Meteo → cached fallback.
 *
 * Why this matters:
 * - Nearshore waves are typically 30-70% lower than offshore (rectangle center) predictions
 * - Shore anglers see actual conditions at their fishing spot, not open ocean
 * - Wave height varies significantly within a 30km x 60km ICES rectangle
 */
async function fetchAndMergeWaveData(
  payload: FallbackConditionPayload,
  preciseLat: number,
  preciseLon: number
): Promise<void> {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Try MET Norway first (best for Norwegian/North Sea waters, includes nearshore attenuation)
    try {
      const metMarine = await fetchMetNoMarineSeries(
        preciseLat,
        preciseLon,
        now.toISOString(),
        tomorrow.toISOString(),
        { maxHours: 24 }
      );

      if (metMarine && metMarine.hours.length > 0) {
        // Override cached wave data with live nearshore data
        const firstHour = metMarine.firstHour;
        if (firstHour.waveHeightM !== null) {
          payload.snapshot.marine.waveHeightM = firstHour.waveHeightM;
        }
        if (firstHour.waveDirectionDeg !== null) {
          payload.snapshot.marine.waveDirection = firstHour.waveDirectionDeg;
        }

        // Update hourly series with live wave data
        for (let i = 0; i < Math.min(payload.snapshot.hourly.length, metMarine.hours.length); i++) {
          const metHour = metMarine.hours[i];
          if (metHour.waveHeightM !== null) {
            payload.snapshot.hourly[i].waveHeightM = metHour.waveHeightM;
          }
          if (metHour.waveDirectionDeg !== null) {
            payload.snapshot.hourly[i].waveDirectionDeg = metHour.waveDirectionDeg;
          }
          if (metHour.wavePeriodSeconds !== null) {
            payload.snapshot.hourly[i].wavePeriodS = metHour.wavePeriodSeconds;
          }
        }

        console.log(`[findr] ✅ Used MET Norway nearshore wave data for ${preciseLat.toFixed(4)},${preciseLon.toFixed(4)} (${firstHour.waveHeightM}m)`);
        return;
      }
    } catch (metError) {
      console.warn('[findr] MET Norway wave fetch failed, trying Open-Meteo:', metError instanceof Error ? metError.message : String(metError));
    }

    // Fallback to Open-Meteo (global coverage)
    try {
      const openMeteoMarine = await fetchOpenMeteoMarineSeries(
        preciseLat,
        preciseLon,
        now.toISOString(),
        tomorrow.toISOString(),
        { maxHours: 24 }
      );

      if (openMeteoMarine && openMeteoMarine.hours.length > 0) {
        const firstHour = openMeteoMarine.firstHour;
        if (firstHour.waveHeightM !== null) {
          payload.snapshot.marine.waveHeightM = firstHour.waveHeightM;
        }
        if (firstHour.waveDirectionDeg !== null) {
          payload.snapshot.marine.waveDirection = firstHour.waveDirectionDeg;
        }

        for (let i = 0; i < Math.min(payload.snapshot.hourly.length, openMeteoMarine.hours.length); i++) {
          const omHour = openMeteoMarine.hours[i];
          if (omHour.waveHeightM !== null) {
            payload.snapshot.hourly[i].waveHeightM = omHour.waveHeightM;
          }
          if (omHour.waveDirectionDeg !== null) {
            payload.snapshot.hourly[i].waveDirectionDeg = omHour.waveDirectionDeg;
          }
          if (omHour.wavePeriodSeconds !== null) {
            payload.snapshot.hourly[i].wavePeriodS = omHour.wavePeriodSeconds;
          }
        }

        console.log(`[findr] ✅ Used Open-Meteo nearshore wave data for ${preciseLat.toFixed(4)},${preciseLon.toFixed(4)} (${firstHour.waveHeightM}m)`);
        return;
      }
    } catch (omError) {
      console.warn('[findr] Open-Meteo wave fetch failed:', omError instanceof Error ? omError.message : String(omError));
    }

    // Final fallback: keep cached rectangle data from CMEMS
    console.warn(`[findr] ⚠️  No live wave data available for ${preciseLat.toFixed(4)},${preciseLon.toFixed(4)}, using cached rectangle data`);
  } catch (error) {
    console.error('[findr] Failed to fetch/merge wave data:', error);
    // Don't throw - cached wave data from rectangle is still a valid fallback
  }
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
  
  // Calculate water clarity from kd490 (if available) and chlorophyll
  const maybeKd490 = normaliseNumber(row.kd490);
  if (maybeKd490 !== undefined || maybeChl !== undefined) {
    const clarity = calculateWaterClarity(maybeKd490, maybeChl);
    if (clarity) {
      marine.waterClarityIndex = clarity.clarity_index;
      marine.waterClarityMethod = clarity.method;
    }
  }
  
  // Ocean currents (Phase 2 - Comprehensive Copernicus)
  const maybeCurrentEast = normaliseNumber(row.current_east_ms);
  if (maybeCurrentEast !== undefined) marine.currentEastSurface = maybeCurrentEast;
  const maybeCurrentNorth = normaliseNumber(row.current_north_ms);
  if (maybeCurrentNorth !== undefined) marine.currentNorthSurface = maybeCurrentNorth;
  const maybeCurrentSpeed = normaliseNumber(row.current_speed_ms);
  if (maybeCurrentSpeed !== undefined) marine.currentSpeedSurface = maybeCurrentSpeed;
  const maybeCurrentDirection = normaliseNumber(row.current_direction_deg);
  if (maybeCurrentDirection !== undefined) marine.currentDirectionSurface = maybeCurrentDirection;
  
  // Ocean dynamics (Phase 2)
  const maybeMLD = normaliseNumber(row.mixed_layer_depth_m);
  if (maybeMLD !== undefined) marine.mixedLayerDepth = maybeMLD;
  const maybeSSH = normaliseNumber(row.sea_surface_height_m);
  if (maybeSSH !== undefined) marine.seaSurfaceHeight = maybeSSH;
  
  // Food chain indicators (Phase 2)
  const maybeZooplankton = normaliseNumber(row.zooplankton_mmol_m3);
  if (maybeZooplankton !== undefined) marine.zooplanktonSurface = maybeZooplankton;
  const maybePhytoplankton = normaliseNumber(row.phytoplankton_mmol_m3);
  if (maybePhytoplankton !== undefined) marine.phytoplanktonSurface = maybePhytoplankton;
  const maybePrimaryProd = normaliseNumber(row.primary_production_mg_c_m3_day);
  if (maybePrimaryProd !== undefined) marine.primaryProductionSurface = maybePrimaryProd;
  
  // Wave details (Phase 2)
  const maybeWaveDir = normaliseNumber(row.wave_direction_deg);
  if (maybeWaveDir !== undefined) marine.waveDirection = maybeWaveDir;
  const maybeWavePeriod = normaliseNumber(row.wave_period_s);
  if (maybeWavePeriod !== undefined) marine.wavePeriod = maybeWavePeriod;
  const maybeWindSea = normaliseNumber(row.wind_sea_height_m);
  if (maybeWindSea !== undefined) marine.windSeaHeight = maybeWindSea;
  const maybeSwell = normaliseNumber(row.swell_height_m);
  if (maybeSwell !== undefined) marine.swellHeight = maybeSwell;
  
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

  // Week 1: Real-time bite score factors
  if (row.tide_phase && typeof row.tide_phase === 'string') {
    base.snapshot.tides.phase = row.tide_phase;
  }
  const maybeFlowSpeed = normaliseNumber(row.tide_flow_speed_ms);
  if (maybeFlowSpeed !== undefined) {
    base.snapshot.tides.flowSpeedMs = maybeFlowSpeed;
  }
  const maybePressure = normaliseNumber(row.air_pressure_hpa);
  if (maybePressure !== undefined) {
    marine.airPressureHpa = maybePressure;
  }
  const maybeCloudCover = normaliseNumber(row.cloud_cover_pct);
  if (maybeCloudCover !== undefined) {
    marine.cloudCoverPct = maybeCloudCover;
  }

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
      name: code,
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
      .select('rectangle_code, region, cmems_region, center_lat, center_lon, lat_south, lat_north, lon_west, lon_east')
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
      const cmems_region = typeof data.cmems_region === 'string' && data.cmems_region.trim() ? data.cmems_region.trim() : null;
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
          region: cmems_region || code,
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

  // Optional: User's precise location for weather data (more accurate than rectangle center)
  const userLat = req.query.lat ? parseFloat(Array.isArray(req.query.lat) ? req.query.lat[0] : req.query.lat) : null;
  const userLon = req.query.lon ? parseFloat(Array.isArray(req.query.lon) ? req.query.lon[0] : req.query.lon) : null;
  const hasUserLocation = userLat !== null && userLon !== null && !isNaN(userLat) && !isNaN(userLon);

  if (!normalizedCode) {
    const fallback = cloneFallbackPayload();

    // If user provided coordinates (worldwide location), use them instead of hardcoded Spanish location
    if (hasUserLocation && userLat !== null && userLon !== null) {
      // Update fallback to use user's actual coordinates
      fallback.rectangle.code = 'WORLDWIDE';
      fallback.rectangle.name = `${Math.abs(userLat).toFixed(2)}°${userLat >= 0 ? 'N' : 'S'}, ${Math.abs(userLon).toFixed(2)}°${userLon >= 0 ? 'E' : 'W'}`;
      fallback.rectangle.region = 'Worldwide location';
      fallback.rectangle.centerLat = userLat;
      fallback.rectangle.centerLon = userLon;
      // Remove bounds for worldwide locations
      delete fallback.rectangle.bounds;
      console.log('[Conditions API] Using worldwide fallback with user coordinates:', { lat: userLat, lon: userLon });
    }

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
        'rectangle_code, captured_at, sea_temp_c, chlorophyll_mg_m3, kd490, dissolved_oxygen_mg_l, salinity_psu, nitrate_umol_l, phosphate_umol_l, wave_height_m, wind_speed_kts, wind_direction_deg, current_east_ms, current_north_ms, current_speed_ms, current_direction_deg, mixed_layer_depth_m, sea_surface_height_m, zooplankton_mmol_m3, phytoplankton_mmol_m3, primary_production_mg_c_m3_day, wave_direction_deg, wave_period_s, wind_sea_height_m, swell_height_m, next_high_tide_iso, next_low_tide_iso, tide_phase, tide_flow_speed_ms, air_pressure_hpa, cloud_cover_pct, hourly_marine_json, daily_marine_json, source'
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

    // **PHASE 2 FIX**: Construct base URL from request headers for weather fetch
    // This ensures the internal API call works in development and production
    const protocol = req.headers['x-forwarded-proto'] || (req.headers.host?.includes('localhost') ? 'http' : 'https');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3002';
    const baseUrl = `${protocol}://${host}`;

    // Fetch and merge weather data from the waterfall (FREE: NWS/Met.no/Open-Meteo)
    // Use user's precise location if provided, otherwise fall back to rectangle center
    // This adds airTempC, weatherIcon, precipMM, precipProbability to hourly data
    const weatherLat = hasUserLocation ? userLat! : meta.centerLat;
    const weatherLon = hasUserLocation ? userLon! : meta.centerLon;
    await fetchAndMergeWeatherData(payload, weatherLat, weatherLon, baseUrl);

    // Fetch and merge wave data for user's precise fishing location (not rectangle center!)
    // This provides accurate nearshore wave conditions that shore anglers actually see
    // Waterfall: MET Norway → Open-Meteo → cached CMEMS (from rectangle)
    const waveLat = hasUserLocation ? userLat! : meta.centerLat;
    const waveLon = hasUserLocation ? userLon! : meta.centerLon;
    await fetchAndMergeWaveData(payload, waveLat, waveLon);

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