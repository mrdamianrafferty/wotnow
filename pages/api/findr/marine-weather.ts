import type { NextApiRequest, NextApiResponse } from 'next';
import {
  fetchMetNoMarineSeries,
  fetchOpenMeteoMarineSeries,
  fetchMetNoLocationForecast,
  fetchWorldTides,
  type WorldTidesResponse,
} from '../../../lib/services/weatherService';
import { mapMetNoSymbolToIcon } from '../../../lib/utils/weatherIconMapping';
import { monitoredFetch } from '../../../lib/monitoring/weatherMetrics';

/**
 * API endpoint to fetch live marine weather with priority fallback:
 * 1. MET Norway (free, high quality, Norwegian waters optimized)
 * 2. Open-Meteo (free, global coverage)
 * 
 * IMPORTANT: This endpoint provides LIVE weather data that changes hourly.
 * DO NOT cache this in Supabase. It must be fetched fresh on every request.
 * 
 * Supabase should only store slow-changing data:
 * - Marine bio indicators (Copernicus) - updates daily
 * - Tides - updates daily
 */

interface MarineHour {
  timeISO: string;
  waveHeightM: number | null;
  waveDirectionDeg: number | null;
  seaTemperatureC: number | null;
  windSpeedKts: number | null;
  windDirectionDeg: number | null;
}

interface MarineWeatherResponse {
  current: {
    waveHeightM: number | null;
    waveDirectionDeg: number | null;
    wavePeriodS: number | null;
    windSpeedKts: number | null;
    windDirectionDeg: number | null;
    seaTemperatureC: number | null;
    timestamp: string;
  } | null;
  hourly: Array<{
    time: string;
    waveHeightM: number;
    windSpeedMS: number;
    seaTemperatureC: number;
    waveDirectionDeg?: number | null;
    wavePeriodS?: number | null;
    windDirectionDeg?: number | null;
    airTempC?: number | null;
    weatherIcon?: string | null;
    precipMM?: number | null;
    precipProbability?: number | null;
  }>;
  daily: Array<{
    label: string;
    dateLabel: string;
    waveHeightM: number;
    seaTemperatureC: number;
    windSpeedMS: number;
    windDirectionDeg?: number | null;
    icon?: string | null;
    minTempC?: number | null;
    maxTempC?: number | null;
    precipMM?: number | null;
    precipProbability?: number | null;
    fishingScore: number;
    summary: string;
  }>;
  tides: Array<{
    timeISO: string;
    type: 'HIGH' | 'LOW';
    height: number; // Height in meters
  }>;
  source: 'met' | 'openmeteo' | 'stormglass' | 'fallback';
  error?: string;
}

// ============================================================================
// INTELLIGENT TIDE CACHING
// ============================================================================
// Tides change slowly (12-hour cycles), so we cache per location for 3 hours
// This reduces API calls while still providing fresh enough data

interface TideCacheEntry {
  data: WorldTidesResponse;
  fetchedAt: number;
}

const tideCache = new Map<string, TideCacheEntry>();
// Tides are astronomically predictable - cache for 24 hours
const TIDE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getTideCacheKey(lat: number, lon: number): string {
  // Round to 1 decimal place (~11km precision) - tides identical for nearby locations
  return `${lat.toFixed(1)},${lon.toFixed(1)}`;
}

async function fetchTidesWithCache(lat: number, lon: number): Promise<WorldTidesResponse | null> {
  const cacheKey = getTideCacheKey(lat, lon);
  const now = Date.now();
  
  // Check cache
  const cached = tideCache.get(cacheKey);
  if (cached && (now - cached.fetchedAt) < TIDE_CACHE_TTL_MS) {
    console.log(`[WorldTides] Using cached data for ${cacheKey} (age: ${Math.round((now - cached.fetchedAt) / 1000 / 60)}min)`);
    return cached.data;
  }
  
  // Fetch fresh data
  console.log(`[WorldTides] Fetching fresh tide data for ${cacheKey}`);
  const tidesData = await fetchWorldTides(lat, lon, 7);
  
  if (tidesData) {
    tideCache.set(cacheKey, {
      data: tidesData,
      fetchedAt: now,
    });
    
    // Clean old cache entries (keep cache size reasonable)
    if (tideCache.size > 100) {
      const oldestKey = Array.from(tideCache.entries())
        .sort((a, b) => a[1].fetchedAt - b[1].fetchedAt)[0]?.[0];
      if (oldestKey) tideCache.delete(oldestKey);
    }
  }
  
  return tidesData;
}

function processTideData(tidesResponse: WorldTidesResponse | null): MarineWeatherResponse['tides'] {
  if (!tidesResponse || !tidesResponse.extremes) {
    return [];
  }
  
  return tidesResponse.extremes.map(extreme => ({
    timeISO: new Date(extreme.dt * 1000).toISOString(),
    type: extreme.type.toUpperCase() as 'HIGH' | 'LOW',
    height: extreme.height,
  }));
}

function calculateFishingScore(
  waveHeight: number,
  windSpeed: number,
  seaTemp: number
): number {
  let score = 50;

  // Wave height (optimal: 0.5-1.5m)
  if (waveHeight < 0.3) score += 10; // Very calm
  else if (waveHeight <= 1.5) score += 20; // Ideal
  else if (waveHeight <= 2.5) score -= 10; // Challenging
  else score -= 30; // Dangerous

  // Wind speed (optimal: 5-15 knots)
  if (windSpeed <= 5) score += 10; // Calm
  else if (windSpeed <= 15) score += 20; // Ideal
  else if (windSpeed <= 25) score -= 10; // Challenging
  else score -= 30; // Dangerous

  // Sea temperature (optimal: 10-18°C for UK waters)
  if (seaTemp >= 10 && seaTemp <= 18) score += 15;
  else if (seaTemp >= 8 && seaTemp <= 20) score += 5;
  else score -= 5;

  return Math.max(0, Math.min(100, score));
}

function getFishingSummary(score: number): string {
  if (score >= 80) return 'Excellent conditions for fishing.';
  if (score >= 60) return 'Good conditions expected.';
  if (score >= 40) return 'Fair conditions, exercise caution.';
  if (score >= 20) return 'Challenging conditions, not recommended.';
  return 'Dangerous conditions, avoid fishing.';
}

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  if (targetDate.getTime() === today.getTime()) return 'Today';
  if (targetDate.getTime() === tomorrow.getTime()) return 'Tomorrow';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  return `${day} ${month}`;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MarineWeatherResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      current: null,
      hourly: [],
      daily: [],
      tides: [],
      source: 'fallback',
      error: 'Method not allowed',
    });
  }

  const { lat, lon } = req.query;

  if (!lat || !lon || typeof lat !== 'string' || typeof lon !== 'string') {
    return res.status(400).json({
      current: null,
      hourly: [],
      daily: [],
      tides: [],
      source: 'fallback',
      error: 'Missing or invalid lat/lon parameters',
    });
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return res.status(400).json({
      current: null,
      hourly: [],
      daily: [],
      tides: [],
      source: 'fallback',
      error: 'Invalid lat/lon values',
    });
  }

  const now = new Date();
  const startISO = now.toISOString();
  const end = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000); // 8 days ahead
  const endISO = end.toISOString();

  // Fetch tide data with intelligent caching (runs in parallel with weather fetches)
  const tidesPromise = fetchTidesWithCache(latNum, lonNum);

  // Priority 1: MET Norway (free, high quality)
  try {
    // Fetch both marine and location data for complete weather info
    const [metResult, locationResult] = await Promise.all([
      fetchMetNoMarineSeries(latNum, lonNum, startISO, endISO, { maxHours: 192 }),
      fetchMetNoLocationForecast(latNum, lonNum),
    ]);

    if (metResult && metResult.hours.length > 0) {
      // Build map of weather data by hour
      const weatherByHour = new Map<string, {
        airTempC: number | null;
        symbol: string | null;
        precipMM: number | null;
        precipProb: number | null;
      }>();

      if (locationResult?.properties?.timeseries) {
        for (const entry of locationResult.properties.timeseries) {
          if (!entry?.time) continue;
          const timeISO = new Date(entry.time).toISOString();
          const inst = entry.data?.instant?.details as Record<string, unknown>;
          const data = entry.data as Record<string, unknown>;
          const n1 = data?.next_1_hours as Record<string, Record<string, unknown>> | undefined;
          const n6 = data?.next_6_hours as Record<string, Record<string, unknown>> | undefined;
          const n12 = data?.next_12_hours as Record<string, Record<string, unknown>> | undefined;

          const getSymbol = (n: typeof n1) => (n?.summary as Record<string, unknown>)?.symbol_code as string | undefined;
          const getPrecip = (n: typeof n1) => (n?.details as Record<string, unknown>)?.precipitation_amount as number | undefined;
          const getProb = (n: typeof n1) => (n?.details as Record<string, unknown>)?.probability_of_precipitation as number | undefined;

          weatherByHour.set(timeISO, {
            airTempC: typeof inst?.air_temperature === 'number' ? inst.air_temperature : null,
            symbol: getSymbol(n1) || getSymbol(n6) || getSymbol(n12) || null,
            precipMM: getPrecip(n1) || getPrecip(n6) || getPrecip(n12) || null,
            precipProb: typeof getProb(n1) === 'number' ? getProb(n1)! / 100 :
              typeof getProb(n6) === 'number' ? getProb(n6)! / 100 :
              typeof getProb(n12) === 'number' ? getProb(n12)! / 100 : null,
          });
        }
      }

      const currentHour = metResult.hours[0];
      const current = {
        waveHeightM: currentHour.waveHeightM ?? null,
        waveDirectionDeg: currentHour.waveDirectionDeg ?? null,
        wavePeriodS: null,
        windSpeedKts: currentHour.windSpeedKts ?? null,
        windDirectionDeg: currentHour.windDirectionDeg ?? null,
        seaTemperatureC: currentHour.seaTemperatureC ?? null,
        timestamp: currentHour.timeISO,
      };

      const hourly = metResult.hours.slice(0, 48).map((h: MarineHour) => {
        const weather = weatherByHour.get(h.timeISO);
        const windKts = h.windSpeedKts ?? 0;
        const windMS = windKts / 1.94384; // Convert knots to m/s
        return {
          time: h.timeISO,
          waveHeightM: h.waveHeightM ?? 0,
          windSpeedMS: windMS,
          seaTemperatureC: h.seaTemperatureC ?? 0,
          waveDirectionDeg: h.waveDirectionDeg,
          wavePeriodS: null,
          windDirectionDeg: h.windDirectionDeg,
          airTempC: weather?.airTempC ?? null,
          weatherIcon: weather?.symbol ? (mapMetNoSymbolToIcon(weather.symbol) ?? null) : null,
          precipMM: weather?.precipMM ?? null,
          precipProbability: weather?.precipProb ?? null,
        };
      });

      const dailyMap = new Map<string, typeof metResult.hours>();
      for (const hour of metResult.hours) {
        const dayKey = hour.timeISO.split('T')[0];
        if (!dailyMap.has(dayKey)) dailyMap.set(dayKey, []);
        dailyMap.get(dayKey)!.push(hour);
      }

      const daily = Array.from(dailyMap.entries())
        .slice(0, 7)
        .map(([dayKey, hours]) => {
          const avgWave = hours.reduce((s: number, h: MarineHour) => s + (h.waveHeightM ?? 0), 0) / hours.length;
          const avgWindKts = hours.reduce((s: number, h: MarineHour) => s + (h.windSpeedKts ?? 0), 0) / hours.length;
          const avgWindMS = avgWindKts / 1.94384; // Convert knots to m/s
          const avgTemp = hours.reduce((s: number, h: MarineHour) => s + (h.seaTemperatureC ?? 0), 0) / hours.length;

          const noonTime = new Date(`${dayKey}T12:00:00Z`).getTime();
          let closestHour = hours[0];
          let closestDiff = Math.abs(new Date(hours[0].timeISO).getTime() - noonTime);
          for (const h of hours) {
            const diff = Math.abs(new Date(h.timeISO).getTime() - noonTime);
            if (diff < closestDiff) { closestDiff = diff; closestHour = h; }
          }

          // Aggregate weather data for this day
          const dayWeather = hours.map(h => weatherByHour.get(h.timeISO)).filter(Boolean);
          const airTemps = dayWeather.map(w => w!.airTempC).filter((t): t is number => typeof t === 'number');
          const precipAmounts = dayWeather.map(w => w!.precipMM).filter((p): p is number => typeof p === 'number');
          const precipProbs = dayWeather.map(w => w!.precipProb).filter((p): p is number => typeof p === 'number');
          
          const noonWeather = weatherByHour.get(closestHour.timeISO);
          const icon = noonWeather?.symbol ? mapMetNoSymbolToIcon(noonWeather.symbol) : null;

          const fishingScore = calculateFishingScore(avgWave, avgWindMS, avgTemp);

          return {
            label: getDayLabel(dayKey),
            dateLabel: getDateLabel(dayKey),
            waveHeightM: Math.round(avgWave * 10) / 10,
            seaTemperatureC: Math.round(avgTemp * 10) / 10,
            windSpeedMS: Math.round(avgWindMS * 10) / 10,
            windDirectionDeg: closestHour.windDirectionDeg ?? null,
            icon: icon || undefined,
            minTempC: airTemps.length > 0 ? Math.round(Math.min(...airTemps)) : null,
            maxTempC: airTemps.length > 0 ? Math.round(Math.max(...airTemps)) : null,
            precipMM: precipAmounts.length > 0 ? Math.round(precipAmounts.reduce((a, b) => a + b, 0) * 10) / 10 : null,
            precipProbability: precipProbs.length > 0 ? Math.round(Math.max(...precipProbs) * 100) / 100 : null,
            fishingScore,
            summary: getFishingSummary(fishingScore),
          };
        });

      if (daily.length >= 5) {
        // Await tide data and process it
        const tidesData = await tidesPromise;
        const tides = processTideData(tidesData);
        return res.status(200).json({ current, hourly, daily, tides, source: 'met' });
      } else {
        console.log('[Marine Weather] MET Norway only provided', daily.length, 'days, trying Open-Meteo');
      }
    }
  } catch (metError) {
    console.warn('[Marine Weather] MET Norway failed, trying Open-Meteo', metError);
  }

  // Priority 2: Open-Meteo (free, global)
  try {
    const openMeteoResult = await fetchOpenMeteoMarineSeries(
      latNum,
      lonNum,
      startISO,
      endISO,
      { maxHours: 192 }
    );
    if (openMeteoResult && openMeteoResult.hours.length > 0) {
      const currentHour = openMeteoResult.hours[0];
      const current = {
        waveHeightM: currentHour.waveHeightM ?? null,
        waveDirectionDeg: currentHour.waveDirectionDeg ?? null,
        wavePeriodS: null, // Open-Meteo may not provide wave period
        windSpeedKts: currentHour.windSpeedKts ?? null,
        windDirectionDeg: currentHour.windDirectionDeg ?? null,
        seaTemperatureC: currentHour.seaTemperatureC ?? null,
        timestamp: currentHour.timeISO,
      };

      // First build hourly without weather data
      const hourly = openMeteoResult.hours.slice(0, 48).map((h: MarineHour) => {
        const windKts = h.windSpeedKts ?? 0;
        const windMS = windKts / 1.94384; // Convert knots to m/s
        return {
          time: h.timeISO,
          waveHeightM: h.waveHeightM ?? 0,
          windSpeedMS: windMS,
          seaTemperatureC: h.seaTemperatureC ?? 0,
          waveDirectionDeg: h.waveDirectionDeg,
          wavePeriodS: null,
          windDirectionDeg: h.windDirectionDeg,
          airTempC: null as number | null,
          weatherIcon: null as string | null,
          precipMM: null as number | null,
          precipProbability: null as number | null,
        };
      });

      // Fetch MET Norway location forecast for weather icons, temps, and precipitation
      // If that fails or doesn't have wind, we'll use Open-Meteo's regular weather API below
      const weatherByHour = new Map<string, { airTempC?: number; symbol?: string; precipMM?: number; precipProb?: number; windSpeedMS?: number; windDirDeg?: number }>();
      try {
        const locationResult = await fetchMetNoLocationForecast(latNum, lonNum);
        if (locationResult?.properties?.timeseries) {
          for (const entry of locationResult.properties.timeseries) {
            if (!entry?.time) continue;
            const timeISO = new Date(entry.time).toISOString();
            const inst = entry.data?.instant?.details as Record<string, unknown> | undefined;
            const data = entry.data as Record<string, unknown> | undefined;
            const next1h = data?.next_1_hours as Record<string, unknown> | undefined;
            const next6h = data?.next_6_hours as Record<string, unknown> | undefined;
            const next12h = data?.next_12_hours as Record<string, unknown> | undefined;
            const summary = (next1h?.summary || next6h?.summary || next12h?.summary) as Record<string, unknown> | undefined;
            const details = (next1h?.details || next6h?.details || next12h?.details) as Record<string, unknown> | undefined;
            
            weatherByHour.set(timeISO, {
              airTempC: typeof inst?.air_temperature === 'number' ? inst.air_temperature : undefined,
              symbol: typeof summary?.symbol_code === 'string' ? summary.symbol_code : undefined,
              precipMM: typeof details?.precipitation_amount === 'number' ? details.precipitation_amount : undefined,
              precipProb: typeof details?.probability_of_precipitation === 'number' ? details.probability_of_precipitation / 100 : undefined,
              windSpeedMS: typeof inst?.wind_speed === 'number' ? inst.wind_speed : undefined,
              windDirDeg: typeof inst?.wind_from_direction === 'number' ? inst.wind_from_direction : undefined,
            });
          }
        }
      } catch (err) {
        console.warn('[Marine Weather] MET Norway location forecast failed for Open-Meteo enrichment', err);
      }

      // If MET Norway didn't provide enough wind data, fetch from Open-Meteo weather API
      const hasWindData = Array.from(weatherByHour.values()).some(w => typeof w.windSpeedMS === 'number');
      if (!hasWindData) {
        try {
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&hourly=temperature_2m,windspeed_10m,winddirection_10m&timezone=UTC&forecast_days=7`;
          const weatherRes = await monitoredFetch('open-meteo', 'forecast_hourly_fallback', weatherUrl);
          if (weatherRes.ok) {
            const weatherData = await weatherRes.json() as { hourly?: { time?: number[]; temperature_2m?: number[]; windspeed_10m?: number[]; winddirection_10m?: number[] } };
            if (weatherData.hourly?.time) {
              for (let i = 0; i < weatherData.hourly.time.length; i++) {
                const timeISO = new Date(weatherData.hourly.time[i] * 1000).toISOString();
                const existing = weatherByHour.get(timeISO) || {};
                weatherByHour.set(timeISO, {
                  ...existing,
                  windSpeedMS: weatherData.hourly.windspeed_10m?.[i],
                  windDirDeg: weatherData.hourly.winddirection_10m?.[i],
                  airTempC: existing.airTempC ?? weatherData.hourly.temperature_2m?.[i],
                });
              }
            }
          }
        } catch (err) {
          console.warn('[Marine Weather] Open-Meteo weather API failed', err);
        }
      }

      // Populate hourly array with weather data (air temp, icon, precipitation, WIND)
      for (const hour of hourly) {
        const weather = weatherByHour.get(hour.time);
        if (weather) {
          hour.airTempC = weather.airTempC ?? null;
          hour.weatherIcon = weather.symbol ? (mapMetNoSymbolToIcon(weather.symbol) ?? null) : null;
          hour.precipMM = weather.precipMM ?? null;
          hour.precipProbability = weather.precipProb ?? null;
          // Wind data from Met.no location forecast is already in windSpeedMS
          if (typeof weather.windSpeedMS === 'number') {
            hour.windSpeedMS = weather.windSpeedMS;
          }
          if (typeof weather.windDirDeg === 'number') {
            hour.windDirectionDeg = weather.windDirDeg;
          }
        }
      }

      const dailyMap = new Map<string, typeof openMeteoResult.hours>();
      for (const hour of openMeteoResult.hours) {
        const dayKey = hour.timeISO.split('T')[0];
        if (!dailyMap.has(dayKey)) {
          dailyMap.set(dayKey, []);
        }
        dailyMap.get(dayKey)!.push(hour);
      }

      const daily = Array.from(dailyMap.entries())
        .slice(0, 7)
        .map(([dayKey, hours]) => {
          const avgWave =
            hours.reduce((sum: number, h: MarineHour) => sum + (h.waveHeightM ?? 0), 0) / hours.length;
          const avgWind =
            hours.reduce((sum: number, h: MarineHour) => sum + (h.windSpeedKts ?? 0), 0) / hours.length;
          const avgTemp =
            hours.reduce((sum: number, h: MarineHour) => sum + (h.seaTemperatureC ?? 0), 0) / hours.length;

          // Find hour closest to noon for representative wind direction
          const noonTime = new Date(`${dayKey}T12:00:00Z`).getTime();
          let closestHour = hours[0];
          let closestDiff = Math.abs(new Date(hours[0].timeISO).getTime() - noonTime);
          for (const h of hours) {
            const diff = Math.abs(new Date(h.timeISO).getTime() - noonTime);
            if (diff < closestDiff) {
              closestDiff = diff;
              closestHour = h;
            }
          }

          // Get weather data for this day
          const dayWeatherHours = hours
            .map(h => weatherByHour.get(h.timeISO))
            .filter((w): w is NonNullable<typeof w> => !!w);
          
          const noonWeather = weatherByHour.get(closestHour.timeISO) || {};
          const icon = mapMetNoSymbolToIcon(noonWeather.symbol);
          
          const airTemps = dayWeatherHours.map(w => w.airTempC).filter((t): t is number => typeof t === 'number');
          const minTempC = airTemps.length > 0 ? Math.round(Math.min(...airTemps)) : null;
          const maxTempC = airTemps.length > 0 ? Math.round(Math.max(...airTemps)) : null;
          
          const precipAmounts = dayWeatherHours.map(w => w.precipMM).filter((p): p is number => typeof p === 'number');
          const precipMM = precipAmounts.length > 0 ? Math.round(precipAmounts.reduce((a, b) => a + b, 0) * 10) / 10 : null;
          
          const precipProbs = dayWeatherHours.map(w => w.precipProb).filter((p): p is number => typeof p === 'number');
          const precipProbability = precipProbs.length > 0 ? Math.round(Math.max(...precipProbs) * 100) / 100 : null;

          // Wind from MET Norway location forecast (more reliable than Open-Meteo marine for wind)
          const windSpeedsMS = dayWeatherHours.map(w => w.windSpeedMS).filter((s): s is number => typeof s === 'number');
          const avgWindMS = windSpeedsMS.length > 0 ? windSpeedsMS.reduce((a, b) => a + b, 0) / windSpeedsMS.length : avgWind;
          const noonWindDirDeg = noonWeather.windDirDeg ?? closestHour.windDirectionDeg ?? null;

          const fishingScore = calculateFishingScore(avgWave, avgWindMS, avgTemp);

          return {
            label: getDayLabel(dayKey),
            dateLabel: getDateLabel(dayKey),
            waveHeightM: Math.round(avgWave * 10) / 10,
            seaTemperatureC: Math.round(avgTemp * 10) / 10,
            windSpeedMS: Math.round(avgWindMS * 10) / 10,
            windDirectionDeg: noonWindDirDeg,
            icon,
            minTempC,
            maxTempC,
            precipMM,
            precipProbability,
            fishingScore,
            summary: getFishingSummary(fishingScore),
          };
        });

      // Await tide data and process it
      const tidesData = await tidesPromise;
      const tides = processTideData(tidesData);

      return res.status(200).json({
        current,
        hourly,
        daily,
        tides,
        source: 'openmeteo',
      });
    }
  } catch (openMeteoError) {
    console.warn('[Marine Weather] Open-Meteo failed, trying Stormglass', openMeteoError);
  }

  // Priority 3: Stormglass - skip for now as it requires additional parameters
  // Will implement when needed with proper parameters

  // All sources failed - return fallback
  return res.status(200).json({
    current: null,
    hourly: [],
    daily: [],
    tides: [],
    source: 'fallback',
    error: 'All marine weather sources failed',
  });
}
