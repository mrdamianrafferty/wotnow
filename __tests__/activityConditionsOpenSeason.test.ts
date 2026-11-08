/**
 * `openSeason`: a venue that runs an activity all year is scored without the
 * model's season cap.
 *
 * Rutland and Alton hire kayaks, boats and boards Thursday to Monday through
 * the winter. The models' seasons end in October, and since September every
 * day outside them is capped at 35 and told "Out of season for it, whatever
 * the weather does" — so a calm November Saturday at a water that is open
 * read the same as a gale. These pin both halves: the cap still applies by
 * default, and lifts only for the activities a caller names.
 */
jest.mock('../lib/weather/openMeteoOneCallAdapter', () => ({
  fetchOpenMeteoAsOneCallShape: jest.fn(),
}));
jest.mock('../lib/seo/forecastCache', () => ({
  ...jest.requireActual('../lib/seo/forecastCache'),
  cachedForecast: (_key: string, fetcher: () => Promise<unknown[]>) => fetcher(),
}));
import { fetchOpenMeteoAsOneCallShape } from '../lib/weather/openMeteoOneCallAdapter';
import handler from '../pages/api/godaisy/activity-conditions';

/** A calm, dry, mild November week. */
function novemberWeek() {
  const day = (i: number) => ({
    dt: Math.floor(Date.UTC(2026, 10, 12 + i, 12) / 1000),
    temp: { day: 12, min: 8, max: 14 },
    rain: 0, precipitation_hours: 0,
    wind_speed: 3, wind_speed_mean: 2.5, wind_gust: 5, wind_deg: 240, // m/s, as the adapter emits
    visibility: 24000, soil_moisture: 28, clouds: 40, humidity: 70,
  });
  return { daily: Array.from({ length: 7 }, (_, i) => day(i)), hourly: [] };
}

function invoke(query: Record<string, string>) {
  return new Promise<{ statusCode: number; body: any }>((resolve) => {
    const res: any = {
      statusCode: 200,
      setHeader() { return res; },
      status(code: number) { res.statusCode = code; return res; },
      json(body: unknown) { resolve({ statusCode: res.statusCode, body }); return res; },
      end() { resolve({ statusCode: res.statusCode, body: null }); return res; },
    };
    const req: any = {
      method: 'GET',
      headers: { origin: 'https://example.test' },
      query: { lat: '52.65', lon: '-0.63', ...query },
    };
    void handler(req, res);
  });
}

describe('activity-conditions openSeason', () => {
  beforeEach(() => {
    (fetchOpenMeteoAsOneCallShape as jest.Mock).mockReset();
    (fetchOpenMeteoAsOneCallShape as jest.Mock).mockResolvedValue(novemberWeek());
  });

  it('caps an out-of-season activity by default', async () => {
    const r = await invoke({ activities: 'kayaking' });
    expect(r.statusCode).toBe(200);
    const k = r.body.activities[0];
    expect(k.seasonOpen).toBeUndefined();
    expect(Math.max(...k.days.map((d: any) => d.score))).toBeLessThanOrEqual(35);
  });

  it('scores the real weather for an activity named in openSeason', async () => {
    const r = await invoke({ activities: 'kayaking,birdwatching', openSeason: 'kayaking' });
    expect(r.statusCode).toBe(200);
    const k = r.body.activities.find((a: any) => a.activityId === 'kayaking');
    expect(k.seasonOpen).toBe(true);
    expect(Math.max(...k.days.map((d: any) => d.score))).toBeGreaterThan(35);
    expect(k.days.some((d: any) => /out of season/i.test(d.reasoning ?? ''))).toBe(false);
    const b = r.body.activities.find((a: any) => a.activityId === 'birdwatching');
    expect(b.seasonOpen).toBeUndefined();
  });

  it('refuses an openSeason id that was not requested', async () => {
    const r = await invoke({ activities: 'kayaking', openSeason: 'sailing_inland' });
    expect(r.statusCode).toBe(400);
  });
});
