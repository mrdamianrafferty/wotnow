import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import type { ActivityType } from '../data/activities/types';

describe('getSuggestionsByDay humidity reasoning', () => {
  const now = new Date('2025-09-25T09:00:00Z');
  let randomSpy: jest.SpyInstance<number, []>;

  beforeAll(() => {
    randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterAll(() => {
    randomSpy.mockRestore();
  });

  it('adds a humidity warning when humidity is oppressive and score is poor', () => {
    const activities: ActivityType[] = [
      {
        id: 'humidity_sensitive_activity',
        name: 'Test Activity',
        category: 'Test',
        weatherSensitive: true,
        tags: ['test'],
        perfectConditions: [],
        goodConditions: [],
        fairConditions: [],
        poorConditions: ['humidity>90'],
      },
    ];

    const forecast = [
      {
        date: now.getTime(),
        weather: {
          temperature: 22,
          humidity: 95,
        },
      },
    ];

    const [{ suggestions }] = getSuggestionsByDay({
      forecast,
      activities,
      interests: [],
      now,
      includeAllActivities: true,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].evaluation).toBe('poor');
    const reasoning = suggestions[0].reasoning ?? '';
    expect(reasoning).toContain('High humidity');
    expect(reasoning).toContain('95%');
  });
});
