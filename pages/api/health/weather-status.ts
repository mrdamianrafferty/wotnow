import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_LAT = 40.7128; // NYC
const DEFAULT_LON = -74.0060;
const REQUEST_TIMEOUT_MS = 12_000;
const HEALTH_USER_AGENT = 'WotNowHealthMonitor/1.0 (weather)';

type QueryValue = string | string[] | undefined;

type WeatherApiPayload = {
  current?: { temp?: number } | null;
  daily?: unknown[] | null;
  hourly?: unknown[] | null;
  pollenByDate?: Record<string, unknown> | null;
  source?: string | null;
};

type WeatherHealthResponse = {
  healthy: boolean;
  timestamp: string;
  durationMs: number;
  sample: { lat: number; lon: number };
  upstreamStatus?: number;
  metrics: {
    source: string | null;
    hasCurrent: boolean;
    hasDaily: boolean;
    dailyCount: number;
    hourlyCount: number;
    pollenDays: number;
    hasPollen: boolean;
  };
  issues: string[];
};

function getScalarParam(value: QueryValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseCoordinate(value: QueryValue, fallback: number): number {
  const raw = getScalarParam(value);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveBaseUrl(req: NextApiRequest): string {
  const forwardedProto = getScalarParam(req.headers['x-forwarded-proto']);
  const proto = forwardedProto || (req.headers.host?.includes('localhost') ? 'http' : 'https');
  const forwardedHost = getScalarParam(req.headers['x-forwarded-host']);
  const host = forwardedHost || req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

async function fetchJsonWithTimeout(url: string): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'User-Agent': HEALTH_USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (_error) {
        data = null;
      }
    }

    return { response, data };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<WeatherHealthResponse | { error: string }>) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Handle HEAD requests - return 200 without body for quick health checks
  if (req.method === 'HEAD') {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end();
  }

  const lat = parseCoordinate(req.query.lat, DEFAULT_LAT);
  const lon = parseCoordinate(req.query.lon, DEFAULT_LON);
  const baseUrl = resolveBaseUrl(req);

  const weatherUrl = new URL('/api/weather-with-pollen', baseUrl);
  weatherUrl.searchParams.set('lat', lat.toFixed(4));
  weatherUrl.searchParams.set('lon', lon.toFixed(4));
  const units = getScalarParam(req.query.units) || 'metric';
  weatherUrl.searchParams.set('units', units);
  // Use cache by default for faster health checks (bypass only when explicitly requested)
  if (req.query.bypassCache === 'true') {
    weatherUrl.searchParams.set('bypassCache', 'true');
  } else {
    weatherUrl.searchParams.set('bypassCache', 'false');
  }

  const started = Date.now();
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { response, data } = await fetchJsonWithTimeout(weatherUrl.toString());
    const weatherData: WeatherApiPayload = (data && typeof data === 'object') ? (data as WeatherApiPayload) : {};

    const hasCurrent = Boolean(weatherData.current && typeof weatherData.current.temp === 'number');
    const hasDaily = Array.isArray(weatherData.daily) && weatherData.daily.length > 0;
    const hourlyCount = Array.isArray(weatherData.hourly) ? weatherData.hourly.length : 0;
    const pollenDays = weatherData.pollenByDate ? Object.keys(weatherData.pollenByDate).length : 0;
    const issues: string[] = [];

    if (!response.ok) {
      issues.push(`weather-with-pollen returned ${response.status}`);
    }
    if (!hasCurrent) {
      issues.push('Missing current weather data');
    }
    if (!hasDaily) {
      issues.push('Missing daily forecast data');
    }

    const healthy = response.ok && hasCurrent && hasDaily;

    const payload: WeatherHealthResponse = {
      healthy,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      sample: { lat, lon },
      upstreamStatus: response.status,
      metrics: {
        source: typeof weatherData.source === 'string' ? weatherData.source : null,
        hasCurrent,
        hasDaily,
        dailyCount: Array.isArray(weatherData.daily) ? weatherData.daily.length : 0,
        hourlyCount,
        pollenDays,
        hasPollen: pollenDays > 0,
      },
      issues,
    };

    return res.status(healthy ? 200 : 503).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const payload: WeatherHealthResponse = {
      healthy: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      sample: { lat, lon },
      metrics: {
        source: null,
        hasCurrent: false,
        hasDaily: false,
        dailyCount: 0,
        hourlyCount: 0,
        pollenDays: 0,
        hasPollen: false,
      },
      issues: [message],
    };
    return res.status(503).json(payload);
  }
}
