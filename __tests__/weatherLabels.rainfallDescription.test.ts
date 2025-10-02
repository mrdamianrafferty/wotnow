import { getRainfallDescription, getRainfallDescriptionWithHourly } from '../utils/weatherLabels';

describe('Rainfall description', () => {
  test('drizzle is not no rain', () => {
    expect(getRainfallDescription(0.05, 1)).toBe('Drizzle');
  });

  test('hourly drizzle yields mostly dry light showers', () => {
    const desc = getRainfallDescriptionWithHourly(1.0, [
      { time: '2025-09-21T10:00:00Z', rain: { '1h': 0.2 } },
      { time: '2025-09-21T11:00:00Z', rain: { '1h': 0.0 } },
    ]);
    expect(desc.toLowerCase()).toContain('mostly dry');
  });
});
