import { assessSoilCondition, getMudMessage, isMudSensitive } from '../utils/soilMoistureUtils';

describe('soilMoistureUtils', () => {
  test('assessSoilCondition thresholds', () => {
    expect(assessSoilCondition(0.05).level).toBe('dry');
    expect(assessSoilCondition(0.2).level).toBe('optimal');
    expect(assessSoilCondition(0.35).level).toBe('damp');
    expect(assessSoilCondition(0.5).level).toBe('muddy');
    expect(assessSoilCondition(0.7).level).toBe('sodden');

    // percentage inputs
    expect(assessSoilCondition(5).level).toBe('dry');
    expect(assessSoilCondition(25).level).toBe('optimal');
  });

  test('getMudMessage returns null for dry/optimal', () => {
    const dry = assessSoilCondition(0.1);
    const optimal = assessSoilCondition(0.2);
    expect(getMudMessage('hiking', dry)).toBeNull();
    expect(getMudMessage('hiking', optimal)).toBeNull();
  });

  test('getMudMessage returns activity-specific messages', () => {
    const muddy = assessSoilCondition(0.5);
    const msgHike = getMudMessage('hiking', muddy);
    const msgDefault = getMudMessage('unknown_activity', muddy);
    expect(msgHike).toContain('Muddy');
    expect(msgDefault).toContain('Muddy');
  });

  test('isMudSensitive helper', () => {
    expect(isMudSensitive('trail_running')).toBe(true);
    expect(isMudSensitive('tennis')).toBe(false);
  });
});
