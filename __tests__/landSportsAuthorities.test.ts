/**
 * The cycling and on-foot thresholds, held against what the governing bodies
 * publish — the same pass `watersportsAuthorities.test.ts` does for the water.
 *
 * Sources, with the figures asserted below quoted in full in the docblocks at
 * the top of `data/activities/cycling.ts` and `data/activities/outdoor.ts`:
 *
 *   Mountaineering Scotland   30-40 mph "starts affecting balance of fit
 *                             adults; foot placement becomes uncertain";
 *                             40-50 mph "walking will be arduous"
 *   AusCycling                cold "under 5 degrees" is a CAUTION — warmer
 *                             clothing, schedule later — not a cancellation;
 *                             wind cancels at gale, 62 km/h
 *   UCI                       heat is measured in WBGT, not air temperature,
 *                             so its 28 °C red zone is NOT comparable here
 *   British Cycling / BMC     publish no thresholds at all
 */

import { getSuggestionsByDay } from '../utils/getSuggestionsByDay';
import { allSports } from '../data/activities';
import { BAND_FLOOR } from '../lib/godaisy/call/bands';

type Model = { id: string; poorConditions?: string[] };
const model = (id: string) => (allSports as Model[]).find((a) => a.id === id)!;
const veto = (id: string, key: string) =>
  Number(new RegExp(`${key}>([\\d.]+)`).exec((model(id).poorConditions ?? []).join(' '))![1]);

const MPH = 2.23694;

function score(activityId: string, over: Record<string, number>) {
  const now = new Date('2026-01-15T11:00:00');
  const weather = { temperature: 8, precipitation: 0, clouds: 30, windspeed: 10,
    gustspeed: 15, humidity: 75, visibility: 20000, soilMoisture: 30, ...over };
  const byDay = getSuggestionsByDay({
    forecast: [{ date: Math.floor(now.getTime() / 1000), weather: weather as never }] as never,
    activities: allSports as never, interests: [activityId], now, includeAllActivities: true,
  }) as Array<{ suggestions: Array<{ activityId: string; score: number }> }>;
  return byDay[0].suggestions.find((s) => s.activityId === activityId)!.score;
}

describe('on foot on the hill, one scale', () => {
  /*
   * Mountaineering Scotland is the only UK source that states the effect on a
   * person. `trail_running` and `rock_hopping` used to stop at 34/45 mph —
   * offering as workable the conditions in which that scale says foot
   * placement is uncertain and gusts blow a walker sideways.
   */
  const ON_FOOT = ['hiking', 'trail_running', 'orienteering', 'rock_hopping', 'running'];

  it.each(ON_FOOT)('%s stops its mean wind at 29 mph, the foot of the balance band', (id) => {
    expect(veto(id, 'windSpeed') * MPH).toBeLessThanOrEqual(30);
  });

  it.each(ON_FOOT)('%s stops its gust under the 40 mph where walking turns arduous', (id) => {
    expect(veto(id, 'gust') * MPH).toBeLessThan(40);
  });

  it('does not let a runner out in wind a walker is kept out of', () => {
    // The defect: trail_running tolerated a full 5 mph more than hiking, on
    // the same ground, moving faster and less able to brace.
    expect(veto('trail_running', 'windSpeed')).toBeLessThanOrEqual(veto('hiking', 'windSpeed'));
    expect(veto('trail_running', 'gust')).toBeLessThanOrEqual(veto('hiking', 'gust'));
  });

  it('leaves rock climbing alone, because no body publishes a number for it', () => {
    /*
     * The BMC publishes no wind threshold for climbing; that absence was
     * searched for and is itself the finding. A walking scale is not evidence
     * about a roped climber at a crag chosen for shelter, so this stays where
     * it was rather than being tidied into line.
     */
    expect(veto('rock_climbing', 'windSpeed')).toBe(15);
    expect(veto('rock_climbing', 'gust')).toBe(20);
  });
});

describe('cold does not cancel a bike ride', () => {
  /*
   * AusCycling's Extreme Weather Policy is the only national federation with a
   * table, and under 5 °C is a CAUTION there — warmer clothing, ride later —
   * not a cancellation. `cycling` vetoed below 8 °C and `road_cycling` below 5,
   * so an ordinary dry British winter morning read 14: "not today".
   */
  it.each(['road_cycling', 'cycling', 'gravel_biking'])(
    '%s treats a dry 4°C morning as rideable', (id) => {
      expect(score(id, { temperature: 4 })).toBeGreaterThanOrEqual(BAND_FLOOR.marginal);
    });

  it('still rules out ice', () => {
    // The veto moved to where the hazard stops being cold and starts being ice.
    for (const id of ['road_cycling', 'cycling', 'gravel_biking']) {
      expect(score(id, { temperature: 0 })).toBeLessThan(BAND_FLOOR.marginal);
    }
  });

  it('no longer has one bike model six degrees stricter than another', () => {
    const cold = (id: string) =>
      Number(/temperature<(-?[\d.]+)/.exec((model(id).poorConditions ?? []).join(' '))![1]);
    expect(cold('cycling')).toBe(cold('gravel_biking'));
    expect(cold('road_cycling')).toBe(cold('gravel_biking'));
  });
});

describe('cycling wind stays inside the federation’s own band', () => {
  it('vetoes below the 62 km/h at which AusCycling cancels racing', () => {
    // 13 m/s = 47 km/h: past their 40 km/h notification, short of the gale
    // that cancels. Conservative for a rider with no commissaire.
    const kmh = veto('road_cycling', 'windSpeed') * 3.6;
    expect(kmh).toBeGreaterThan(40);
    expect(kmh).toBeLessThan(62);
  });
});
