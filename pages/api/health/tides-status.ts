import type { NextApiRequest, NextApiResponse } from 'next';

const DEFAULT_LAT = 37.7749; // San Francisco
const DEFAULT_LON = -122.4194;
const REQUEST_TIMEOUT_MS = 12_000;
const HEALTH_USER_AGENT = 'WotNowHealthMonitor/1.0 (tides)';

type QueryValue = string | string[] | undefined;

type TideHealthResponse = {
  healthy: boolean;
  timestamp: string;
  durationMs: number;
  sample: { lat: number; lon: number };
  upstreamStatus?: number;
  metrics: {
    success: boolean;
    source: string | null;
    predictionCount: number;
    limited: boolean;
    nextPrediction?: string | null;
  };
  issues: string[];
};

type TideApiPayload = {
  success?: boolean;
  source?: string;
  data?: Array<{ time?: string; height?: number; type?: string }>;
  limited?: boolean;
  status?: number;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<TideHealthResponse | { error: string }>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const lat = parseCoordinate(req.query.lat, DEFAULT_LAT);
  const lon = parseCoordinate(req.query.lon, DEFAULT_LON);
  const baseUrl = resolveBaseUrl(req);
  const tidesUrl = new URL('/api/tides', baseUrl);
  tidesUrl.searchParams.set('lat', lat.toFixed(4));
  tidesUrl.searchParams.set('lon', lon.toFixed(4));

  const started = Date.now();
  res.setHeader('Cache-Control', 'no-store');

  try {
    const { response, data } = await fetchJsonWithTimeout(tidesUrl.toString());
    const tideData: TideApiPayload = (data && typeof data === 'object') ? (data as TideApiPayload) : {};

    const success = tideData.success !== false;
    const predictions = Array.isArray(tideData.data) ? tideData.data : [];
    const limited = Boolean(tideData.limited);
    const issues: string[] = [];

    if (!response.ok) {
      issues.push(`tides endpoint returned ${response.status}`);
    }
    if (!success) {
      issues.push('Tides endpoint reported success=false');
    }
    if (!predictions.length) {
      issues.push('No tide predictions returned');
    }
    if (limited) {
      issues.push('Tide upstream returned limited payload (likely rate limit)');
    }

    const healthy = response.ok && success && predictions.length > 0 && !limited;

    const payload: TideHealthResponse = {
      healthy,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      sample: { lat, lon },
      upstreamStatus: response.status,
      metrics: {
        success,
        source: tideData.source ?? null,
        predictionCount: predictions.length,
        limited,
        nextPrediction: predictions[0]?.time ?? null,
      },
      issues,
    };

    return res.status(healthy ? 200 : 503).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const payload: TideHealthResponse = {
      healthy: false,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - started,
      sample: { lat, lon },
      metrics: {
        success: false,
        source: null,
        predictionCount: 0,
        limited: false,
        nextPrediction: null,
      },
      issues: [message],
    };
    return res.status(503).json(payload);
  }
}
