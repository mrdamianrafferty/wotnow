import { buildReasons, type DayLike } from '../utils/activityHelpers';

// Minimal shape for the part of DayLike we care about in these tests
interface TestDay extends Partial<DayLike> {
  airQuality?: { overall?: number };
}

describe('Air quality integration in buildReasons', () => {
  test('adds a moderate air quality advisory for outdoor activities', () => {
    const day: TestDay = {
      airQuality: { overall: 80 }, // MODERATE (<= 100)
    };

    const reasons = buildReasons(day as DayLike, 'running');

    expect(Array.isArray(reasons)).toBe(true);
    const hasModerateAQ = reasons.some(r => /air quality is moderate/i.test(r));
    expect(hasModerateAQ).toBe(true);
  });

  test('adds strong advice and warning when air quality is unhealthy', () => {
    const day: TestDay = {
      airQuality: { overall: 170 }, // UNHEALTHY (151..200)
    };

    const reasons = buildReasons(day as DayLike, 'running');

    // Expect an "unhealthy" advisory and either mask/indoor guidance or general health warning
    const hasUnhealthy = reasons.some(r => /air quality is (very )?unhealthy/i.test(r));
    const hasMaskOrHealth = reasons.some(r => /mask|indoor activities|health (effects|alert|emergency)/i.test(r));

    expect(hasUnhealthy).toBe(true);
    expect(hasMaskOrHealth).toBe(true);
  });

  test('does not add air quality reasons for excluded activity types (e.g. snorkeling)', () => {
    const day: TestDay = {
      airQuality: { overall: 170 }, // would normally trigger warnings
    };

    const reasons = buildReasons(day as DayLike, 'snorkeling');

    const hasAQ = reasons.some(r => /air quality/i.test(r));
    expect(hasAQ).toBe(false);
  });
});
