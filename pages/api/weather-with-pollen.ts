import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchOpenMeteoAirPollen, getWeatherData } from '../../lib/services/weatherService';
import { roundCoordinates } from '../../utils/coordinatePrecision';

type WeatherPayload = Awaited<ReturnType<typeof getWeatherData>>;

type PollenDaily = {
  grass?: number;
  tree?: number;
  weed?: number;
  olive?: number;
};

type PollenByDate = Record<string, PollenDaily>;

type AirQualityDaily = {
  overall?: number;
  pm2_5?: number;
  pm10?: number;
  no2?: number;
  o3?: number;
  so2?: number;
  co?: number;
  euAqi?: number;
};

type AirQualityByDate = Record<string, AirQualityDaily>;

type WeatherWithPollenResponse = WeatherPayload & {
  pollenByDate?: PollenByDate;
  airQualityByDate?: AirQualityByDate;
};

interface OpenMeteoAirPollenResponse {
  hourly?: {
    time?: string[];
    alder_pollen?: Array<number | null | undefined>;
    birch_pollen?: Array<number | null | undefined>;
    grass_pollen?: Array<number | null | undefined>;
    mugwort_pollen?: Array<number | null | undefined>;
    olive_pollen?: Array<number | null | undefined>;
    ragweed_pollen?: Array<number | null | undefined>;
    pm2_5?: Array<number | null | undefined>;
    pm10?: Array<number | null | undefined>;
    nitrogen_dioxide?: Array<number | null | undefined>;
    ozone?: Array<number | null | undefined>;
    sulphur_dioxide?: Array<number | null | undefined>;
    carbon_monoxide?: Array<number | null | undefined>;
    us_aqi?: Array<number | null | undefined>;
    european_aqi?: Array<number | null | undefined>;
  };
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function toFinite(value: number | null | undefined): number | undefined {
  if (typeof value !== 'number') return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function updateMax(
  target: Record<string, number | undefined>,
  key: string,
  value: number | undefined
): void {
  if (value === undefined) return;
  const current = target[key];
  target[key] = typeof current === 'number' ? Math.max(current, value) : value;
}

function maxDefined(...values: Array<number | undefined>): number | undefined {
  let result: number | undefined;
  for (const value of values) {
    if (value === undefined) continue;
    result = result === undefined ? value : Math.max(result, value);
  }
  return result;
}

function hasNumericValue(record: Record<string, number | undefined>): boolean {
  return Object.values(record).some((value) => typeof value === 'number' && Number.isFinite(value));
}

function hasAnyKey<T>(record: Record<string, T>): boolean {
  return Object.keys(record).length > 0;
}

function aggregatePollenAndAirQuality(hourly?: OpenMeteoAirPollenResponse['hourly']) {
  const pollenByDate: PollenByDate = {};
  const airQualityByDate: AirQualityByDate = {};

  if (!hourly?.time) {
    return { pollenByDate, airQualityByDate };
  }

  const length = hourly.time.length;

  for (let index = 0; index < length; index += 1) {
    const timestamp = hourly.time[index];
    if (!timestamp) continue;
    const [dateKey] = timestamp.split('T');
    if (!dateKey) continue;

    const pollenEntry = pollenByDate[dateKey] ?? (pollenByDate[dateKey] = {});
    const airEntry = airQualityByDate[dateKey] ?? (airQualityByDate[dateKey] = {});

    updateMax(pollenEntry, 'grass', toFinite(hourly.grass_pollen?.[index] ?? undefined));
    const tree = maxDefined(
      toFinite(hourly.alder_pollen?.[index] ?? undefined),
      toFinite(hourly.birch_pollen?.[index] ?? undefined)
    );
    updateMax(pollenEntry, 'tree', tree);

    const weed = maxDefined(
      toFinite(hourly.ragweed_pollen?.[index] ?? undefined),
      toFinite(hourly.mugwort_pollen?.[index] ?? undefined)
    );
    updateMax(pollenEntry, 'weed', weed);
    updateMax(pollenEntry, 'olive', toFinite(hourly.olive_pollen?.[index] ?? undefined));

    updateMax(airEntry, 'overall', toFinite(hourly.us_aqi?.[index] ?? undefined));
    updateMax(airEntry, 'euAqi', toFinite(hourly.european_aqi?.[index] ?? undefined));
    updateMax(airEntry, 'pm2_5', toFinite(hourly.pm2_5?.[index] ?? undefined));
    updateMax(airEntry, 'pm10', toFinite(hourly.pm10?.[index] ?? undefined));
    updateMax(airEntry, 'no2', toFinite(hourly.nitrogen_dioxide?.[index] ?? undefined));
    updateMax(airEntry, 'o3', toFinite(hourly.ozone?.[index] ?? undefined));
    updateMax(airEntry, 'so2', toFinite(hourly.sulphur_dioxide?.[index] ?? undefined));
    updateMax(airEntry, 'co', toFinite(hourly.carbon_monoxide?.[index] ?? undefined));
  }

  for (const key of Object.keys(pollenByDate)) {
    if (!hasNumericValue(pollenByDate[key]!)) {
      delete pollenByDate[key];
    }
  }

  for (const key of Object.keys(airQualityByDate)) {
    if (!hasNumericValue(airQualityByDate[key]!)) {
      delete airQualityByDate[key];
    }
  }

  return { pollenByDate, airQualityByDate };
}

async function fetchPollenSnapshot(
  lat: number,
  lon: number,
  start: Date,
  end: Date
): Promise<OpenMeteoAirPollenResponse | null> {
  try {
    const startDate = toISODate(start);
    const endDate = toISODate(end);
    const data = await fetchOpenMeteoAirPollen(lat, lon, startDate, endDate);
    return (data ?? null) as OpenMeteoAirPollenResponse | null;
  } catch (error) {
    console.warn('Open-Meteo air/pollen fetch failed', error);
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lon } = req.query;

  if (typeof lat !== 'string' || typeof lon !== 'string') {
    return res.status(400).json({ error: 'Missing lat/lon parameters' });
  }

  const latitude = Number.parseFloat(lat);
  const longitude = Number.parseFloat(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return res.status(400).json({ error: 'Invalid lat/lon parameters' });
  }

  try {
    const { lat: weatherLat, lon: weatherLon } = roundCoordinates(latitude, longitude, 'weather');
    const { lat: envLat, lon: envLon } = roundCoordinates(latitude, longitude, 'pollen');

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);

    // Use weather waterfall (NWS/Met.no/Open-Meteo/OpenWeather) instead of direct OpenWeather call
    const [weatherData, pollenData] = await Promise.all([
      getWeatherData(weatherLat, weatherLon),
      fetchPollenSnapshot(envLat, envLon, today, endDate),
    ]);

    const { pollenByDate, airQualityByDate } = aggregatePollenAndAirQuality(pollenData?.hourly);

    const responsePayload: WeatherWithPollenResponse = { ...weatherData };
    if (hasAnyKey(pollenByDate)) responsePayload.pollenByDate = pollenByDate;
    if (hasAnyKey(airQualityByDate)) responsePayload.airQualityByDate = airQualityByDate;

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Weather with pollen API error:', error);
    const details = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: 'Failed to fetch weather and pollen data',
      details,
    });
  }
}
