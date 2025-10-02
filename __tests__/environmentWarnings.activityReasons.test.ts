import { buildReasons, type DayLike } from '../utils/activityHelpers';

// Helpers
const hasReason = (reasons: string[], pattern: RegExp) => reasons.some(r => pattern.test(r));

describe('Environmental warnings in buildReasons', () => {
  test('Reduced visibility is surfaced for low visibility', () => {
    const day: Partial<DayLike> = { visibility: 800 }; // < 1000 m
    const reasons = buildReasons(day as DayLike, 'running');
    expect(Array.isArray(reasons)).toBe(true);
    expect(hasReason(reasons, /Reduced visibility/i)).toBe(true);
  });

  test('Large waves appear at >= 1.5 m for marine activity', () => {
    const day: Partial<DayLike> = { waveHeight: 1.6, wind_speed: 5 };
    const reasons = buildReasons(day as DayLike, 'surfing');
    expect(hasReason(reasons, /Large waves/i)).toBe(true);
  });

  test('Rough seas appears at >= 2.5 m for all marine activities', () => {
    const day: Partial<DayLike> = { waveHeight: 2.6, wind_speed: 5 };
    const reasons1 = buildReasons(day as DayLike, 'surfing');
    const reasons2 = buildReasons(day as DayLike, 'sea_swimming');
    expect(hasReason(reasons1, /Rough seas/i)).toBe(true);
    expect(hasReason(reasons2, /Rough seas/i)).toBe(true);
  });

  test('Mud-sensitive activity gets mud/sodden message at high soil moisture', () => {
    const day: Partial<DayLike> = { soilMoisture: 0.7 };
    const reasons = buildReasons(day as DayLike, 'football_soccer');
    expect(hasReason(reasons, /(Muddy|Very muddy|waterlogged)/i)).toBe(true);
  });
});
