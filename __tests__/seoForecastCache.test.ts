import {
  cachedForecast,
  dropEndedDays,
  forecastCacheKey,
  __resetForecastMemoryCache,
  SUCCESS_TTL_S,
} from '@/lib/seo/forecastCache';

const DAY = 86_400;
const todayStart = () => Math.floor(Date.now() / 1000 / DAY) * DAY;
const days = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => ({ date: from + i * DAY, weather: { temperature: 10 + i } }));

let n = 0;
// The Runtime Cache fallback is a module-level in-memory store, so every test
// uses its own key rather than relying on a reset.
const freshKey = () => forecastCacheKey(50 + ++n / 100, -1, false);

beforeEach(() => __resetForecastMemoryCache());

describe('seo forecast cache', () => {
  it('rounds the key to ~1 km and separates coastal from inland', () => {
    expect(forecastCacheKey(51.5031, -0.1276, false)).toBe(forecastCacheKey(51.5049, -0.1301, false));
    expect(forecastCacheKey(51.5, -0.12, true)).not.toBe(forecastCacheKey(51.5, -0.12, false));
  });

  it('shares one fetch between concurrent callers and reuses it afterwards', async () => {
    const key = freshKey();
    const fetcher = jest.fn(async () => days(todayStart(), 7));
    const results = await Promise.all(Array.from({ length: 13 }, () => cachedForecast(key, fetcher)));
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.length === 7)).toBe(true);

    await cachedForecast(key, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves another instance from the shared cache after this one forgets', async () => {
    const key = freshKey();
    const fetcher = jest.fn(async () => days(todayStart(), 7));
    await cachedForecast(key, fetcher);
    __resetForecastMemoryCache();
    await cachedForecast(key, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('remembers a failure briefly instead of retrying every request', async () => {
    const key = freshKey();
    const fetcher = jest.fn(async () => [] as ReturnType<typeof days>);
    await cachedForecast(key, fetcher);
    await cachedForecast(key, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches once the success TTL has passed', async () => {
    const key = freshKey();
    const fetcher = jest.fn(async () => days(todayStart(), 7));
    const realNow = Date.now;
    try {
      await cachedForecast(key, fetcher);
      const later = realNow() + (SUCCESS_TTL_S + 60) * 1000;
      Date.now = () => later;
      await cachedForecast(key, fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      Date.now = realNow;
    }
  });

  it('drops yesterday after midnight even when days are stamped at noon', () => {
    const t = todayStart();
    const noon = days(t - DAY + 43_200, 7);
    const kept = dropEndedDays(noon, (t + 600) * 1000);
    expect(kept[0].date).toBe(t + 43_200);
    expect(kept).toHaveLength(6);
  });

  it('drops days that have fully ended so [0] stays today', () => {
    const t = todayStart();
    const kept = dropEndedDays(days(t - 2 * DAY, 7), (t + 3600) * 1000);
    expect(kept[0].date).toBe(t);
    expect(kept).toHaveLength(5);
  });
});
