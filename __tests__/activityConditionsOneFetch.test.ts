/**
 * One request, one forecast.
 *
 * The route scored each activity through `getActivityScoreForLocation`, which
 * fetches its own weather — so a ten-activity request made ten upstream calls
 * for the same place at the same moment. The bill was the smaller half of it:
 * ten fetches are ten chances to straddle a forecast run, and every activity in
 * one response is supposed to be describing the same day.
 *
 * This counts the fetches rather than trusting the shape of the code, because
 * the fault it guards against is invisible in the response — ten snapshots of
 * the same calm afternoon look exactly like one.
 */
/* The mock is declared before the handler is imported, and stays there.
   `jest.mock` is hoisted, so the current order happened to work — but the
   thing under test reaches the provider through two modules, and a test whose
   correctness rests on hoisting is one refactor away from making real network
   calls and passing anyway. The repo's other API tests mock first; so does
   this one now. */
jest.mock('../lib/weather/openMeteoOneCallAdapter', () => ({
  fetchOpenMeteoAsOneCallShape: jest.fn(),
}));
import { fetchOpenMeteoAsOneCallShape } from '../lib/weather/openMeteoOneCallAdapter';
import handler from '../pages/api/godaisy/activity-conditions';

const ACTIVITIES = [
  'sailing_inland', 'windsurfing_inland', 'kayaking', 'canoeing',
  'dog_walking', 'birdwatching', 'road_cycling', 'hiking', 'wild_swimming',
];

/** A week of plausible weather, in the shape the Open-Meteo adapter returns. */
function oneCallShape() {
  const day = (i: number) => ({
    dt: Math.floor(Date.UTC(2026, 6, 15 + i) / 1000),
    temp: { day: 18, min: 13, max: 21 },
    rain: 0, precipitation_hours: 0,
    wind_speed: 22, wind_speed_mean: 15, wind_gust: 30, wind_deg: 240,
    visibility: 24000, soil_moisture: 28, clouds: 40, humidity: 65,
  });
  return { daily: Array.from({ length: 7 }, (_, i) => day(i)), hourly: [] };
}

function invoke(activities: string[]) {
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
      query: { lat: '52.65', lon: '-0.63', activities: activities.join(',') },
    };
    void handler(req, res);
  });
}

describe('activity-conditions fetches one forecast per request', () => {
  beforeEach(() => {
    (fetchOpenMeteoAsOneCallShape as jest.Mock).mockReset();
    (fetchOpenMeteoAsOneCallShape as jest.Mock).mockResolvedValue(oneCallShape());
  });

  it('asks the provider once, however many activities are requested', async () => {
    const r = await invoke(ACTIVITIES);
    expect(r.statusCode).toBe(200);
    expect(r.body.activities).toHaveLength(ACTIVITIES.length);
    expect(fetchOpenMeteoAsOneCallShape).toHaveBeenCalledTimes(1);
  });

  it('still asks once for a single activity', async () => {
    await invoke(['hiking']);
    expect(fetchOpenMeteoAsOneCallShape).toHaveBeenCalledTimes(1);
  });

  it('every activity in one response describes the same day', async () => {
    /* The point of the single fetch: nine activities, one snapshot, so the
       dates they report are identical rather than merely similar. */
    const r = await invoke(ACTIVITIES);
    const days = (r.body.activities as any[]).map((a) => a.days.map((d: any) => d.date).join('|'));
    expect(new Set(days).size).toBe(1);
  });
});
