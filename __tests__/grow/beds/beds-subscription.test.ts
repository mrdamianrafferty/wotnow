import { getTierLimits, isOverLimit, type GrowSubscriptionTier } from '../../../lib/grow/subscription';

describe('Garden bed limits per tier', () => {
  it('seed tier has maxBeds = 2', () => {
    expect(getTierLimits('seed').maxBeds).toBe(2);
  });

  it('sprout tier has unlimited beds (-1)', () => {
    expect(getTierLimits('sprout').maxBeds).toBe(-1);
  });

  it('bloom tier has unlimited beds (-1)', () => {
    expect(getTierLimits('bloom').maxBeds).toBe(-1);
  });

  it('harvest tier has unlimited beds (-1)', () => {
    expect(getTierLimits('harvest').maxBeds).toBe(-1);
  });

  it('orchard tier has unlimited beds (-1)', () => {
    expect(getTierLimits('orchard').maxBeds).toBe(-1);
  });
});

describe('isOverLimit for beds', () => {
  it('seed tier is over limit at 2 beds', () => {
    expect(isOverLimit('seed', 'maxBeds', 2)).toBe(true);
  });

  it('seed tier is not over limit at 1 bed', () => {
    expect(isOverLimit('seed', 'maxBeds', 1)).toBe(false);
  });

  it('seed tier is not over limit at 0 beds', () => {
    expect(isOverLimit('seed', 'maxBeds', 0)).toBe(false);
  });

  it('sprout tier is never over limit (unlimited)', () => {
    expect(isOverLimit('sprout', 'maxBeds', 0)).toBe(false);
    expect(isOverLimit('sprout', 'maxBeds', 100)).toBe(false);
    expect(isOverLimit('sprout', 'maxBeds', 999)).toBe(false);
  });

  it('bloom tier is never over limit (unlimited)', () => {
    expect(isOverLimit('bloom', 'maxBeds', 500)).toBe(false);
  });

  it('harvest tier is never over limit (unlimited)', () => {
    expect(isOverLimit('harvest', 'maxBeds', 1000)).toBe(false);
  });

  it('orchard tier is never over limit (unlimited)', () => {
    expect(isOverLimit('orchard', 'maxBeds', 9999)).toBe(false);
  });
});

describe('all paid tiers have unlimited beds', () => {
  const paidTiers: GrowSubscriptionTier[] = ['sprout', 'bloom', 'harvest', 'orchard'];

  paidTiers.forEach(tier => {
    it(`${tier} tier: maxBeds is -1 (unlimited)`, () => {
      const limits = getTierLimits(tier);
      expect(limits.maxBeds).toBe(-1);
    });

    it(`${tier} tier: isOverLimit returns false for any count`, () => {
      expect(isOverLimit(tier, 'maxBeds', 10000)).toBe(false);
    });
  });
});
