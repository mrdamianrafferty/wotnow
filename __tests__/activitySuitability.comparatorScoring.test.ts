import { calculateConditionMatchScore, calculatePoorConditionPenalty } from '../utils/activitySuitability';

describe('activitySuitability comparator scoring', () => {
  it('does not penalize humidity poor condition when threshold is not met', () => {
    const penalty = calculatePoorConditionPenalty(['humidity>90'], { humidity: 80 });
    expect(penalty).toBe(0);
  });

  it('penalizes humidity poor condition when threshold is exceeded', () => {
    const penalty = calculatePoorConditionPenalty(['humidity>90'], { humidity: 95 });
    expect(penalty).toBeGreaterThanOrEqual(0.99);
  });

  it('returns partial score when greater-than condition is nearly met', () => {
    const score = calculateConditionMatchScore(['visibility>2'], { visibility: 1.8 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });

  it('returns low score when less-than condition is exceeded', () => {
    const score = calculateConditionMatchScore(['windSpeed<8'], { windSpeed: 12 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(0.5);
  });
});
