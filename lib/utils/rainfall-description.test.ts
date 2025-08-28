import { getRainfallDescriptionWithHourly } from '../../utils/weatherLabels';

describe('getRainfallDescriptionWithHourly', () => {
  // Test case 1: No rain in both daily and hourly
  test('should return "No rain" when there is no rain in both daily and hourly data', () => {
    const result = getRainfallDescriptionWithHourly(0, [
      { time: '2025-08-27T08:00:00Z', rain: 0 },
      { time: '2025-08-27T09:00:00Z', rain: 0 },
      { time: '2025-08-27T10:00:00Z', rain: 0 },
    ]);
    expect(result).toBe('No rain');
  });

  // Test case 2: No daily rain but hourly rain at a specific time
  test('should indicate chance of showers at a specific time when daily is 0 but hourly has light rain', () => {
    const result = getRainfallDescriptionWithHourly(0, [
      { time: '2025-08-27T08:00:00Z', rain: 0 },
      { time: '2025-08-27T09:00:00Z', rain: 0 },
      { time: '2025-08-27T15:00:00Z', rain: 0 },
      { time: '2025-08-27T16:00:00Z', rain: 0 },
      { time: '2025-08-27T17:00:00Z', rain: 0 },
      { time: '2025-08-27T18:00:00Z', rain: 0.5 }, // 6pm
      { time: '2025-08-27T19:00:00Z', rain: 0.8 },
      { time: '2025-08-27T20:00:00Z', rain: 0 },
    ]);
    // Time-specific part will vary by timezone, just check the prefix
    expect(result).toContain('Mostly dry, chance of showers around');
  });

  // Test case 3: No daily rain but significant hourly rain
  test('should indicate chance of rain at a specific time when daily is 0 but hourly has moderate rain', () => {
    const result = getRainfallDescriptionWithHourly(0, [
      { time: '2025-08-27T08:00:00Z', rain: 0 },
      { time: '2025-08-27T09:00:00Z', rain: 0 },
      { time: '2025-08-27T15:00:00Z', rain: 0 },
      { time: '2025-08-27T16:00:00Z', rain: 0 },
      { time: '2025-08-27T17:00:00Z', rain: 0 },
      { time: '2025-08-27T18:00:00Z', rain: 3 }, // 6pm
      { time: '2025-08-27T19:00:00Z', rain: 4 },
      { time: '2025-08-27T20:00:00Z', rain: 0 },
    ]);
    // Time-specific part will vary by timezone, just check the prefix
    expect(result).toContain('Mostly dry, chance of rain around');
  });

  // Test case 4: Significant daily rain
  test('should use regular description when daily rain is significant', () => {
    const result = getRainfallDescriptionWithHourly(12, [
      { time: '2025-08-27T08:00:00Z', rain: 1 },
      { time: '2025-08-27T09:00:00Z', rain: 2 },
      { time: '2025-08-27T15:00:00Z', rain: 3 },
      { time: '2025-08-27T16:00:00Z', rain: 4 },
      { time: '2025-08-27T17:00:00Z', rain: 2 },
    ]);
    expect(result).toBe('Heavy rain');
  });

  // Test case 5: Different hourly data format (with dt instead of time)
  test('should handle different hourly data format with dt and precipitation', () => {
    const result = getRainfallDescriptionWithHourly(0, [
      { dt: 1755900000, precipitation: 0 },  // Some time in 2025
      { dt: 1755903600, precipitation: 0 },
      { dt: 1755907200, precipitation: 0 },
      { dt: 1755910800, precipitation: 0.2 },
      { dt: 1755914400, precipitation: 0.3 },
    ]);
    // Format will vary, just check it's handling the data
    expect(result).toContain('Mostly dry, chance of light showers around');
  });

  // Test case 6: No hourly data available
  test('should fall back to simple description when no hourly data is provided', () => {
    const result = getRainfallDescriptionWithHourly(0);
    expect(result).toBe('No rain');
  });
});
