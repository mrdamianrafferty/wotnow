/**
 * The curated tree has to keep up with the library.
 *
 * `ACTIVITY_GROUPS` orders the expanded list on `/start`, and anything the tree
 * does not mention falls into an "Everything else" bucket at the bottom of the
 * screen. That bucket is a safety net, not a home: beekeeping, geocaching,
 * frisbee, horse riding, orienteering and storm-driven birdwatching all sat in
 * it for months purely because they were added to the library and to nothing
 * else, so they appeared last, unlabelled, under a heading that told the reader
 * nothing.
 *
 * This test is the thing that was missing. Adding a weather-sensitive activity
 * now fails here until it has been filed somewhere a person would look for it.
 */

import { allSports } from '@/data/activities';
import { ACTIVITY_GROUPS } from '@/data/activityGroups';

interface Activity {
  id: string;
  name: string;
  weatherSensitive: boolean;
}

const library = allSports as Activity[];
const curated = ACTIVITY_GROUPS.flatMap((c) => c.subcategories.flatMap((s) => s.acts));
const curatedSet = new Set(curated);

/**
 * The one deliberate exemption.
 *
 * `jetskiing` and `jet_skiing` are two rows in the library with the same name,
 * "Go Jet Skiing". `/start` dedupes by the label a person actually sees and
 * keeps the curated id, so the second never renders and does not need a home.
 * If the duplicate is ever cleaned out of the library this line goes with it.
 */
const DEDUPED_IN_UI = new Set(['jetskiing']);

describe('ACTIVITY_GROUPS', () => {
  it('files every weather-sensitive activity the setup screen can show', () => {
    const missing = library
      .filter((a) => a.weatherSensitive && !curatedSet.has(a.id) && !DEDUPED_IN_UI.has(a.id))
      .map((a) => `${a.id} (${a.name})`);

    expect(missing).toEqual([]);
  });

  it('names no activity the library has dropped', () => {
    const ids = new Set(library.map((a) => a.id));
    expect(curated.filter((id) => !ids.has(id))).toEqual([]);
  });

  it('gives every subcategory at least one activity', () => {
    const empty = ACTIVITY_GROUPS.flatMap((c) =>
      c.subcategories.filter((s) => s.acts.length === 0).map((s) => `${c.key} / ${s.key}`),
    );
    expect(empty).toEqual([]);
  });
});
