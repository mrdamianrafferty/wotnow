/**
 * And the other half of it: you cannot play cricket at nine at night.
 *
 * Fixing the stargazing case raised the mirror question, and the answer was
 * worse. The evening bucket is 18:00 to midnight; in Sheffield on 12 December
 * the sun sets at about 15:50, so all six hours of it are dark. Measured before
 * this existed, football scored **prime/81 in that bucket — the identical score
 * to ten in the morning**, and cricket, birdwatching and a picnic did the same.
 * The call would happily have said "Best in the evening" for any of them.
 *
 * `computeEveningLightMultiplier` had known how to handle this since it was
 * written. It was never asked: it keys off the current hour, and `scoreParts`
 * scores all three parts against one `now`, so for a call built in the morning
 * its `hour` was 9 for the evening bucket too. It also had nothing to read —
 * of 81 outdoor activities exactly one carried a light tag, and none were
 * marked floodlit.
 *
 * Night is sunset to sunrise. No twilight allowance: half an hour of afterglow
 * is not an evening's cricket, and a rule with no edge cases stays right.
 */

import { partBands, bestWindow } from '@/lib/godaisy/call/window';
import { allSports } from '@/data/activities';
import type { WeatherData } from '@/utils/getSuggestionsByDay';

const ACTIVITIES = allSports as never;
const SHEFFIELD = { lat: 53.383, lon: -1.4659 };

/** Nothing in the weather to argue about, so only the light is in play. */
const MILD: WeatherData = {
  temperature: 12, precipitation: 0, precipitationHours: 0,
  windspeed: 8, windspeedMax: 11, gustspeed: 15,
  clouds: 20, humidity: 70, visibility: 20000,
};
const ALL_DAY = { morning: MILD, afternoon: MILD, evening: MILD };

/** Sunset about 15:50 — the whole evening bucket is dark. */
const DECEMBER = Math.floor(Date.parse('2026-12-12T12:00:00Z') / 1000);
/** Sunset about 21:40 — the evening bucket is not. */
const JUNE = Math.floor(Date.parse('2026-06-12T12:00:00Z') / 1000);
const NOW = new Date('2026-12-12T09:00:00Z');

const bars = (id: string, date: number) =>
  Object.fromEntries(
    partBands(id, ALL_DAY, date, ACTIVITIES, NOW, SHEFFIELD).map((b) => [b.name, b.score]),
  ) as Record<string, number>;

describe('a dark evening', () => {
  it('costs a daylight activity most of its score', () => {
    const b = bars('cricket', DECEMBER);

    expect(b.evening).toBeLessThan(b.afternoon);
    expect(b.evening / b.afternoon).toBeCloseTo(0.4, 1);
  });

  it('costs a floodlit one nothing', () => {
    const b = bars('football_soccer', DECEMBER);

    expect(b.evening).toBe(b.afternoon);
  });

  it('costs a running or fishing evening something, but not everything', () => {
    for (const id of ['running', 'sea_fishing_shore']) {
      const b = bars(id, DECEMBER);
      expect(b.evening).toBeLessThan(b.afternoon);
      expect(b.evening / b.afternoon).toBeCloseTo(0.7, 1);
    }
  });

  it('leaves the morning and the afternoon alone', () => {
    const b = bars('cricket', DECEMBER);

    expect(b.morning).toBe(b.afternoon);
  });
});

describe('a light evening', () => {
  it('costs nothing at all in June, when the sun is still up at eight', () => {
    for (const id of ['cricket', 'birdwatching', 'picnicking', 'running']) {
      const b = bars(id, JUNE);
      expect(b.evening).toBe(b.afternoon);
    }
  });
});

describe('the things the evening is for', () => {
  /*
   * Damping alone only ever says what a part is not. An app that offers you
   * bowling at nine in the morning has misread the day exactly as badly as one
   * offering cricket at nine at night, so these are shaped across the day
   * rather than levelled.
   */
  it('names the evening as the window, in any season', () => {
    for (const date of [DECEMBER, JUNE]) {
      for (const id of ['going_to_pub', 'cinema', 'bowling', 'dance']) {
        const w = bestWindow(id, ALL_DAY, date, ACTIVITIES, NOW, SHEFFIELD);
        expect(w?.parts).toEqual(['evening']);
      }
    }
  });

  it('is not troubled by the dark — a gig in December is a gig', () => {
    const b = bars('outdoor_music', DECEMBER);

    expect(b.evening).toBeGreaterThan(b.afternoon);
  });

  it('does not let a part outscore what a day can reach', () => {
    // The lift is a multiplier and the scorer's own ceiling is 100; a bar
    // reading 114 would be the drawer inventing a band the day cannot have.
    for (const id of ['going_to_pub', 'cinema', 'bowling', 'dance', 'outdoor_music']) {
      for (const s of Object.values(bars(id, JUNE))) expect(s).toBeLessThanOrEqual(100);
    }
  });
});

describe('the outdoor gym and the playground', () => {
  // Both were briefly listed as floodlit. Some are; most are a bit of kit in a
  // park, and the app should not send somebody to a dark one.
  it('need the daylight, like the rest of the park', () => {
    for (const id of ['outdoor_gym', 'outdoor_playground']) {
      expect(bars(id, DECEMBER).evening).toBeLessThan(bars(id, DECEMBER).afternoon);
      expect(bars(id, JUNE).evening).toBe(bars(id, JUNE).afternoon);
    }
  });
});

describe('without a position', () => {
  it('damps nothing, rather than guessing at the season', () => {
    // `/api/call/share` and the spot pages both pass coordinates; a caller that
    // cannot should get the old behaviour rather than a hemisphere-flipped one.
    const undamped = partBands('cricket', ALL_DAY, DECEMBER, ACTIVITIES, NOW);

    const scores = undamped.map((b) => b.score);
    expect(new Set(scores).size).toBe(1);
  });
});
