/**
 * The Open-Meteo bill guards: one upstream request per point however many
 * routes ask, failures held instead of retried, and callers still getting the
 * exact window they asked for.
 */
jest.mock('../lib/monitoring/weatherMetrics', () => ({
  monitoredFetch: jest.fn(),
  weatherMetrics: { start: () => ({ success() {}, failure() {} }) },
}));
import { monitoredFetch } from '../lib/monitoring/weatherMetrics';
import {
  sharedCached,
  CachedFailureError,
  __resetSharedMemoryCache,
  roundCoord,
} from '../lib/cache/sharedFetchCache';
import {
  fetchOpenMeteoWeather,
  fetchOpenMeteoDailyForecastRaw,
  sliceHourlyToDates,
} from '../lib/services/weatherService';

const mocked = monitoredFetch as jest.Mock;
let n = 0;
const uniq = () => `t${++n}`;

function hourly(days: string[]) {
  const time = days.flatMap((d) => Array.from({ length: 24 }, (_, h) => `${d}T${String(h).padStart(2, '0')}:00`));
  return { utc_offset_seconds: 0, hourly: { time, soil_temperature_0cm: time.map((_, i) => i), pressure_msl: time.map(() => 1013) } };
}

beforeEach(() => {
  __resetSharedMemoryCache();
  mocked.mockReset();
});

describe('sharedCached', () => {
  it('remembers a thrown failure and answers later callers without a request', async () => {
    const key = uniq();
    const fetcher = jest.fn(async () => { throw new Error('HTTP 429'); });
    const opts = { ttlS: 60, failureTtlS: 60, name: 'test' };
    await expect(sharedCached(key, opts, fetcher)).rejects.toThrow('HTTP 429');
    await expect(sharedCached(key, opts, fetcher)).rejects.toBeInstanceOf(CachedFailureError);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('gives concurrent callers one fetch, and only the fetching caller is fresh', async () => {
    const key = uniq();
    const fetcher = jest.fn(async () => 42);
    const res = await Promise.all([1, 2, 3].map(() => sharedCached(key, { ttlS: 60, failureTtlS: 60, name: 'test' }, fetcher)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(res.map((r) => r.value)).toEqual([42, 42, 42]);
    expect(res.filter((r) => r.fresh)).toHaveLength(1);
  });

  it('rounds coordinates', () => {
    expect(roundCoord(51.50731, 2)).toBe(51.51);
    expect(roundCoord(-0.12764, 1)).toBe(-0.1);
  });
});

describe('sliceHourlyToDates', () => {
  it('keeps only rows inside the window and leaves non-parallel fields alone', () => {
    const data = hourly(['2026-10-24', '2026-10-25']);
    const out = sliceHourlyToDates(data, '2026-10-24', '2026-10-24');
    expect(out.hourly.time).toHaveLength(24);
    expect(out.hourly.soil_temperature_0cm[23]).toBe(23);
    expect(out.utc_offset_seconds).toBe(0);
    expect(data.hourly.time).toHaveLength(48); // the cached original is untouched
  });
});

describe('fetchOpenMeteoWeather', () => {
  it('serves today-only and today..tomorrow callers from one request', async () => {
    mocked.mockResolvedValue({ ok: true, json: async () => hourly(['2030-01-01', '2030-01-02']) });
    const lat = 40 + n / 100;
    const a = (await fetchOpenMeteoWeather(lat, -3.7, '2030-01-01', '2030-01-02')) as ReturnType<typeof hourly>;
    const b = (await fetchOpenMeteoWeather(lat + 0.001, -3.7, '2030-01-01', '2030-01-01')) as ReturnType<typeof hourly>;
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(a.hourly.time).toHaveLength(48);
    expect(b.hourly.time).toHaveLength(24);
    const url = new URL(mocked.mock.calls[0][2]);
    expect(url.searchParams.get('end_date')).toBe('2030-01-02');
    n++;
  });
});

describe('fetchOpenMeteoDailyForecastRaw', () => {
  it('fetches 7 days once and trims a 5-day caller', async () => {
    const days = Array.from({ length: 7 }, (_, i) => `2030-02-0${i + 1}`);
    mocked.mockResolvedValue({
      ok: true,
      json: async () => ({ daily: { time: days, temperature_2m_max: days.map((_, i) => i) }, ...hourly(days) }),
    });
    const lat = 45 + n / 100;
    const seven = (await fetchOpenMeteoDailyForecastRaw(lat, 2, 7)) as { daily: { time: string[] } };
    const five = (await fetchOpenMeteoDailyForecastRaw(lat, 2, 5)) as { daily: { time: string[]; temperature_2m_max: number[] }; hourly: { time: string[] } };
    expect(mocked).toHaveBeenCalledTimes(1);
    expect(seven.daily.time).toHaveLength(7);
    expect(five.daily.time).toEqual(days.slice(0, 5));
    expect(five.daily.temperature_2m_max).toEqual([0, 1, 2, 3, 4]);
    expect(five.hourly.time).toHaveLength(5 * 24);
    n++;
  });
});
