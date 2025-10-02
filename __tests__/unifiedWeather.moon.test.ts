import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'node:path';

type MockRes = NextApiResponse & { _getStatus: () => number; _getJSON: () => unknown };

function createMockRes(): MockRes {
  let statusCode = 0;
  let payload: unknown;
  const headers: Record<string, string> = {};
  const res: Partial<NextApiResponse> & { _getStatus: () => number; _getJSON: () => unknown } = {
    setHeader: (name: string, value: string) => {
      headers[name] = value;
      return res as NextApiResponse;
    },
    status: (code: number) => {
      statusCode = code;
      return res as NextApiResponse;
    },
    json: (data: unknown) => {
      payload = data;
      return res as NextApiResponse;
    },
    _getStatus: () => statusCode,
    _getJSON: () => payload,
  };
  return res as MockRes;
}

describe('Unified Weather API – moon enrichment', () => {
  const servicesModuleId = require.resolve('../../lib/services/weatherService', {
    paths: [path.join(process.cwd(), 'pages', 'api')],
  });
  const moonModuleId = require.resolve('../../lib/astro/moonService', {
    paths: [path.join(process.cwd(), 'pages', 'api')],
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.OPENWEATHER_KEY = 'test-ow-key';
    delete process.env.STORMGLASS_SECRET_KEY;
    delete process.env.STORMGLASS_API_KEY;
  });

  test('injects cached moon data into response', async () => {
    const moonPayload = {
      latBucket: 40.0,
      lonBucket: -74.0,
      localDate: '2024-02-01',
      timezone: 'America/New_York',
      sunriseISO: '2024-02-01T11:00:00.000Z',
      sunsetISO: '2024-02-01T22:00:00.000Z',
      dayLengthMinutes: 660,
      moonriseISO: '2024-02-01T20:30:00.000Z',
      moonsetISO: '2024-02-01T09:15:00.000Z',
      moonPhaseName: 'Waxing Gibbous',
      moonPhaseFraction: 0.65,
      moonIlluminationPct: 82,
      source: 'test-moon',
      cachedAt: '2024-01-31T00:00:00.000Z',
      expiresAt: '2024-02-02T00:00:00.000Z',
    } as const;

    const openWeatherMock = {
      current: {
        temp: 5,
        feels_like: 3,
      },
      hourly: [],
      daily: [
        {
          dt: Math.floor(Date.parse('2024-02-01T00:00:00Z') / 1000),
          temp: { min: 2, max: 8 },
          pop: 0.1,
          weather: [{ description: 'cloudy', icon: '02d' }],
        },
      ],
      source: 'onecall3',
    };

    jest.doMock(servicesModuleId, () => ({
      __esModule: true,
      getFullWeather: jest.fn().mockResolvedValue(openWeatherMock),
      fetchStormglassTides: jest.fn(),
      fetchStormglassMarine: jest.fn(),
      fetchStormglassBio: jest.fn(),
      fetchMetNoMarineSeries: jest.fn(),
      getAirPollution: jest.fn().mockResolvedValue({ list: [] }),
      fetchOpenMeteoAirPollen: jest.fn().mockResolvedValue({}),
      fetchOpenMeteoWeather: jest.fn().mockResolvedValue({ utc_offset_seconds: 0, hourly: {} }),
    }));

    jest.doMock(moonModuleId, () => ({
      __esModule: true,
      getMoonSunData: jest.fn().mockResolvedValue(moonPayload),
    }));

    const handler = (await import('../pages/api/unified-weather')).default as (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

    const req = { query: { lat: '40.7128', lon: '-74.0060', mode: 'land' } } as unknown as NextApiRequest;
    const res = createMockRes();

    await handler(req, res);

    expect(res._getStatus()).toBe(200);
    const body = res._getJSON() as {
      sunriseISO?: string;
      sunsetISO?: string;
      dayLengthMinutes?: number;
      moon?: { phaseName?: string; phaseFraction?: number; illuminationPct?: number; source?: string };
      daily?: Array<{ moonriseISO?: string; moonsetISO?: string; sunriseISO?: string; sunsetISO?: string; dayLengthMinutes?: number; moonPhase?: number }>;
    };

    expect(body.sunriseISO).toBe(moonPayload.sunriseISO);
    expect(body.sunsetISO).toBe(moonPayload.sunsetISO);
    expect(body.dayLengthMinutes).toBe(moonPayload.dayLengthMinutes);
    expect(body.moon?.phaseName).toBe(moonPayload.moonPhaseName);
    expect(body.moon?.phaseFraction).toBe(moonPayload.moonPhaseFraction);
    expect(body.moon?.illuminationPct).toBe(moonPayload.moonIlluminationPct);
    expect(body.moon?.source).toBe('test-moon');

    expect(Array.isArray(body.daily)).toBe(true);
    const firstDay = body.daily?.[0];
    expect(firstDay?.moonriseISO).toBe(moonPayload.moonriseISO);
    expect(firstDay?.moonsetISO).toBe(moonPayload.moonsetISO);
    expect(firstDay?.sunriseISO).toBe(moonPayload.sunriseISO);
    expect(firstDay?.sunsetISO).toBe(moonPayload.sunsetISO);
    expect(firstDay?.dayLengthMinutes).toBe(moonPayload.dayLengthMinutes);
    expect(firstDay?.moonPhase).toBeCloseTo(moonPayload.moonPhaseFraction!);
  });
});
