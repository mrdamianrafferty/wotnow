/**
 * Golf, held against the R&A's own rules rather than a guess.
 *
 * Two numbers in golf's ladder contradicted the sport they describe.
 *
 *   COLD. It vetoed below 5 °C. A course closes for FROST, and frost forms
 *   when the air is at 0 °C or a little above it, the ground being colder than
 *   the air. That is the entire basis of the frost delay: ice crystals in the
 *   leaf are punctured underfoot and the green carries the footprints for
 *   months. Five degrees is not frost, it is an ordinary British winter round,
 *   and the model called it "not today".
 *
 *   WIND. It vetoed above 8 m/s — 18 mph, a Force 5 — which is a normal
 *   afternoon on a links and a STRICTER limit than this library puts on
 *   hiking. The R&A's test has no speed in it at all: under Rule 5.7b the
 *   Committee should consider suspending "if several balls are moved by wind on
 *   different parts of the course within a relatively short period of time" —
 *   a question about balls at rest on fast greens, which happens around 30 mph.
 *
 * NOT COVERED, and not to be read into the numbers below: golf's real
 * suspensions are lightning and an unplayable course. Nothing in this library
 * scores lightning, and standing water reaches the score only through
 * `soilMoisture`.
 *
 * The LTA, Archery GB and the padel and pickleball bodies publish no figure at
 * all, so `tennis`, `archery`, `padel` and `pickleball` are deliberately
 * untouched — see the docblock in `data/activities/individual.ts`.
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

function score(activityId: string, over: Record<string, number>) {
  const now = new Date('2026-11-08T12:00:00');
  const weather = { temperature: 12, precipitation: 0, precipitationHours: 0, clouds: 50,
    windspeed: 10, gustspeed: 15, humidity: 75, visibility: 20000, soilMoisture: 35, ...over };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

const KMH = 1.609344;   // per mph

describe('golf stops for frost, not for cold', () => {
  it.each([2, 3, 4, 5])('plays a still, dry winter round at %i°C', (t) => {
    expect(score('golf', { temperature: t, windspeed: 8, gustspeed: 12 }))
      .toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });

  it.each([0, 1])('still declines at %i°C, where frost forms', (t) => {
    expect(score('golf', { temperature: t, windspeed: 8, gustspeed: 12 }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('golf is played on links in a Force 5', () => {
  it('does not veto an 18 mph afternoon', () => {
    // The measured symptom: a Force 5 vetoed golf outright, which is a
    // stricter wind limit than this library puts on hiking.
    const kmh = Math.round(18 * KMH);
    expect(score('golf', { windspeed: kmh, gustspeed: Math.round(kmh * 1.4) }))
      .toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
  });

  it('is no stricter on wind than hiking is', () => {
    const veto = (id: string) => {
      const poor = ((allSports as Array<{ id: string; poorConditions?: string[] }>)
        .find((a) => a.id === id)!.poorConditions ?? []).join(' ');
      return Number(/windSpeed>([\d.]+)/.exec(poor)![1]);
    };
    expect(veto('golf')).toBeGreaterThanOrEqual(veto('hiking'));
  });

  it('still ends at the wind that moves a ball at rest', () => {
    // ~34 mph. Rule 5.7b's test is the balls, not a number, but this is the
    // region it describes.
    const kmh = Math.round(34 * KMH);
    expect(score('golf', { windspeed: kmh, gustspeed: Math.round(kmh * 1.4) }))
      .toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('the sports whose bodies publish nothing are left alone', () => {
  it('keeps tennis, archery, padel and pickleball on their existing wind veto', () => {
    /*
     * They share golf's OLD 18 mph ladder, which is a copy rather than a
     * finding — a padel court has glass walls and a pickleball is nearly
     * weightless, so they cannot really have the same answer. Retuning them on
     * judgement alone is what this whole exercise exists to stop, so the
     * inheritance is pinned instead: if someone changes one, they have to
     * come back here and say why.
     */
    const veto = (id: string) => {
      const poor = ((allSports as Array<{ id: string; poorConditions?: string[] }>)
        .find((a) => a.id === id)!.poorConditions ?? []).join(' ');
      return Number(/windSpeed>([\d.]+)/.exec(poor)![1]);
    };
    for (const id of ['tennis', 'archery', 'padel', 'pickleball']) expect(veto(id)).toBe(8);
  });
});
