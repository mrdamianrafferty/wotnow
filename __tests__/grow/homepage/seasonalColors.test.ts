import { getSeasonalTint } from '../../../lib/grow/seasonalColors';

describe('getSeasonalTint', () => {
  it('returns awakening for February', () => {
    expect(getSeasonalTint(2).label).toBe('Awakening');
    expect(getSeasonalTint(2).iconName).toBe('Sprout');
  });

  it('returns awakening for March', () => {
    expect(getSeasonalTint(3).label).toBe('Awakening');
  });

  it('returns spring for April/May', () => {
    expect(getSeasonalTint(4).label).toBe('Spring');
    expect(getSeasonalTint(5).label).toBe('Spring');
  });

  it('returns midsummer for June', () => {
    expect(getSeasonalTint(6).label).toBe('Midsummer');
  });

  it('returns high summer for July/August', () => {
    expect(getSeasonalTint(7).label).toBe('High Summer');
    expect(getSeasonalTint(8).label).toBe('High Summer');
  });

  it('returns autumn for September/October', () => {
    expect(getSeasonalTint(9).label).toBe('Autumn');
    expect(getSeasonalTint(10).label).toBe('Autumn');
  });

  it('returns winter for November/December/January', () => {
    expect(getSeasonalTint(11).label).toBe('Winter Rest');
    expect(getSeasonalTint(12).label).toBe('Winter Rest');
    expect(getSeasonalTint(1).label).toBe('Winter Rest');
  });

  it('returns complete tint object with all required fields', () => {
    const tint = getSeasonalTint(3);
    expect(tint).toHaveProperty('backgroundColor');
    expect(tint).toHaveProperty('borderColor');
    expect(tint).toHaveProperty('label');
    expect(tint).toHaveProperty('gradient');
    expect(tint).toHaveProperty('accentColor');
    expect(tint).toHaveProperty('iconName');
    expect(tint).toHaveProperty('staggerSpeed');
    expect(tint).toHaveProperty('seasonKey');
  });

  it('has faster stagger in spring than winter', () => {
    const spring = getSeasonalTint(4);
    const winter = getSeasonalTint(12);
    expect(spring.staggerSpeed).toBeLessThan(winter.staggerSpeed);
  });
});
