import { getWindActivityRecommendation } from '../utils/windRecommendations';

describe('windRecommendations', () => {
  /**
   * Re-pinned 2026-09 after the cycling ladder was relaxed.
   *
   * The old numbers (caution 7, unsafe 9, dangerous 13) encoded the risk of a
   * crosswind pushing a rider into traffic. On the traffic-free reservoir
   * circuits this model is asked about, that risk does not exist and a Force 5
   * headwind was scoring 10 out of 100. Wind is now effort and gusts are hazard.
   *
   * These cases are the Beaufort boundaries, which is what the thresholds are
   * actually set to, so the intent survives a future re-cut better than round
   * numbers would.
   */
  describe('road_cycling thresholds', () => {
    test('flat calm -> safe', () => {
      const rec = getWindActivityRecommendation('road_cycling', 0);
      expect(rec.level).toBe('safe');
      expect(rec.safety).toBe('safe');
    });

    test('8 m/s (Force 4) is no longer flagged at all', () => {
      const rec = getWindActivityRecommendation('road_cycling', 8);
      expect(rec.level).toBe('safe');
      expect(rec.safety).toBe('safe');
    });

    test('9 m/s (Force 5) -> caution, a hard lap rather than a hazard', () => {
      const rec = getWindActivityRecommendation('road_cycling', 9);
      expect(rec.level).toBe('caution');
      expect(rec.safety).toBe('manageable');
    });

    test('13 m/s (Force 6) -> difficult', () => {
      const rec = getWindActivityRecommendation('road_cycling', 13);
      expect(rec.level).toBe('difficult');
      expect(rec.safety).toBe('challenging');
    });

    test('17 m/s (Force 7) -> unsafe', () => {
      const rec = getWindActivityRecommendation('road_cycling', 17);
      expect(rec.level).toBe('unsafe');
      expect(rec.safety).toBe('unsafe');
    });
  });

  /**
   * The reservoir ladder the whole re-cut hangs on: Force 5 is for experienced
   * hands and Force 6 is a hard stop, for sailing and windsurfing alike.
   *
   * Force 5 begins at 29 km/h (8.05 m/s) and Force 6 at 39 km/h (10.83 m/s).
   * These pin both sides of that boundary because the engine used to read
   * "Good weather" at Force 6 on a water whose keeper had already taken the
   * boats off.
   */
  describe('inland sailing and windsurfing stop at Force 6', () => {
    for (const id of ['sailing_inland', 'windsurfing_inland']) {
      test(`${id}: Force 4 (7 m/s) is the good sailing`, () => {
        expect(getWindActivityRecommendation(id, 7).safety).toBe('safe');
      });

      test(`${id}: Force 5 (9 m/s) is not unsafe, but is not "optimal" either`, () => {
        const rec = getWindActivityRecommendation(id, 9);
        expect(rec.level).not.toBe('optimal');
        expect(rec.safety).not.toBe('unsafe');
      });

      test(`${id}: Force 6 (11 m/s) is unsafe`, () => {
        expect(getWindActivityRecommendation(id, 11).safety).toBe('unsafe');
      });

      test(`${id}: Force 8 (19 m/s) is dangerous`, () => {
        expect(getWindActivityRecommendation(id, 19).level).toBe('dangerous');
      });
    }
  });

  /**
   * Messages carry Force and knots, never a raw m/s float.
   *
   * The engine printed "6.944444444444445 m/s (25 km/h)" onto public pages.
   */
  describe('message wording', () => {
    test('no unrounded floats reach the reader', () => {
      const rec = getWindActivityRecommendation('sailing_inland', 25 / 3.6);
      expect(rec.message).not.toMatch(/\d\.\d{3}/);
    });

    test('wind is quoted as Force and knots', () => {
      const rec = getWindActivityRecommendation('kayaking', 12);
      expect(rec.message).toMatch(/Force \d/);
      expect(rec.message).toMatch(/knots?/);
      expect(rec.message).not.toMatch(/m\/s/);
    });

    test('a severity is explained rather than restated', () => {
      const rec = getWindActivityRecommendation('kayaking', 12);
      expect(rec.message.toLowerCase()).not.toContain('creates');
      expect(rec.message.toLowerCase()).not.toContain('conditions');
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
