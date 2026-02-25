import { evaluateThreatRule } from '../../../lib/grow/threats/ruleEngine';
import type { ThreatSignalContext } from '../../../lib/grow/threats/types';

function makeCtx(overrides: Partial<ThreatSignalContext> = {}): ThreatSignalContext {
  return {
    now: new Date(2026, 5, 15), // June 15
    month: 6,
    weather: {
      rain_72h_mm: 20,
      rh_hours_24h_over_90: 4,
      temp_avg_24h_c: 18,
    },
    ...overrides,
  };
}

describe('evaluateThreatRule', () => {
  describe('invalid rules', () => {
    it('returns no match for null', () => {
      const result = evaluateThreatRule(null, makeCtx());
      expect(result.matched).toBe(false);
      expect(result.score).toBe(0);
      expect(result.band).toBe('none');
    });

    it('returns no match for wrong version', () => {
      const rule = { version: 2, conditions: [], score: 3 };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(false);
    });

    it('returns no match for missing conditions', () => {
      const rule = { version: 1, score: 3 };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(false);
    });

    it('returns no match for missing score', () => {
      const rule = { version: 1, conditions: [{ signal: 'month', op: 'eq', value: 6 }] };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(false);
    });
  });

  describe('>= operator', () => {
    it('matches when signal >= value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'rain_72h_mm', op: '>=', value: 20 }],
        score: 3,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(true);
      expect(result.score).toBe(3);
    });

    it('does not match when signal < value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'rain_72h_mm', op: '>=', value: 50 }],
        score: 3,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(false);
    });
  });

  describe('> operator', () => {
    it('matches when signal > value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'rain_72h_mm', op: '>', value: 19 }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('does not match when signal equals value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'rain_72h_mm', op: '>', value: 20 }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });
  });

  describe('<= operator', () => {
    it('matches when signal <= value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: '<=', value: 18 }],
        score: 2,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });
  });

  describe('< operator', () => {
    it('matches when signal < value', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: '<', value: 20 }],
        score: 2,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });
  });

  describe('eq operator', () => {
    it('matches on exact equality', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 4,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('does not match on inequality', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 7 }],
        score: 4,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });
  });

  describe('between operator', () => {
    it('matches when value is in range (inclusive)', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: 'between', value: [15, 25] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('matches on boundary', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: 'between', value: [18, 25] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('does not match outside range', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: 'between', value: [20, 30] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });

    it('returns false for invalid between operand', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: 'between', value: [15] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });
  });

  describe('in operator', () => {
    it('matches when value is in array', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'in', value: [5, 6, 7] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('does not match when value is not in array', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'in', value: [1, 2, 3] }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });
  });

  describe('logic modes', () => {
    it('uses "all" (AND) by default', () => {
      const rule = {
        version: 1,
        conditions: [
          { signal: 'month', op: 'eq', value: 6 },
          { signal: 'rain_72h_mm', op: '>=', value: 100 }, // won't match
        ],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(false);
    });

    it('"all" matches when all conditions pass', () => {
      const rule = {
        version: 1,
        logic: 'all',
        conditions: [
          { signal: 'month', op: 'eq', value: 6 },
          { signal: 'rain_72h_mm', op: '>=', value: 10 },
        ],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });

    it('"any" (OR) matches when at least one condition passes', () => {
      const rule = {
        version: 1,
        logic: 'any',
        conditions: [
          { signal: 'month', op: 'eq', value: 12 }, // won't match
          { signal: 'rain_72h_mm', op: '>=', value: 10 }, // will match
        ],
        score: 4,
      };
      expect(evaluateThreatRule(rule, makeCtx()).matched).toBe(true);
    });
  });

  describe('score and band mapping', () => {
    it('maps score 0 to none', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 0,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.matched).toBe(true);
      expect(result.band).toBe('none');
    });

    it('maps score 1 to low', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 1,
      };
      expect(evaluateThreatRule(rule, makeCtx()).band).toBe('low');
    });

    it('maps score 3 to moderate', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 3,
      };
      expect(evaluateThreatRule(rule, makeCtx()).band).toBe('moderate');
    });

    it('maps score 4 to high', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 4,
      };
      expect(evaluateThreatRule(rule, makeCtx()).band).toBe('high');
    });

    it('maps score 5 to severe', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 5,
      };
      expect(evaluateThreatRule(rule, makeCtx()).band).toBe('severe');
    });

    it('clamps score > 5 to 5', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 10,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.score).toBe(5);
      expect(result.band).toBe('severe');
    });
  });

  describe('reasons', () => {
    it('returns reasons on match', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 3,
        reasons: ['High humidity period'],
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.reasons).toEqual(['High humidity period']);
    });

    it('returns empty reasons when not matched', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 12 }],
        score: 3,
        reasons: ['Winter risk'],
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.reasons).toEqual([]);
    });

    it('handles missing reasons array', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 6 }],
        score: 3,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.reasons).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('handles undefined weather signals', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'rain_72h_mm', op: '>=', value: 10 }],
        score: 3,
      };
      const ctx = makeCtx({ weather: undefined });
      expect(evaluateThreatRule(rule, ctx).matched).toBe(false);
    });

    it('handles NaN signal values', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'temp_avg_24h_c', op: '>=', value: 10 }],
        score: 3,
      };
      const ctx = makeCtx({ weather: { temp_avg_24h_c: NaN } });
      expect(evaluateThreatRule(rule, ctx).matched).toBe(false);
    });

    it('returns score 0 when not matched', () => {
      const rule = {
        version: 1,
        conditions: [{ signal: 'month', op: 'eq', value: 12 }],
        score: 5,
      };
      const result = evaluateThreatRule(rule, makeCtx());
      expect(result.score).toBe(0);
      expect(result.band).toBe('none');
    });
  });
});
