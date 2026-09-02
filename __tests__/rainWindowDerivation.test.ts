/**
 * Which six hours the rain fell in, derived from the hourly series.
 *
 * Tested at the adapter rather than only through the copy, because a wrong
 * window is invisible downstream: "showers in the morning" reads perfectly
 * well on a day it rained all afternoon, and the only thing that would catch
 * it is somebody getting wet.
 *
 * The 60% share is the load-bearing number. Below it the rain genuinely is
 * spread, and naming a window then is worse than the two figures it replaced.
 */
jest.mock('../lib/weather/fetchWithRetry', () => ({ fetchWithRetry: jest.fn() }), { virtual: true });

import { fetchOpenMeteoAsOneCallShape } from '../lib/weather/openMeteoOneCallAdapter';

/** A day of hourly precipitation, as Open-Meteo publishes it. */
function hours(date: string, perHour: number[], rainPerHour = perHour) {
  return {
    time: perHour.map((_, h) => `${date}T${String(h).padStart(2, '0')}:00`),
    precipitation: perHour,
    rain: rainPerHour,
    temperature_2m: perHour.map(() => 17),
    visibility: perHour.map(() => 20000),
    soil_moisture_0_to_7cm: perHour.map(() => 0.3),
  };
}

function payload(date: string, perHour: number[], rainPerHour = perHour) {
  return {
    daily: {
      time: [date],
      weather_code: [61], temperature_2m_min: [13], temperature_2m_max: [19],
      precipitation_sum: [perHour.reduce((a, b) => a + b, 0)],
      precipitation_hours: [perHour.filter((v) => v > 0).length],
      wind_speed_10m_max: [20], wind_speed_10m_mean: [14], wind_gusts_10m_max: [28],
      wind_direction_10m_dominant: [250],
    },
    hourly: hours(date, perHour, rainPerHour),
    current: {},
  };
}

const flat = (n: number, v: number) => Array.from({ length: n }, () => v);
/** 24 hours with `mm` placed only in [from, to). */
function only(from: number, to: number, mm: number) {
  return flat(24, 0).map((_, h) => (h >= from && h < to ? mm : 0));
}

async function windowFor(perHour: number[], rainPerHour = perHour): Promise<string | undefined> {
  const g = global as unknown as { fetch: jest.Mock };
  g.fetch = jest.fn().mockResolvedValue({
    ok: true, status: 200, json: async () => payload('2026-07-15', perHour, rainPerHour),
  });
  const shape = await fetchOpenMeteoAsOneCallShape(52.65, -0.63) as { daily: { rain_window?: string }[] };
  return shape.daily?.[0]?.rain_window;
}

describe('the rain window is derived from the hour it actually rained', () => {
  it('names a window that holds enough of the day', async () => {
    expect(await windowFor(only(6, 12, 2))).toBe('morning');
    expect(await windowFor(only(12, 18, 2))).toBe('afternoon');
    expect(await windowFor(only(18, 24, 2))).toBe('evening');
    expect(await windowFor(only(0, 6, 2))).toBe('overnight');
  });

  it('calls it spread when no window holds 60% of it', async () => {
    /* Even quarters: nothing to name, and naming one would be a guess. */
    const even = flat(24, 0).map((_, h) => (h % 6 === 0 ? 1 : 0));
    expect(await windowFor(even)).toBe('spread');
  });

  it('is undefined on a dry day rather than guessing at midnight', async () => {
    expect(await windowFor(flat(24, 0))).toBeUndefined();
  });

  it('reads the real shape: mostly morning with a tail is still morning', async () => {
    /* 4 September at Rutland — 11 mm before noon, 1.1 mm overnight. */
    const real = flat(24, 0);
    for (let h = 0; h < 6; h += 1) real[h] = 1.1 / 6;
    for (let h = 6; h < 12; h += 1) real[h] = 11 / 6;
    expect(await windowFor(real)).toBe('morning');
  });

  it('reads the RAIN series, not precipitation, so snow cannot name the window', () => {
    /* A winter day: snow all morning, a little real rain in the evening. The
       daily figure this sentence quotes is `rain_sum`, so a window derived
       from `precipitation` would have described the snowfall — and the copy
       would have offered "showers in the morning" of a morning it snowed. */
    const precipitation = flat(24, 0);
    const rain = flat(24, 0);
    for (let h = 6; h < 12; h += 1) precipitation[h] = 2;      // snow
    for (let h = 18; h < 24; h += 1) { precipitation[h] = 1; rain[h] = 1; }
    return expect(windowFor(precipitation, rain)).resolves.toBe('evening');
  });

  it('falls back to precipitation where no rain series is published', async () => {
    /* Not every source carries both. Absent `rain`, precipitation is the best
       answer available rather than the wrong one. */
    const g = global as unknown as { fetch: jest.Mock };
    const perHour = only(12, 18, 2);
    g.fetch = jest.fn().mockResolvedValue({
      ok: true, status: 200,
      json: async () => {
        const p = payload('2026-07-15', perHour);
        delete (p.hourly as Record<string, unknown>).rain;
        return p;
      },
    });
    const shape = await fetchOpenMeteoAsOneCallShape(52.65, -0.63) as { daily: { rain_window?: string }[] };
    expect(shape.daily?.[0]?.rain_window).toBe('afternoon');
  });
});
