import {
  formatTemperature,
  formatWindSpeed,
  formatVisibility,
  formatPressure,
} from '../../lib/grow/units';

describe('formatTemperature', () => {
  it('returns placeholder for null', () => {
    expect(formatTemperature(null)).toBe('—');
  });

  it('returns placeholder for undefined', () => {
    expect(formatTemperature(undefined)).toBe('—');
  });

  it('returns placeholder for NaN', () => {
    expect(formatTemperature(NaN)).toBe('—');
  });

  it('formats metric by default', () => {
    expect(formatTemperature(20)).toBe('20 °C');
  });

  it('formats metric explicitly', () => {
    expect(formatTemperature(15, 'metric')).toBe('15 °C');
  });

  it('converts to imperial', () => {
    // 0°C = 32°F
    expect(formatTemperature(0, 'imperial')).toBe('32 °F');
    // 100°C = 212°F
    expect(formatTemperature(100, 'imperial')).toBe('212 °F');
  });

  it('rounds to nearest integer', () => {
    expect(formatTemperature(20.7, 'metric')).toBe('21 °C');
    expect(formatTemperature(20.3, 'metric')).toBe('20 °C');
  });

  it('omits unit when includeUnit=false', () => {
    expect(formatTemperature(20, 'metric', false)).toBe('20');
    expect(formatTemperature(0, 'imperial', false)).toBe('32');
  });

  it('handles negative temperatures', () => {
    expect(formatTemperature(-5, 'metric')).toBe('-5 °C');
  });

  it('handles zero', () => {
    expect(formatTemperature(0, 'metric')).toBe('0 °C');
  });
});

describe('formatWindSpeed', () => {
  it('returns placeholder for null/undefined/NaN', () => {
    expect(formatWindSpeed(null)).toBe('—');
    expect(formatWindSpeed(undefined)).toBe('—');
    expect(formatWindSpeed(NaN)).toBe('—');
  });

  it('formats metric km/h', () => {
    expect(formatWindSpeed(20)).toBe('20 km/h');
  });

  it('converts to mph', () => {
    // 16.0934 km/h = 10 mph
    expect(formatWindSpeed(16.0934, 'imperial')).toBe('10 mph');
  });

  it('omits unit when includeUnit=false', () => {
    expect(formatWindSpeed(20, 'metric', false)).toBe('20');
  });
});

describe('formatVisibility', () => {
  it('returns placeholder for null/undefined/NaN', () => {
    expect(formatVisibility(null)).toBe('—');
    expect(formatVisibility(undefined)).toBe('—');
    expect(formatVisibility(NaN)).toBe('—');
  });

  it('formats metric km with 1 decimal when < 10', () => {
    expect(formatVisibility(5.5)).toBe('5.5 km');
  });

  it('formats metric km without decimal when >= 10', () => {
    expect(formatVisibility(15)).toBe('15 km');
  });

  it('converts to miles', () => {
    // 1.60934 km = 1 mile
    expect(formatVisibility(1.60934, 'imperial')).toBe('1.0 mi');
  });

  it('omits unit when includeUnit=false', () => {
    expect(formatVisibility(5.5, 'metric', false)).toBe('5.5');
  });
});

describe('formatPressure', () => {
  it('returns placeholder for null/undefined/NaN', () => {
    expect(formatPressure(null)).toBe('—');
    expect(formatPressure(undefined)).toBe('—');
    expect(formatPressure(NaN)).toBe('—');
  });

  it('formats metric hPa (integer)', () => {
    expect(formatPressure(1013)).toBe('1013 hPa');
  });

  it('converts to inHg with 2 decimals', () => {
    // 1013 hPa * 0.02953 ≈ 29.92
    expect(formatPressure(1013, 'imperial')).toBe('29.91 inHg');
  });

  it('omits unit when includeUnit=false', () => {
    expect(formatPressure(1013, 'metric', false)).toBe('1013');
  });
});
