import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import type { ActivityType } from '../data/activities/types';

describe('getSuggestionsByDay humidity reasoning', () => {
  const now = new Date('2025-09-25T09:00:00Z');

  /* The Math.random stub this suite used to need is gone with the randomness
     it was compensating for: scores are now derived from how well each
     criterion was met, so identical input gives an identical number. */

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
        date: Math.floor(now.getTime() / 1000),
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

    /* Asserts the FACT rather than the phrasing — the copy was rewritten in
       2026-09 and pinning its exact words would make every future improvement
       look like a regression. What matters is that the reader is told humidity
       is the problem, and told the figure. */
    const reasoning = suggestions[0].reasoning ?? '';
    expect(reasoning.toLowerCase()).toContain('humid');
    expect(reasoning).toContain('95%');

    /* Said once. The reason engine and the standalone humidity note both know
       about humidity, and an early version printed both. */
    expect(reasoning.match(/95%/g)).toHaveLength(1);
  });

  it('is deterministic — the same day scores the same twice', () => {
    const activities: ActivityType[] = [
      {
        id: 'stable_activity',
        name: 'Stable Activity',
        category: 'Test',
        weatherSensitive: true,
        tags: ['test'],
        perfectConditions: ['temperature=15..20', 'windSpeed<5'],
        goodConditions: ['temperature=10..24', 'windSpeed<9'],
        fairConditions: ['temperature=5..10', 'windSpeed=9..13'],
        poorConditions: ['windSpeed>13'],
      },
    ];
    const forecast = [{ date: Math.floor(now.getTime() / 1000), weather: { temperature: 17, windspeed: 20 } }];

    const run = () => getSuggestionsByDay({
      forecast, activities, interests: [], now, includeAllActivities: true,
    })[0].suggestions[0].score;

    const scores = [run(), run(), run(), run(), run()];
    expect(new Set(scores).size).toBe(1);
  });
});
