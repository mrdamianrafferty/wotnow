/**
 * Snow depth reaches The Call, in centimetres.
 *
 * Around eighty activity models score `snowDepthCm` — skiing wants 60 to 200,
 * football calls itself off above 1 — and until 12 Nov 2026 not one of those
 * rules had ever been evaluated on The Call: the adapter never asked Open-Meteo
 * for snow depth, and a missing key is skipped. Open-Meteo publishes it hourly
 * and in METRES, so the conversion is tested where it happens.
 */
jest.mock('../lib/weather/fetchWithRetry', () => ({ fetchWithRetry: jest.fn() }), { virtual: true });

import { fetchOpenMeteoAsOneCallShape } from '../lib/weather/openMeteoOneCallAdapter';

const DATE = '2026-11-12';

function payload(snowDepthM: Array<number | null> | undefined, snowfallCm?: number[]) {
  const time = Array.from({ length: 24 }, (_, h) => `${DATE}T${String(h).padStart(2, '0')}:00`);
  return {
    daily: {
      time: [DATE],
      weather_code: [73], temperature_2m_min: [-6], temperature_2m_max: [-1],
      precipitation_sum: [0], precipitation_hours: [0],
      wind_speed_10m_max: [5], wind_speed_10m_mean: [3], wind_gusts_10m_max: [8],
      wind_direction_10m_dominant: [180],
    },
    hourly: {
      time,
      temperature_2m: time.map(() => -3),
      precipitation: time.map(() => 0),
      rain: time.map(() => 0),
      visibility: time.map(() => 20000),
      ...(snowDepthM ? { snow_depth: snowDepthM } : {}),
      ...(snowfallCm ? { snowfall: snowfallCm } : {}),
    },
    current: {},
  };
}

async function snowFor(snowDepthM?: Array<number | null>): Promise<number | undefined> {
  const g = global as unknown as { fetch: jest.Mock };
  g.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload(snowDepthM) });
  const shape = await fetchOpenMeteoAsOneCallShape(69.65, 18.96) as { daily: { snow_depth_cm?: number }[] };
  return shape.daily?.[0]?.snow_depth_cm;
}

describe('snow depth on The Call', () => {
  it('asks Open-Meteo for it', async () => {
    await snowFor(Array(24).fill(0.09));
    const url = String((global as unknown as { fetch: jest.Mock }).fetch.mock.calls[0][0]);
    expect(decodeURIComponent(url)).toMatch(/hourly=[^&]*snow_depth/);
  });

  it('converts Open-Meteo metres to centimetres: Tromsø\'s 0.09 m is 9 cm', async () => {
    expect(await snowFor(Array(24).fill(0.09))).toBeCloseTo(9);
  });

  it('means the daytime only, as every other daily figure here does', async () => {
    // 40 cm overnight drifting down to 10 cm by day: the day is what is skied on.
    const depth = Array.from({ length: 24 }, (_, h) => (h >= 9 && h < 18 ? 0.1 : 0.4));
    expect(await snowFor(depth)).toBeCloseTo(10);
  });

  it('is absent, not zero, when the source has no snow series', async () => {
    expect(await snowFor(undefined)).toBeUndefined();
    expect(await snowFor(Array(24).fill(null))).toBeUndefined();
  });
});

async function dayFor(snowfallCm?: number[]) {
  const g = global as unknown as { fetch: jest.Mock };
  g.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload(undefined, snowfallCm) });
  return fetchOpenMeteoAsOneCallShape(69.65, 18.96) as Promise<{
    daily: { snowfall_rate_mm_h?: number }[];
    dayparts?: Record<string, Record<string, { snowfallRateMmH?: number }>>;
  }>;
}

describe('snowfall on The Call', () => {
  it('takes the heaviest daytime hour, in mm per hour from Open-Meteo\'s cm', async () => {
    // 0.3 cm in the 14:00 hour is 3 mm/h; the 06:00 burst is before the day starts.
    const fall = Array.from({ length: 24 }, (_, h) => (h === 14 ? 0.3 : h === 6 ? 2 : h === 10 ? 0.1 : 0));
    const shape = await dayFor(fall);
    expect(shape.daily[0].snowfall_rate_mm_h).toBeCloseTo(3);
  });

  it('gives each part of the day its own heaviest hour', async () => {
    const fall = Array.from({ length: 24 }, (_, h) => (h === 14 ? 0.3 : h === 10 ? 0.1 : 0));
    const parts = (await dayFor(fall)).dayparts?.[DATE];
    expect(parts?.morning?.snowfallRateMmH).toBeCloseTo(1);
    expect(parts?.afternoon?.snowfallRateMmH).toBeCloseTo(3);
    expect(parts?.evening?.snowfallRateMmH).toBe(0);
  });

  it('is absent, not zero, without a snowfall series', async () => {
    expect((await dayFor(undefined)).daily[0].snowfall_rate_mm_h).toBeUndefined();
  });
});
