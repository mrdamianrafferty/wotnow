/**
 * At seven in the morning the weather can be perfect for a barbecue and the
 * suggestion still be absurd.
 *
 * The day grew a fourth part, `early` (06:00–09:00), so a hot country's usable
 * window would stop being averaged into a 27 °C late morning. It is judged at
 * 07:00. Conditions are not the only thing that makes an hour wrong for an
 * activity, and nothing in the scorer knew that — a Seville July morning is
 * ideal by every criterion a barbecue states.
 *
 * ─── The default is the opposite of the after-dark lists ─────────────────
 *
 * `AFTER_DARK` names what CAN be done and suppresses the rest, because the cost
 * of a wrong entry is somebody driving to a reservoir they cannot see.
 * `NOT_BEFORE_NINE` names what CANNOT and allows the rest, because most
 * physical activity is fine at seven — and in the climates this part of the day
 * exists FOR, seven o'clock is the only civilised hour there is. An allow-list
 * would have to name nearly every activity in the library, would be
 * under-populated, and every omission would silently undo the early block.
 *
 * A missing entry here costs an odd-sounding suggestion. A wrong one costs a
 * Sevillian being told there is nowhere to run at the only cool hour of their
 * day. The first is embarrassing; the second is useless.
 */

import { partBands } from '@/lib/godaisy/call/window';
import { NOT_BEFORE_NINE } from '@/data/activityLight';
import { allSports } from '@/data/activities';

/** A flawless Seville July day: 21 °C at seven, 33 °C in the afternoon. */
const w = (temperature: number) => ({
  temperature, precipitation: 0, precipitationHours: 0, clouds: 15,
  windspeed: 6, gustspeed: 10, humidity: 55, visibility: 25000, soilMoisture: 28,
});
const PARTS = { early: w(21), morning: w(25), afternoon: w(33), evening: w(31) };
const SEVILLE = { lat: 37.389, lon: -5.984 };
const DATE = Math.floor(new Date('2026-07-15T12:00:00').getTime() / 1000);
const NOW = new Date('2026-07-15T09:00:00');

const offered = (id: string) =>
  partBands(id, PARTS as never, DATE, allSports as never, NOW, SEVILLE).map((b) => b.name);

describe('some hours are wrong whatever the weather says', () => {
  it.each(['bbq', 'picnicking', 'outdoor_music'])(
    'does not offer %s at seven in the morning', (id) => {
      expect(offered(id)).not.toContain('early');
      // ...and still has the rest of the day to work with.
      expect(offered(id)).toEqual(['morning', 'afternoon', 'evening']);
    });

  it.each(['running', 'dog_walking', 'golf', 'tennis', 'beach', 'sea_swimming', 'football_soccer'])(
    'still offers %s early, which is the whole point', (id) => {
      expect(offered(id)).toContain('early');
    });
});

describe('the judgements the list makes', () => {
  it('excludes a meal or an occasion, which needs people and an hour they keep', () => {
    expect(NOT_BEFORE_NINE.has('bbq')).toBe(true);
    expect(NOT_BEFORE_NINE.has('outdoor_music')).toBe(true);
  });

  it('does NOT exclude golf or tennis — a dawn tee time is how you beat the heat', () => {
    expect(NOT_BEFORE_NINE.has('golf')).toBe(false);
    expect(NOT_BEFORE_NINE.has('tennis')).toBe(false);
  });

  it('does NOT exclude the beach — in a hot country a swim at seven is the point', () => {
    expect(NOT_BEFORE_NINE.has('beach')).toBe(false);
    expect(NOT_BEFORE_NINE.has('sea_swimming')).toBe(false);
  });

  it('does NOT exclude the team sports', () => {
    /*
     * A 7 a.m. fixture would be odd, but the app is not scheduling a match —
     * it is saying the conditions suit a game, and a kickabout before work is
     * a real thing.
     */
    for (const id of ['football_soccer', 'cricket', 'rugby', 'hockey'])
      expect(NOT_BEFORE_NINE.has(id)).toBe(false);
  });

  it('stays short enough to be argued with', () => {
    // It is a list of judgements, and a long one stops being read.
    expect(NOT_BEFORE_NINE.size).toBeLessThan(10);
  });

  it('names only activities that exist', () => {
    const ids = new Set((allSports as Array<{ id: string }>).map((a) => a.id));
    for (const id of NOT_BEFORE_NINE) expect(ids.has(id)).toBe(true);
  });
});
