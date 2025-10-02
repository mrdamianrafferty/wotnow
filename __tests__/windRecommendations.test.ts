import { getWindActivityRecommendation } from '../utils/windRecommendations';

describe('windRecommendations', () => {
  describe('road_cycling thresholds', () => {
    test('0 m/s -> safe', () => {
      const rec = getWindActivityRecommendation('road_cycling', 0);
      expect(rec.level).toBe('safe');
      expect(rec.safety).toBe('safe');
    });

    test('8 m/s -> caution', () => {
      const rec = getWindActivityRecommendation('road_cycling', 8);
      expect(rec.level).toBe('caution');
      expect(rec.safety).toBe('manageable');
    });

    test('9 m/s -> unsafe', () => {
      const rec = getWindActivityRecommendation('road_cycling', 9);
      expect(rec.level).toBe('unsafe');
      expect(rec.safety).toBe('unsafe');
    });

    test('13 m/s -> dangerous', () => {
      const rec = getWindActivityRecommendation('road_cycling', 13);
      expect(rec.level).toBe('dangerous');
      expect(rec.safety).toBe('unsafe');
    });
  });

  describe('sailing wind-required logic', () => {
    test('2 m/s -> min_wind_needed', () => {
      const rec = getWindActivityRecommendation('sailing', 2);
      expect(rec.level).toBe('min_wind_needed');
      expect(rec.safety).toBe('challenging');
    });

    test('5 m/s -> optimal', () => {
      const rec = getWindActivityRecommendation('sailing', 5);
      expect(rec.level).toBe('optimal');
      expect(rec.safety).toBe('safe');
    });

    test('14 m/s -> caution', () => {
      const rec = getWindActivityRecommendation('sailing', 14);
      expect(rec.level).toBe('caution');
      expect(rec.safety).toBe('manageable');
    });

    test('16 m/s -> dangerous', () => {
      const rec = getWindActivityRecommendation('sailing', 16);
      expect(rec.level).toBe('dangerous');
      expect(rec.safety).toBe('unsafe');
    });
  });

  describe('hiking and universal danger', () => {
    test('12 m/s -> caution', () => {
      const rec = getWindActivityRecommendation('hiking', 12);
      expect(rec.level).toBe('caution');
      expect(rec.safety).toBe('manageable');
    });

    test('26 m/s -> dangerous (universal)', () => {
      const rec = getWindActivityRecommendation('hiking', 26);
      expect(rec.level).toBe('dangerous');
      expect(rec.safety).toBe('unsafe');
    });
  });

  describe('indoor activities are irrelevant', () => {
    test('yoga -> irrelevant', () => {
      const rec = getWindActivityRecommendation('yoga', 10);
      expect(rec.level).toBe('irrelevant');
      expect(rec.safety).toBe('safe');
    });
  });
});
