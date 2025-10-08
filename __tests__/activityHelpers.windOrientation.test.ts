import { buildReasons } from '../utils/activityHelpers';
import type { DayLike } from '../utils/activityHelpers';

describe('buildReasons wind orientation', () => {
  let logSpy: jest.SpyInstance;

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  it('avoids duplicate orientation descriptors in marine wind messaging', () => {
    const day: DayLike = {
      windSpeed: 5, // m/s
      wind_speed: 5,
      windDirection: 90, // East wind
      wind_direction: 90,
      beachOrientation: 0, // Beach faces north so wind is cross-shore
      temperature: 19,
      rain: 0,
      clouds: 20,
      humidity: 60,
      visibility: 10000,
    };

    const reasons = buildReasons(day, 'surfing');

    expect(reasons.some(reason => reason.includes('(cross-shore)'))).toBe(true);
    expect(reasons.some(reason => reason.includes('(cross-shore) (cross-shore)'))).toBe(false);
  });
});
