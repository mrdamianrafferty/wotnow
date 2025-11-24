import type { NextApiRequest, NextApiResponse } from 'next';
import { getFullWeather, fetchOpenMeteoAirPollen } from '../../lib/services/weatherService';

type HourlySeries = Array<number | null | undefined> | undefined;

export interface OpenMeteoAirPollenResponse {
  hourly?: {
    time?: string[];
    alder_pollen?: HourlySeries;
    birch_pollen?: HourlySeries;
    grass_pollen?: HourlySeries;
    ragweed_pollen?: HourlySeries;
    mugwort_pollen?: HourlySeries;
    olive_pollen?: HourlySeries;
    us_aqi?: HourlySeries;
    european_aqi?: HourlySeries;
    pm2_5?: HourlySeries;
    pm10?: HourlySeries;
    nitrogen_dioxide?: HourlySeries;
    ozone?: HourlySeries;
    sulphur_dioxide?: HourlySeries;
    carbon_monoxide?: HourlySeries;
  };
}

type DailyPollen = { grass?: number; tree?: number; weed?: number; olive?: number };
type DailyAirQuality = {
  overall?: number;
  european?: number;
  pm2_5?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
};

type AirPollenFetcher = (lat: number, lon: number, startDate: string, endDate: string) => Promise<OpenMeteoAirPollenResponse | null>;

type WeatherWithPollenDeps = {
  getFullWeather: typeof getFullWeather;
  fetchAirPollen: AirPollenFetcher;
  now: () => Date;
  logger: Pick<Console, 'log' | 'error' | 'warn'>;
  getApiKey: () => string | undefined;
};

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

const defaultDeps: WeatherWithPollenDeps = {
  getFullWeather,
  fetchAirPollen: async (lat, lon, start, end) => {
    const response = await fetchOpenMeteoAirPollen(lat, lon, start, end);
    return response as OpenMeteoAirPollenResponse;
  },
  now: () => new Date(),
  logger: console,
  getApiKey: () => process.env.NEXT_PUBLIC_OPENWEATHER_KEY,
};

function getScalarQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseCoordinate(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asBool(value: string | undefined): boolean {
  if (!value) return false;
  return value === '1' || value.toLowerCase() === 'true';
}

function maxOrSet(current: number | undefined, candidate: number): number {
  if (current == null) return candidate;
  return candidate > current ? candidate : current;
}

function safeNumber(value: number | null | undefined): number | null {
  if (value == null) return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function maxDefinedValue(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!filtered.length) return null;
  return Math.max(...filtered);
}

function getDateRange(now: Date) {
  const start = now.toISOString().split('T')[0];
  const end = new Date(now.getTime() + FIVE_DAYS_MS).toISOString().split('T')[0];
  if (new Date(end) <= new Date(start)) {
    throw new Error(`Invalid date range calculated for Open-Meteo (start=${start}, end=${end})`);
  }
  return { start, end };
}

export function createWeatherWithPollenHandler(customDeps?: Partial<WeatherWithPollenDeps>) {
  const deps: WeatherWithPollenDeps = { ...defaultDeps, ...customDeps } as WeatherWithPollenDeps;

  return async function weatherWithPollenHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const latParam = getScalarQueryParam(req.query.lat);
    const lonParam = getScalarQueryParam(req.query.lon);

    if (!latParam || !lonParam) {
      return res.status(400).json({ error: 'Missing lat/lon parameters' });
    }

    const latitude = parseCoordinate(latParam);
    const longitude = parseCoordinate(lonParam);

    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'Invalid lat/lon parameters' });
    }

    const apiKey = deps.getApiKey?.();
    if (!apiKey) {
      deps.logger.error('Missing OpenWeather API key');
      return res.status(500).json({ error: 'Failed to fetch weather and pollen data', details: 'Missing OpenWeather API key' });
    }

    const unitsParam = getScalarQueryParam(req.query.units);
    const units = unitsParam === 'imperial' || unitsParam === 'standard' ? unitsParam : 'metric';
    const bypassCache = asBool(getScalarQueryParam(req.query.bypassCache));

    if (bypassCache) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=900');
    }

    try {
      const { start, end } = getDateRange(deps.now());

      const [weatherData, pollenResponse] = await Promise.all([
        deps.getFullWeather({ lat: latitude, lon: longitude, apiKey, options: { units, bypassCache } }),
        deps
          .fetchAirPollen(latitude, longitude, start, end)
          .catch((error) => {
            deps.logger.warn('Pollen fetch failed, continuing with weather data only', error);
            return null;
          }),
      ]);

      const pollenByDate: Record<string, DailyPollen> = {};
      const airQualityByDate: Record<string, DailyAirQuality> = {};

      const hourly = pollenResponse?.hourly;
      const times = hourly?.time ?? [];

      if (times.length) {
        for (let i = 0; i < times.length; i++) {
          const stamp = times[i];
          if (!stamp) continue;
          const dateKey = stamp.split('T')[0];
          if (!dateKey) continue;

          let pollenEntry = pollenByDate[dateKey];
          let createdPollenEntry = false;
          if (!pollenEntry) {
            pollenEntry = {};
            pollenByDate[dateKey] = pollenEntry;
            createdPollenEntry = true;
          }

          let hasPollenValue = false;
          const grass = safeNumber(hourly.grass_pollen?.[i]);
          if (grass !== null) {
            pollenEntry.grass = maxOrSet(pollenEntry.grass, grass);
            hasPollenValue = true;
          }

          const alder = safeNumber(hourly.alder_pollen?.[i]);
          const birch = safeNumber(hourly.birch_pollen?.[i]);
          const treeCandidate = maxDefinedValue([alder, birch]);
          if (treeCandidate != null) {
            pollenEntry.tree = maxOrSet(pollenEntry.tree, treeCandidate);
            hasPollenValue = true;
          }

          const ragweed = safeNumber(hourly.ragweed_pollen?.[i]);
          const mugwort = safeNumber(hourly.mugwort_pollen?.[i]);
          const weedCandidate = maxDefinedValue([ragweed, mugwort]);
          if (weedCandidate != null) {
            pollenEntry.weed = maxOrSet(pollenEntry.weed, weedCandidate);
            hasPollenValue = true;
          }

          const olive = safeNumber(hourly.olive_pollen?.[i]);
          if (olive !== null) {
            pollenEntry.olive = maxOrSet(pollenEntry.olive, olive);
            hasPollenValue = true;
          }

          if (createdPollenEntry && !hasPollenValue) {
            delete pollenByDate[dateKey];
          }

          let airEntry = airQualityByDate[dateKey];
          let createdAirEntry = false;
          if (!airEntry) {
            airEntry = {};
            airQualityByDate[dateKey] = airEntry;
            createdAirEntry = true;
          }

          let hasAirValue = false;
          const usAqi = safeNumber(hourly.us_aqi?.[i]);
          if (usAqi !== null) {
            airEntry.overall = maxOrSet(airEntry.overall, usAqi);
            hasAirValue = true;
          }

          const euAqi = safeNumber(hourly.european_aqi?.[i]);
          if (euAqi !== null) {
            airEntry.european = maxOrSet(airEntry.european, euAqi);
            hasAirValue = true;
          }

          const pm25 = safeNumber(hourly.pm2_5?.[i]);
          if (pm25 !== null) {
            airEntry.pm2_5 = maxOrSet(airEntry.pm2_5, pm25);
            hasAirValue = true;
          }

          const pm10 = safeNumber(hourly.pm10?.[i]);
          if (pm10 !== null) {
            airEntry.pm10 = maxOrSet(airEntry.pm10, pm10);
            hasAirValue = true;
          }

          const no2 = safeNumber(hourly.nitrogen_dioxide?.[i]);
          if (no2 !== null) {
            airEntry.no2 = maxOrSet(airEntry.no2, no2);
            hasAirValue = true;
          }

          const o3 = safeNumber(hourly.ozone?.[i]);
          if (o3 !== null) {
            airEntry.o3 = maxOrSet(airEntry.o3, o3);
            hasAirValue = true;
          }

          const so2 = safeNumber(hourly.sulphur_dioxide?.[i]);
          if (so2 !== null) {
            airEntry.so2 = maxOrSet(airEntry.so2, so2);
            hasAirValue = true;
          }

          const co = safeNumber(hourly.carbon_monoxide?.[i]);
          if (co !== null) {
            airEntry.co = maxOrSet(airEntry.co, co);
            hasAirValue = true;
          }

          if (createdAirEntry && !hasAirValue) {
            delete airQualityByDate[dateKey];
          }
        }
      }

      const responseBody: Record<string, unknown> = { ...weatherData };

      if (Object.keys(pollenByDate).length) {
        responseBody.pollenByDate = pollenByDate;
      }

      if (Object.keys(airQualityByDate).length) {
        responseBody.airQualityByDate = airQualityByDate;
      }

      return res.status(200).json(responseBody);
    } catch (error) {
      deps.logger.error('Weather with pollen API error', error);
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: 'Failed to fetch weather and pollen data', details: message });
    }
  };
}

export default createWeatherWithPollenHandler();
