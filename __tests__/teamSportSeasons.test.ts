/**
 * A team sport is in season when its governing body says it is.
 *
 * This came out of checking whether the team sports publish call-off
 * thresholds. Mostly they do not — the decision belongs to the match official,
 * and the FA's frozen-pitch test is a thumb pressed into the turf — but the
 * search turned up three `seasonalMonths` that were wrong, which matters more
 * than any threshold in that file: an activity out of season is penalised into
 * the "not today" bucket whatever the weather is doing, so the tile is wrong
 * on every single day of the months concerned.
 *
 *   hockey    was [3..10], March-October. England Hockey is a WINTER sport:
 *             the 2025-26 league season ran 20 September to 29 March, and
 *             2026-27 starts 12 September to finish before Easter. So the
 *             model was in season through a summer with no hockey in it and
 *             OUT of season from November to February, the middle of the
 *             actual season. Measured: hockey scored 35 on a fine January
 *             afternoon and 91 in June.
 *
 *   cricket   was [5..9], missing April entirely — the County Championship ran
 *             3 April to 27 September in 2026 and the ECB National Club
 *             Championship "begins in April". A dry 13°C April afternoon read
 *             35: "not today", in the month people most want to be told yes.
 *
 *   rugby     was [9..3], cutting April off the end of the community season.
 */

import { allSports } from '../data/activities';
import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

type Model = { id: string; seasonalMonths?: number[] };
const months = (id: string) =>
  (allSports as Model[]).find((a) => a.id === id)!.seasonalMonths!;

function scoreOn(activityId: string, iso: string, temperature: number) {
  const now = new Date(iso);
  const weather = { temperature, precipitation: 0, clouds: 40, windspeed: 10,
    gustspeed: 15, humidity: 75, visibility: 20000, soilMoisture: 35 };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

describe('hockey is a winter sport', () => {
  it('is in season across the winter months it is actually played in', () => {
    for (const m of [9, 10, 11, 12, 1, 2, 3]) expect(months('hockey')).toContain(m);
  });

  it('is not in season in midsummer', () => {
    for (const m of [6, 7, 8]) expect(months('hockey')).not.toContain(m);
  });

  it('offers a fine January afternoon and declines a fine June one', () => {
    // Before: 35 in January, 91 in June. Exactly backwards.
    expect(scoreOn('hockey', '2026-01-17T14:00:00', 6)).toBeGreaterThanOrEqual(BAND_FLOOR.worthALook);
    expect(scoreOn('hockey', '2026-06-20T14:00:00', 19)).toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('the English cricket season starts in April', () => {
  it('includes April and September, and excludes the winter', () => {
    expect(months('cricket')).toContain(4);
    expect(months('cricket')).toContain(9);
    for (const m of [11, 12, 1, 2]) expect(months('cricket')).not.toContain(m);
  });

  it('offers a dry 13°C April afternoon', () => {
    // The County Championship is three weeks old by then; this read 35.
    expect(scoreOn('cricket', '2026-04-25T14:00:00', 13)).toBeGreaterThanOrEqual(BAND_FLOOR.worthALook);
  });
});

describe('rugby runs to the end of April', () => {
  it('includes April', () => {
    expect(months('rugby')).toContain(4);
  });

  it('still declines midsummer', () => {
    expect(scoreOn('rugby', '2026-06-20T14:00:00', 19)).toBeLessThan(BAND_FLOOR.marginal);
  });
});

describe('the cold vetoes stay stricter than World Rugby’s, deliberately', () => {
  it('does not relax towards the -15°C cold-injury figure', () => {
    /*
     * World Rugby postpones "when air temperature falls below -15°C". Every
     * cold veto here is far stricter and stays so: what stops a British match
     * in January is the state of the GROUND, not cold injury to the player,
     * and a sub-zero air temperature is the only proxy this library has for a
     * pitch that will not take a stud. Pinned so the citation cannot later be
     * used to argue the numbers down.
     */
    const coldVeto = (id: string) => {
      const poor = ((allSports as Array<{ id: string; poorConditions?: string[] }>)
        .find((a) => a.id === id)!.poorConditions ?? []).join(' ');
      return Number(/temperature<(-?[\d.]+)/.exec(poor)![1]);
    };
    for (const id of ['football_soccer', 'rugby', 'gaelic_football', 'hockey']) {
      expect(coldVeto(id)).toBeGreaterThan(-15);
    }
  });
});
