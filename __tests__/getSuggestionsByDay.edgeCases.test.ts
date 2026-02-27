import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import type { ActivityType } from '../data/activities/types';

describe('getSuggestionsByDay - Edge Cases & Uncovered Paths', () => {
  const now = new Date('2025-09-25T09:00:00Z');
  let randomSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    // Mock Math.random to make tests deterministic
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterAll(() => {
    randomSpy.mockRestore();
  });

  beforeEach(() => {
    console.log = jest.fn(); // Suppress console logs
  });

  describe('Indoor Activities (weatherSensitive: false)', () => {
    it('should score indoor activities with evening bonus', () => {
      const indoorActivity: ActivityType = {
        id: 'movie_night',
        name: 'Movie Night',
        category: 'Indoor',
        weatherSensitive: false,
        tags: ['indoor', 'evening'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      // Evening time: 7 PM
      const eveningTime = new Date('2025-09-25T19:00:00Z');

      const forecast = [
        {
          date: eveningTime.getTime(),
          weather: {
            temperature: 20,
            precipitation: 10, // Heavy rain outside shouldn't affect indoor
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [indoorActivity],
        interests: [],
        now: eveningTime,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].activityId).toBe('movie_night');
      // Indoor base score is 45, evening bonus should boost it
      expect(suggestions[0].score).toBeGreaterThan(45);
    });

    it('should give low score to indoor activities during daytime', () => {
      const indoorActivity: ActivityType = {
        id: 'board_games',
        name: 'Board Games',
        category: 'Indoor',
        weatherSensitive: false,
        tags: ['indoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(), // 9 AM
          weather: {
            temperature: 22,
            precipitation: 0,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [indoorActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Weather-reactive indoor scoring: gorgeous day (22°C, no rain, clear) gets mild deprioritisation (65 - 10 = 55)
      expect(suggestions[0].score).toBeLessThanOrEqual(65);
      expect(suggestions[0].score).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Perfect Conditions with Rain (Non-Water Activities)', () => {
    it('should NOT upgrade to perfect when there is rain for non-water activities', () => {
      const hikingActivity: ActivityType = {
        id: 'hiking',
        name: 'Hiking',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25', 'clouds<30'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 20, // Perfect temp
            clouds: 20, // Perfect clouds
            precipitation: 2, // Rain present
            windspeed: 5,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [hikingActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should not be marked as 'perfect' due to rain
      expect(suggestions[0].evaluation).not.toBe('perfect');
    });

    it('should allow better ratings for water activities with rain vs non-water', () => {
      const kayakingActivity: ActivityType = {
        id: 'kayaking',
        name: 'Kayaking',
        category: 'Watersports', // Must include 'water' in category
        weatherSensitive: true,
        tags: ['water', 'watersports'],
        perfectConditions: ['temp:18-28', 'wind<15'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const hikingActivity: ActivityType = {
        id: 'hiking',
        name: 'Hiking',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:18-28', 'wind<15'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 22, // Perfect temp
            windspeed: 10, // Light wind
            precipitation: 2, // Rain
            waterTemperature: 20,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [kayakingActivity, hikingActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(2);
      // Water activity should score at least as well as non-water activity in rain
      const kayakingSuggestion = suggestions.find(s => s.activityId === 'kayaking');
      const hikingSuggestion = suggestions.find(s => s.activityId === 'hiking');
      expect(kayakingSuggestion?.score).toBeGreaterThanOrEqual(hikingSuggestion!.score);
    });

    it('should not allow perfect when poor condition penalty is too high', () => {
      const cyclingActivity: ActivityType = {
        id: 'cycling',
        name: 'Cycling',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:10-25', 'wind<20'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: ['wind>40'], // High wind penalty
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 18, // Perfect
            windspeed: 45, // Too windy - triggers poor condition
            precipitation: 0,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [cyclingActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should be downgraded from perfect due to high penalty
      expect(suggestions[0].evaluation).not.toBe('perfect');
      expect(suggestions[0].evaluation).toBe('poor');
    });
  });

  describe('Good Conditions with Rain', () => {
    it('should NOT allow good rating for non-water activities with moderate rain', () => {
      const runningActivity: ActivityType = {
        id: 'running',
        name: 'Running',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: ['temp:10-22', 'wind<15'],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 16, // Good
            windspeed: 10, // Good
            precipitation: 2, // More than 0.5mm - blocks "good"
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [runningActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should not be "good" due to rain
      expect(suggestions[0].evaluation).not.toBe('good');
    });

    it('should not penalize water activities as harshly for rain', () => {
      const surfingActivity: ActivityType = {
        id: 'surfing',
        name: 'Surfing',
        category: 'Watersports', // Must include 'water' in category
        weatherSensitive: true,
        tags: ['water', 'watersports'],
        perfectConditions: [],
        goodConditions: ['temp:15-25', 'wind<25'],
        fairConditions: [],
        poorConditions: [],
      };

      const runningActivity: ActivityType = {
        id: 'running2',
        name: 'Running',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: ['temp:15-25', 'wind<25'],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 20, // Good
            windspeed: 15, // Good
            precipitation: 3, // Rain - should affect running more than surfing
            waterTemperature: 18,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [surfingActivity, runningActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(2);
      // Surfing should score better than running in the rain
      const surfingSuggestion = suggestions.find(s => s.activityId === 'surfing');
      const runningSuggestion = suggestions.find(s => s.activityId === 'running2');
      expect(surfingSuggestion?.score).toBeGreaterThanOrEqual(runningSuggestion!.score);
    });
  });

  describe('Fair Conditions Scoring', () => {
    it('should mark activity as fair when fair conditions match', () => {
      const gardeningActivity: ActivityType = {
        id: 'gardening',
        name: 'Gardening',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: ['temp:5-30', 'wind<30'],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 15, // Fair
            windspeed: 20, // Fair
            precipitation: 0,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [gardeningActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].evaluation).toBe('fair');
      expect(suggestions[0].score).toBeGreaterThanOrEqual(40);
      expect(suggestions[0].score).toBeLessThan(60);
    });

    it('should use neutral conditions score when score is exactly 50', () => {
      const neutralActivity: ActivityType = {
        id: 'walking',
        name: 'Walking',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: ['temp:0-35'],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 12,
            precipitation: 0,
            windspeed: 10,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [neutralActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should apply neutral conditions scoring (40-60 range)
      expect(suggestions[0].score).toBeGreaterThanOrEqual(40);
      expect(suggestions[0].score).toBeLessThanOrEqual(60);
    });
  });

  describe('Evening Bonus for Outdoor Activities', () => {
    it('should apply evening bonus to outdoor activities in the evening', () => {
      const stargazingActivity: ActivityType = {
        id: 'stargazing',
        name: 'Stargazing',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor', 'evening'],
        perfectConditions: ['clouds<20'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const eveningTime = new Date('2025-09-25T20:00:00Z'); // 8 PM

      const forecast = [
        {
          date: eveningTime.getTime(),
          weather: {
            temperature: 15,
            clouds: 10, // Clear sky - perfect for stargazing
            precipitation: 0,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [stargazingActivity],
        interests: [],
        now: eveningTime,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Evening bonus should boost the score
      expect(suggestions[0].score).toBeGreaterThan(90);
    });
  });

  describe('Missing Weather Data Edge Cases', () => {
    it('should handle completely empty weather object', () => {
      const genericActivity: ActivityType = {
        id: 'generic',
        name: 'Generic Activity',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {}, // Empty weather data
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [genericActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should not crash, should have some default score
      expect(suggestions[0].score).toBeDefined();
      expect(suggestions[0].score).toBeGreaterThan(0);
    });

    it('should handle missing temperature', () => {
      const tempSensitiveActivity: ActivityType = {
        id: 'temp_sensitive',
        name: 'Temp Sensitive',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            // No temperature
            precipitation: 0,
            windspeed: 10,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [tempSensitiveActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should not crash with missing temperature
      expect(suggestions[0].score).toBeDefined();
    });

    it('should handle missing precipitation', () => {
      const rainSensitiveActivity: ActivityType = {
        id: 'rain_sensitive',
        name: 'Rain Sensitive',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: ['rain>0'],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: {
            temperature: 20,
            // No precipitation data
            windspeed: 10,
          },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [rainSensitiveActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(suggestions).toHaveLength(1);
      // Should handle missing precipitation gracefully
      expect(suggestions[0].score).toBeDefined();
    });
  });

  describe('Multiple Days Forecast', () => {
    it('should handle multi-day forecasts correctly', () => {
      const hikingActivity: ActivityType = {
        id: 'hiking',
        name: 'Hiking',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25', 'rain<0.5'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: { temperature: 20, precipitation: 0, windspeed: 5 },
        },
        {
          date: now.getTime() + 24 * 60 * 60 * 1000, // Next day
          weather: { temperature: 25, precipitation: 5, windspeed: 15 },
        },
        {
          date: now.getTime() + 48 * 60 * 60 * 1000, // Two days later
          weather: { temperature: 18, precipitation: 0, windspeed: 8 },
        },
      ];

      const results = getSuggestionsByDay({
        forecast,
        activities: [hikingActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(results).toHaveLength(3);
      // Each day should have suggestions
      expect(results[0].suggestions[0]).toBeDefined();
      expect(results[1].suggestions[0]).toBeDefined();
      expect(results[2].suggestions[0]).toBeDefined();

      // Second day (rainy) should score lower than first and third days
      expect(results[1].suggestions[0].score).toBeLessThan(results[0].suggestions[0].score);
      expect(results[1].suggestions[0].score).toBeLessThan(results[2].suggestions[0].score);

      // Rainy day should not be perfect or good
      expect(results[1].suggestions[0].evaluation).not.toBe('perfect');
      expect(results[1].suggestions[0].evaluation).not.toBe('good');
    });
  });

  describe('Activity Filtering (includeAllActivities: false)', () => {
    it('should filter out activities below minimum score threshold', () => {
      const poorActivity: ActivityType = {
        id: 'poor_activity',
        name: 'Poor Activity',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: ['temp:0-100', 'humidity>0'], // Multiple poor conditions to ensure low score
      };

      const goodActivity: ActivityType = {
        id: 'good_activity',
        name: 'Good Activity',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: { temperature: 20, precipitation: 0, windspeed: 10, humidity: 80 },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [poorActivity, goodActivity],
        interests: [],
        now,
        includeAllActivities: false, // Filter enabled
      });

      // When filtering is on, should favor higher-scoring activities
      // The good activity should be included
      expect(suggestions.some(s => s.activityId === 'good_activity')).toBe(true);
      // The good activity should score higher than poor
      const goodSuggestion = suggestions.find(s => s.activityId === 'good_activity');
      expect(goodSuggestion).toBeDefined();
      expect(goodSuggestion!.score).toBeGreaterThanOrEqual(40);
    });

    it('should include all activities when includeAllActivities is true', () => {
      const poorActivity: ActivityType = {
        id: 'poor_activity',
        name: 'Poor Activity',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: ['humidity>0'], // Always poor
      };

      const forecast = [
        {
          date: now.getTime(),
          weather: { temperature: 20, precipitation: 0, humidity: 80 },
        },
      ];

      const [{ suggestions }] = getSuggestionsByDay({
        forecast,
        activities: [poorActivity],
        interests: [],
        now,
        includeAllActivities: true, // No filtering
      });

      // Should include even poor-scoring activities
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].activityId).toBe('poor_activity');
    });
  });

  describe('Empty Inputs', () => {
    it('should handle empty activities array', () => {
      const forecast = [
        {
          date: now.getTime(),
          weather: { temperature: 20, precipitation: 0 },
        },
      ];

      const results = getSuggestionsByDay({
        forecast,
        activities: [], // Empty
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0].suggestions).toHaveLength(0);
    });

    it('should handle empty forecast array', () => {
      const hikingActivity: ActivityType = {
        id: 'hiking',
        name: 'Hiking',
        category: 'Outdoor',
        weatherSensitive: true,
        tags: ['outdoor'],
        perfectConditions: ['temp:15-25'],
        goodConditions: [],
        fairConditions: [],
        poorConditions: [],
      };

      const results = getSuggestionsByDay({
        forecast: [], // Empty
        activities: [hikingActivity],
        interests: [],
        now,
        includeAllActivities: true,
      });

      expect(results).toHaveLength(0);
    });
  });
});
