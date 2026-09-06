/**
 * An indoor activity waits its turn.
 *
 * The setup screen used to filter indoor activities out entirely, on the
 * argument that the call is about what the weather decides. When that filter
 * came off, the first thing the screen said on a dry 18° afternoon was "a day
 * for a café" — because `scoreActivity`'s indoor branch opens at 65, applies
 * the evening bonus and clamps at 95, while a perfectly good walk scored 84.
 *
 * The rule this pins is the one the separate write-off prompt already encoded
 * in prose: while anything outdoors is good, that is the answer. Indoor options
 * ride along in the alternates and take the headline only when nothing outdoors
 * does.
 *
 * Tested through `makeCall` because the failure was never in the scorer — the
 * scores are what they are, and four other screens depend on them. It was the
 * call choosing the wrong one of them.
 */

import { makeCall } from '@/lib/godaisy/call/makeCall';
import { allSports } from '@/data/activities';
import type { Suggestion, WeatherData } from '@/utils/getSuggestionsByDay';

const NOW = new Date('2026-09-07T06:00:00Z');
const DATE = Math.floor(Date.parse('2026-09-07T12:00:00Z') / 1000);
const ACTIVITIES = allSports as never;

const FINE: WeatherData = {
  temperature: 18, precipitation: 0, precipitationHours: 0,
  windspeed: 11, windspeedMax: 14, gustspeed: 19,
  clouds: 30, humidity: 62, visibility: 20000,
};

/**
 * Scores are supplied rather than computed, so the test states the exact
 * situation it is about: the indoor option outscoring the outdoor one. That is
 * the real arrangement — 95 against 84 — and it is what makes the ordering a
 * decision instead of a side effect of two numbers.
 */
const call = (scores: Record<string, number>) =>
  makeCall({
    date: DATE,
    place: 'Sheffield',
    weather: FINE,
    suggestions: Object.entries(scores).map(
      ([activityId, score]) => ({ activityId, score, evaluation: 'good' } as unknown as Suggestion),
    ),
    sports: Object.keys(scores),
    activities: ACTIVITIES,
    now: NOW,
  });

describe('the call, with indoor activities in the mix', () => {
  it('leads with the outdoor option even when an indoor one scores higher', () => {
    const { call: lead, alternates } = call({ urban_exploring: 84, cafe: 95, reading: 95 });

    expect(lead?.activityId).toBe('urban_exploring');
    // And the indoor ones are still offered — demoted, not dropped.
    expect(alternates.map((a) => a.activityId)).toEqual(['urban_exploring', 'cafe', 'reading']);
  });

  it('keeps the outdoor options in score order among themselves', () => {
    const { alternates } = call({ urban_exploring: 74, picnicking: 84, cafe: 95 });

    expect(alternates.map((a) => a.activityId)).toEqual(['picnicking', 'urban_exploring', 'cafe']);
  });

  it('hands the day to an indoor option when nothing outdoors is good', () => {
    // 30 is below every band that reaches the call screen; 95 is not.
    const { call: lead } = call({ urban_exploring: 30, picnicking: 30, cafe: 95 });

    expect(lead?.activityId).toBe('cafe');
  });

  it('reads as English — the library names these as instructions', () => {
    const { call: lead } = call({ urban_exploring: 30, cafe: 95 });

    // "a day for visit a café." was live the moment the filter came off.
    const said = `${lead?.verdict.leadIn ?? ''} ${lead?.verdict.verdict ?? ''}`;
    expect(said).not.toMatch(/\b(visit|do|read|paint|cook|hit)\s/i);
  });

  /*
   * An indoor option's bars are now uniform by construction (see window.ts) —
   * three identical pills and an "it holds all day" note that were never
   * evidence for anything. Rather than show that, the drawer gets no bars at
   * all for an indoor activity; the outdoor one beside it still does.
   */
  it('gives no daypart bars to an indoor option, even when the day is cut into parts', () => {
    const { alternates } = makeCall({
      date: DATE,
      place: 'Sheffield',
      weather: FINE,
      suggestions: [
        { activityId: 'urban_exploring', score: 84, evaluation: 'good' } as unknown as Suggestion,
        { activityId: 'reading', score: 95, evaluation: 'good' } as unknown as Suggestion,
      ],
      sports: ['urban_exploring', 'reading'],
      activities: ACTIVITIES,
      now: NOW,
      parts: { morning: FINE, afternoon: FINE, evening: FINE },
    });

    const outdoor = alternates.find((a) => a.activityId === 'urban_exploring');
    const indoor = alternates.find((a) => a.activityId === 'reading');
    expect(outdoor?.parts?.length).toBeGreaterThan(0);
    expect(indoor?.parts).toBeUndefined();
  });
});
