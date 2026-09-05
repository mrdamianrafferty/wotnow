/**
 * How each sport gets said.
 *
 * Reading the first week, Norfolk Broads came back as seven consecutive
 * "Today is a sailing day. Moderate breeze, Force 4." Identical, seven times.
 * Somebody swiping through their week sees one sentence with the numbers
 * changed, which is what a template looks like when it has no wardrobe.
 *
 * So each sport carries a set of verdicts rather than one. Two shapes:
 *
 *   `noun`      — fills the lockup's "Today is a ___ day." frame, where the
 *                 lead-in is a separate 19px line above a 62px verdict.
 *   `sentences` — complete verdicts. The lockup DROPS the lead-in for these,
 *                 which is why `leadIn` is optional in the VerdictLockup
 *                 contract, and they carry their own subject.
 *
 * **Selection is deterministic, never random.** The same day at the same place
 * must produce the same sentence every time it is asked, or the share card
 * contradicts the screen someone tapped Send on, and a refresh silently rewrites
 * the day. It is seeded on place and sport and stepped by the day index, which
 * also guarantees consecutive days never repeat.
 *
 * **Sentences are day-agnostic.** They carry `{When}` / `{when}` rather than the
 * word "today", because the call screen swipes: a verdict written "There is wind
 * enough today" is simply wrong once someone has swiped to Tuesday, and the first
 * run produced exactly that. The renderer substitutes "Today"/"today" for day 0
 * and the weekday for the rest.
 *
 * **Voice rules apply**: British English, second person or universal, no emoji,
 * no exclamation marks. A day is decent or a write-off, never nice.
 *
 * @module lib/godaisy/call/phrasebook
 */

export interface SportPhrases {
  /** For "Today is a ___ day." Omit where no natural noun form exists. */
  noun?: string;
  /**
   * Predicates that follow the "{When} is" lead-in — "a good day to hoist the
   * mainsail." The lockup keeps its two-part shape: a 19px lead-in above the
   * big verdict.
   */
  predicates?: string[];
  /**
   * Complete verdicts that carry their own subject, for which the lead-in is
   * dropped.
   *
   * Keep them SHORT, and prefer NOT to name the day: the kicker above already
   * says "Croyde Bay · Wednesday 9 September", so a `{when}` here both repeats
   * it and costs twelve characters. Ten phrases failed the fit for exactly that
   * reason. Measured in Charis at the 338px column, a filled verdict over about
   * 34 characters cannot hold three lines even at the 44px floor —
   * `__tests__/callPhrasebook.test.ts` enforces it.
   */
  sentences?: string[];
}

export const PHRASEBOOK: Record<string, SportPhrases> = {
  sailing: {
    noun: 'sailing',
    predicates: [
      'a good day to be under sail.',
      'a good day to hoist the mainsail.',
      'a good day to sail away.',
    ],
    sentences: [
      'Get the boat on the water.',
      'There is wind enough {when}.',
    ],
  },
  windsurfing: {
    noun: 'windsurfing',
    predicates: [
      'a good day to get the rig out.',
      'a good day to be planing.',
    ],
    sentences: [
      'The wind is doing the right thing.',
    ],
  },
  kitesurfing: {
    noun: 'kitesurfing',
    predicates: [
      'a good day to get the kite up.',
      'a good day to be pulled along.',
    ],
    sentences: [
      'The wind is holding {when}.',
    ],
  },
  surfing: {
    noun: 'surf',
    predicates: [
      'a good day to paddle out.',
      'a good day to be in the water early.',
    ],
    sentences: [
      'There is swell worth having.',
      'Get out before it gets busy.',
    ],
  },
  sea_swimming: {
    noun: 'sea swimming',
    predicates: [
      'a good day to get in the sea.',
      'a good day for a swim off the beach.',
    ],
    sentences: [
      'The water is worth it {when}.',
    ],
  },
  wild_swimming: {
    noun: 'swimming',
    predicates: [
      'a good day to get in.',
      'a good day for a cold swim.',
    ],
    sentences: [
      'The water is worth it {when}.',
    ],
  },
  kayaking: {
    noun: 'kayaking',
    predicates: [
      'a good day to get the boat out.',
      'a good day to be on the water.',
    ],
    sentences: [
      'Flat enough to paddle {when}.',
    ],
  },
  sea_kayaking: {
    noun: 'sea kayaking',
    predicates: [
      'a good day to paddle the coast.',
      'a good day to be out along the cliffs.',
    ],
    sentences: [
      'The sea is kind enough {when}.',
    ],
  },
  stand_up_paddleboarding: {
    noun: 'paddleboarding',
    predicates: [
      'a good day to get the board out.',
      'a good day to be on the water.',
    ],
    sentences: [
      'Flat enough to stand up {when}.',
    ],
  },
  canoeing: {
    noun: 'canoeing',
    predicates: [
      'a good day to get the canoe out.',
      'a good day to be on the water.',
    ],
  },
  rowing: {
    noun: 'rowing',
    predicates: [
      'a good day to get the boat out.',
    ],
    sentences: [
      'The water is flat enough {when}.',
    ],
  },
  road_cycling: {
    noun: 'cycling',
    predicates: [
      'a good day to get the bike out.',
      'a good day for a long one.',
      'a good day to be out on the bike.',
    ],
    sentences: [
      'The roads are dry {when}.',
    ],
  },
  cycling: {
    noun: 'cycling',
    predicates: [
      'a good day to get the bike out.',
      'a good day to be out on the bike.',
    ],
  },
  gravel_biking: {
    noun: 'gravel',
    predicates: [
      'a good day for the gravel bike.',
    ],
    sentences: [
      'The tracks are dry {when}.',
    ],
  },
  mountain_biking: {
    noun: 'mountain biking',
    predicates: [
      'a good day to get on the trails.',
      'a good day to be in the woods.',
    ],
    sentences: [
      'The trails should run fast.',
    ],
  },
  running: {
    noun: 'running',
    predicates: [
      'a good day to get a run in.',
      'a good day for a long one.',
    ],
    sentences: [
      'Good running weather {when}.',
    ],
  },
  trail_running: {
    noun: 'trail running',
    predicates: [
      'a good day to get on the trails.',
      'a good day to run off-road.',
    ],
    sentences: [
      'The ground should be good.',
    ],
  },
  hiking: {
    noun: 'walking',
    predicates: [
      'a good day to get the boots on.',
      'a good day for a long walk.',
      'a good day to be up on the hill.',
    ],
    sentences: [
      'Good walking weather {when}.',
    ],
  },
  climbing: {
    noun: 'climbing',
    predicates: [
      'a good day to get on the rock.',
      'a good day to be climbing.',
    ],
    sentences: [
      'The rock should be dry.',
    ],
  },
  bouldering: {
    noun: 'bouldering',
    predicates: [
      'a good day to get on the rock.',
    ],
    sentences: [
      'Friction should be good.',
    ],
  },
  golf: {
    noun: 'golf',
    predicates: [
      'a good day for a round.',
      'a good day to get out on the course.',
    ],
    sentences: [
      'The course should play well.',
    ],
  },
  stargazing: {
    noun: 'stargazing',
    predicates: [
      'a good night to look up.',
      'worth staying up for.',
    ],
    sentences: [
      'The sky should be clear after dark.',
    ],
  },
  birdwatching: {
    noun: 'birdwatching',
    predicates: [
      'a good day for the binoculars.',
      'a good day to be out watching.',
    ],
  },
  photography: {
    noun: 'photography',
    predicates: [
      'a good day to take the camera out.',
    ],
    sentences: [
      'The light should be good.',
    ],
  },
  gardening: {
    noun: 'gardening',
    predicates: [
      'a good day to get into the garden.',
      'a good day to get some jobs done outside.',
    ],
  },
  picnicking: {
    noun: 'picnic',
    predicates: [
      'a good day to eat outside.',
      'a good day to take lunch with you.',
    ],
  },
  camping: {
    noun: 'camping',
    predicates: [
      'a good night to be under canvas.',
      'a good day to put the tent up.',
    ],
  },
};

/**
 * A stable 32-bit hash. Not for security — only for choosing the same sentence
 * for the same day at the same place, every time it is asked.
 */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Fill the day tokens. `{When}` opens a sentence, `{when}` sits inside one.
 * Day 0 is "Today"; every other day is its weekday, because "on Tuesday" reads
 * better mid-sentence than a bare "Tuesday".
 */
export function fillWhen(text: string, weekday: string, isToday: boolean): string {
  return text
    .replace(/\{When\}/g, isToday ? 'Today' : weekday)
    // No leading space: the templates already put one before the token.
    .replace(/\{when\}/g, isToday ? 'today' : `on ${weekday}`);
}

export interface PhraseChoice {
  /** Set when the "Today is a ___ day." frame was used. */
  leadIn?: string;
  verdict: string;
}

/**
 * Pick the verdict for one sport on one day.
 *
 * `dayIndex` steps the choice, so a person swiping through the week never sees
 * the same phrasing twice in a row. `place` seeds it, so two people looking at
 * the same sport on the same day in different places do not get identical copy —
 * and the same person, in the same place, always does.
 */
export function choosePhrase(
  activityId: string,
  place: string,
  dayIndex: number,
  isFirst: boolean,
  fallbackNoun: string,
): PhraseChoice {
  const entry = PHRASEBOOK[activityId];
  // The lead-in names a day as much as the predicates do, so it carries the same
  // token: on a swiped-to day it must read "Tuesday is", not "Today is".
  const leadIn = isFirst ? '{When} is' : '{When} is also';

  if (!entry) return { leadIn, verdict: fallbackNoun };

  /*
   * Two shapes, and the split is a typographic one as much as an editorial one.
   *
   * Measured in Charis at the call screen's 338px column, "Wednesday is a good
   * day to hoist the mainsail." needs FOUR lines even at the 44px floor — it
   * cannot be a standalone verdict without changing the lockup. Split across the
   * 19px lead-in and the big verdict, the same words fit three lines at 58px.
   * So anything of that shape is stored as a predicate; only short standalones
   * keep their own subject.
   */
  const predicates = entry.predicates ?? [];
  const sentences = entry.sentences ?? [];
  const nounOption = entry.noun ? 1 : 0;
  const total = nounOption + predicates.length + sentences.length;
  if (total === 0) return { leadIn, verdict: fallbackNoun };

  const pick = (hash(`${activityId}|${place}`) + dayIndex) % total;

  // An ALTERNATE always uses the noun frame when the sport has one: "Today is
  // also a good day to hoist the mainsail" does not parse, and the "also" is
  // what tells you this is the second answer rather than a new day.
  if (!isFirst && entry.noun) return { leadIn, verdict: `a ${entry.noun} day.` };

  if (nounOption && pick === 0) return { leadIn, verdict: `a ${entry.noun} day.` };
  const i = pick - nounOption;
  if (i < predicates.length) return { leadIn, verdict: predicates[i] };
  // A complete sentence carries its own subject, so the lead-in is dropped.
  return { verdict: sentences[i - predicates.length] };
}
