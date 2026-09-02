/**
 * What a day is actually like for one activity, in a sentence.
 *
 * ─── The problem this replaces ───────────────────────────────────────────
 *
 * Every activity in the library — a hundred of them — shared four sentence
 * stems, picked by band and nothing else:
 *
 *     "Perfect conditions for {name}!"      "Good weather for {name}."
 *     "Fair conditions for {name}."         "Not ideal weather for {name},
 *                                            but still an option."
 *
 * To that, one clause could be appended from the wind table. Nothing else was
 * ever said: not rain, not temperature, not gust, not water temperature, not
 * season — even when one of those was the reason for the score. Surveyed across
 * the nine Anglian waters over seven days, a wind clause appeared on 37% of
 * entries; the other 63% carried the stem alone, which restates the badge
 * printed next to it and tells a reader nothing they cannot already see.
 *
 * So the ceiling was six distinct notes, on a third of days, and no amount of
 * rewriting those six raises it. The shortage was structural.
 *
 * ─── What changed ────────────────────────────────────────────────────────
 *
 * `scoreConditions` already worked out how well each individual criterion was
 * met and threw the answer away. It now returns the weakest one — the criterion
 * that actually held the day back — and this module writes from that. The
 * sentence can therefore say *why*, which is the one thing a static page cannot
 * do and the whole argument the Anglian demo is making.
 *
 * Copy is keyed on ACTIVITY FAMILY × CRITERION × DIRECTION rather than on band,
 * because too much wind means something different to a windsurfer, a
 * paddleboarder and a camper, and that difference is the product. Five families
 * cover everything the reservoirs offer.
 *
 * ─── Rules the old copy broke, all of them ───────────────────────────────
 *
 *   · Numbers are rounded. It printed "6.944444444444445 m/s".
 *   · Wind is Force and knots. Nobody at a sailing club thinks in m/s, and the
 *     demo settled this argument already (see RiseDaisy lib/demo/wind-format).
 *   · No tautologies. It said "wind creates use caution conditions".
 *   · No card labels in prose. It said "Good weather for Go Sailing (Inland)"
 *     and "Fair conditions for Walk the Dog" — those are button labels.
 *   · A dangerous day is not "still an option". It said, verbatim: "Not ideal
 *     weather for Go Camping, but still an option. 🚨 Dangerous". The engine had
 *     decided a gale was dangerous and the stem in front of it shrugged.
 *   · No emoji. They were decoration on a safety message.
 */

import type { CriterionScore, WeatherData } from './activitySuitability';

// ─────────────────────────────────────────────────────────────────────────
// Units the reader actually uses
// ─────────────────────────────────────────────────────────────────────────

/** Upper bounds of each Beaufort force in km/h. Force N is wind below BOUNDS[N]. */
const FORCE_BOUNDS_KMH = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

const FORCE_NAMES = [
  'calm', 'light air', 'light breeze', 'gentle breeze', 'moderate breeze',
  'fresh breeze', 'strong breeze', 'near gale', 'gale', 'severe gale',
  'storm', 'violent storm', 'hurricane',
];

export function forceFromMs(ms: number): number {
  const kmh = ms * 3.6;
  for (let i = 0; i < FORCE_BOUNDS_KMH.length; i++) if (kmh < FORCE_BOUNDS_KMH[i]) return i;
  return 12;
}

export function forceName(force: number): string {
  return FORCE_NAMES[Math.max(0, Math.min(12, force))];
}

/** "Force 5" — spelled out, never "F5". That abbreviation is ours, not the scale's. */
function force(ms: number): string {
  return `Force ${forceFromMs(ms)}`;
}

/** "Force 5, 18 knots" — for the one place per sentence that carries a number. */
function forceAndKnots(ms: number): string {
  const kn = Math.round(ms * 1.94384);
  return `Force ${forceFromMs(ms)}, ${kn} knot${kn === 1 ? '' : 's'}`;
}

function degrees(c: number): string {
  return `${Math.round(c)} °C`;
}

/** A bearing as a point of the compass. Nobody says "the wind is 247 degrees". */
const POINTS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
function compass(deg: number): string {
  return POINTS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}


/**
 * Rain described by what makes it matter, which is not always the millimetres.
 *
 * A day can be wet because a lot fell, or because a little fell for hours. The
 * second is the common British case and the total is a useless way to say it:
 * production printed "Not a day for stargazing. 0.0 mm of rain forecast." on a
 * night of continuous drizzle, because the hours drove the verdict and the
 * millimetres rounded to nothing.
 */
/** "in the morning", or null where the rain is spread across the day. */
function whenPhrase(window?: RainWindow): string | null {
  switch (window) {
    case 'overnight': return 'overnight';
    case 'morning': return 'in the morning';
    case 'afternoon': return 'in the afternoon';
    case 'evening': return 'in the evening';
    default: return null;
  }
}

/**
 * The rain, as a person would mention it.
 *
 * "Rain for 10 hours of it, 2.3 mm in total" is two numbers and no picture,
 * and it was the sentence for two quite different days: 4 September puts 91%
 * of its 12 mm before noon and is dry by lunchtime, 8 September smears 4 mm
 * across sixteen hours. Where the forecast knows which it is — see
 * `rainWindow` — the sentence says so, because "showers in the morning" is
 * something a reader can plan around and a millimetre total is not.
 *
 * Showers or rain is decided by RATE rather than by total: 0.5 mm/h is about
 * where drizzle becomes rain you would put a coat on for, and it is the same
 * boundary the wetness calculation uses.
 */
function rainPhrase(mm: number, w: WeatherData, longThreshold = 4, window?: RainWindow): string {
  const hours = typeof w.precipitationHours === 'number' ? Math.round(w.precipitationHours) : null;
  const when = whenPhrase(window);
  const rate = hours && hours > 0 ? mm / hours : null;
  const showery = rate !== null && rate < 0.5;

  if (when) {
    if (mm < 0.3) return `A little drizzle ${when}.`;
    return showery ? `Showers ${when}.` : `Rain ${when}.`;
  }

  /* No window worth naming: the rain really is spread, and duration is then
     the most useful thing that can be said about it. */
  if (hours !== null && hours >= 1 && mm < 0.5) {
    return `Spitting on and off for ${hours} hour${hours === 1 ? '' : 's'}.`;
  }
  if (hours !== null && hours >= longThreshold) {
    return showery
      ? `Showery on and off, ${hours} hours of it.`
      : `Rain most of the day, ${hours} hours of it.`;
  }
  return `${mm.toFixed(1)} mm of rain forecast.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Families
// ─────────────────────────────────────────────────────────────────────────

/**
 * What kind of thing an activity is, for the purpose of what weather means to it.
 *
 * `wind_powered` wants wind and stops when there is too much; `paddle` never
 * wants any; `immersion` is decided by water temperature and barely by anything
 * else; `land_endurance` treats wind as effort rather than hazard once traffic
 * is out of the picture; `stay_put` is about being comfortable in one place for
 * hours, which makes duration of rain and the overnight minimum matter more than
 * the afternoon.
 */
export type ActivityFamily =
  | 'wind_powered' | 'paddle' | 'immersion' | 'land_endurance' | 'stay_put' | 'other';

const FAMILY_BY_ID: Record<string, ActivityFamily> = {
  sailing: 'wind_powered', sailing_inland: 'wind_powered',
  windsurfing: 'wind_powered', windsurfing_inland: 'wind_powered',
  kitesurfing: 'wind_powered',

  kayaking: 'paddle', sea_kayaking: 'paddle', canoeing: 'paddle',
  stand_up_paddleboarding: 'paddle', sup_sea: 'paddle', rowing: 'paddle',

  wild_swimming: 'immersion', sea_swimming: 'immersion', swimming: 'immersion',
  snorkeling: 'immersion', scuba_diving: 'immersion',

  road_cycling: 'land_endurance', gravel_biking: 'land_endurance',
  mountain_biking: 'land_endurance', cycling: 'land_endurance',
  running: 'land_endurance', trail_running: 'land_endurance', hiking: 'land_endurance',

  camping: 'stay_put', birdwatching: 'stay_put', dog_walking: 'stay_put',
  /* Storm birding is `wind_powered` — not because anything is being sailed, but
     because the family decides what too LITTLE wind means, and here it means
     the same as it does to a windsurfer: nothing is happening, come back when
     it blows. Filed under stay_put it would have said "Strong breeze, Force 6"
     as though that were the problem. */
  birdwatching_passage: 'wind_powered',
  picnicking: 'stay_put', photography: 'stay_put', stargazing: 'stay_put',
  fly_fishing_freshwater: 'stay_put', coarse_fishing: 'stay_put',
};

export function familyFor(activityId: string): ActivityFamily {
  return FAMILY_BY_ID[activityId] ?? 'other';
}

// ─────────────────────────────────────────────────────────────────────────
// Naming an activity inside a sentence
// ─────────────────────────────────────────────────────────────────────────

/**
 * Activities whose card label will not survive being dropped into prose.
 *
 * A label is an instruction — "Walk the Dog", "Go Sailing (Inland)" — and
 * instructions do not follow "a good day for". The engine was writing "Good
 * weather for Go Sailing (Inland)." and "Fair conditions for Walk the Dog."
 * straight onto the page.
 *
 * Only the awkward ones are listed; `phraseFor` derives the rest, which is why
 * this map is short and stays short. The parenthetical qualifier goes too: it
 * distinguishes two models in our catalogue and means nothing to a reader who
 * is standing next to a reservoir.
 */
const PHRASE_OVERRIDES: Record<string, string> = {
  dog_walking: 'walking the dog',
  birdwatching_passage: 'storm birding',
  stand_up_paddleboarding: 'paddleboarding',
  wild_swimming: 'swimming',
  sea_swimming: 'sea swimming',
  road_cycling: 'cycling',
  bbq: 'a barbecue',
  picnicking: 'a picnic',
  outdoor_reading: 'reading outside',
  camping: 'camping',
  /**
   * Names whose verb cannot simply be stripped.
   *
   * The strip below removes a leading instruction verb, which works while the
   * remainder is a noun — "Play Golf" -> "golf". It fails where the verb is
   * load-bearing ("Meditate Outdoors" -> "meditate outdoors") or where what is
   * left is a preposition ("Go to the Beach" -> "to the beach"), and the card
   * then read "A good day for to the beach". Seven of them, written out.
   */
  archery: 'archery',
  beach: 'a day at the beach',
  outdoor_playground: 'the playground',
  outdoor_gym: 'the outdoor gym',
  outdoor_meditation: 'meditating outdoors',
  outdoor_yoga: 'yoga in the park',
  outdoor_painting: 'painting outdoors',
};

export function phraseFor(activityId: string, name?: string): string {
  const override = PHRASE_OVERRIDES[activityId];
  if (override) return override;
  if (!name) return activityId.replace(/_/g, ' ');
  /* The library names activities as instructions, and not all of them start
     with "Go": "Play Golf", "Do Some Gardening", "Watch for Storm-Driven
     Birds". Stripping only "Go " produced "a good day for play golf" and "not a
     day for do some gardening". */
  return name
    .replace(/^(?:Go|Play|Watch(?: for)?|Make|Take|Have|Try|Do Some)\s+/i, '')
    .replace(/\s*\((?:Inland|Coastal)\)\s*$/i, '')
    .trim()
    .toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────
// Which way a criterion was missed
// ─────────────────────────────────────────────────────────────────────────

type Direction = 'low' | 'high' | 'marginal';

/**
 * Whether the value sat below the criterion's range, above it, or inside it but
 * badly placed.
 *
 * Read off every number in the condition string rather than by re-parsing its
 * grammar, because the strings take several shapes — `windSpeed=4..16`,
 * `windSpeed<8`, `temperature=5..10 or 24..28` — and the only thing needed here
 * is which side of the wanted values the day fell on. `marginal` means it was
 * within the stated bounds and still scored badly, which happens near an edge.
 */
function directionOf(condition: string, value: number): Direction {
  const nums = (condition.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (!nums.length) return 'marginal';
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  if (value < lo) return 'low';
  if (value > hi) return 'high';
  return 'marginal';
}

// ─────────────────────────────────────────────────────────────────────────
// The copy
// ─────────────────────────────────────────────────────────────────────────

/* The rain window rides as a third argument rather than on the weather, for
   the reason given on SuitabilityWeather's index signature: everything the
   scorer reads is a number, and this is a word. */
type Phrasing = (v: number, w: WeatherData, window?: RainWindow) => string | null;

/**
 * Reason clauses, by criterion and direction, with family overrides.
 *
 * `DEFAULTS` is what any activity says. A family entry replaces it where the
 * same weather means something different — a light wind is a problem for a
 * windsurfer and the best thing that can happen to a paddleboarder, and those
 * two tiles sitting side by side saying opposite things about one number is the
 * demo working.
 */
const DEFAULTS: Record<string, Partial<Record<Direction, Phrasing>>> = {
  windSpeed: {
    high: (v) => `Windier than it wants — ${forceAndKnots(v)}.`,
    low: (v) => `Very little wind — ${force(v)}.`,
  },
  gust: {
    high: (v, w) => typeof w.windSpeed === 'number'
      ? `${force(w.windSpeed)}, but gusting ${force(v)} — it is the spread that catches you out, not the average.`
      : `Gusting ${forceAndKnots(v)}.`,
  },
  temperature: {
    low: (v) => `Cold for it — ${degrees(v)}.`,
    high: (v) => `Hot for it — ${degrees(v)}.`,
  },
  airTemperature: {
    low: (v) => `Cold for it — ${degrees(v)}.`,
    high: (v) => `Hot for it — ${degrees(v)}.`,
  },
  temperatureMin: {
    low: (v) => `Down to ${degrees(v)} overnight.`,
  },
  waterTemperature: {
    low: (v) => `Water around ${degrees(v)}.`,
    high: (v) => `Water up at ${degrees(v)}.`,
  },
  precipitation: {
    high: (v, w, win) => rainPhrase(v, w, 1, win),
  },
  visibility: {
    /* Three registers, because a kilometre and eight are different problems:
       one stops the activity, the other spoils it. */
    low: (v) => {
      if (v < 1) return 'Fog — under a kilometre of visibility.';
      if (v < 4) return `Murky, ${Math.round(v)} km at best.`;
      return `Hazy — visibility around ${Math.round(v)} km.`;
    },
  },
  waveHeight: {
    high: (v) => `A ${v.toFixed(1)} m sea running.`,
  },
  humidity: {
    high: (v) => `Humid at ${Math.round(v)}%.`,
  },
  windDirection: {
    low: (v) => `Wind out of the ${compass(v)}.`,
    high: (v) => `Wind out of the ${compass(v)}.`,
    marginal: (v) => `Wind out of the ${compass(v)}.`,
  },
  /* Both spellings, because the library uses both and a table keyed on only
     one leaves the other silent. `clouds>50` on stargazing had no words at all,
     so the cloud that vetoed the night went unmentioned and the sentence
     blamed the breeze. */
  cloudCover: {
    high: () => 'Overcast throughout.',
    low: () => 'Clear and bright, with no cover from it.',
  },
  clouds: {
    high: (v) => `Overcast — ${Math.round(v)}% cloud.`,
    low: () => 'Clear and bright, with no cover from it.',
  },
  soilMoisture: {
    high: () => 'The ground will be heavy underfoot.',
    low: () => 'The ground is baked hard.',
  },
  snowDepthCm: { high: (v) => `${Math.round(v)} cm of lying snow.` },
  snowfallRateMmH: { high: () => 'Snow falling.' },
};

/**
 * Copy for a single activity, where its family's voice is close but not right.
 *
 * Consulted before the family table. Kept deliberately small: an entry here is
 * a claim that this activity is unlike everything it is grouped with, and the
 * families exist so that claim is rarely true.
 */
const BY_ACTIVITY: Record<string, Record<string, Partial<Record<Direction, Phrasing>>>> = {
  stargazing: {
    /* Cloud is not a comfort question here, it is the entire question. */
    clouds: {
      high: (v) => v >= 80
        ? 'Cloud right over — there will be nothing to see.'
        : `Too much cloud for it — about ${Math.round(v)}% of the sky.`,
    },
    precipitation: { high: () => 'Rain, which settles it.' },
  },

  /**
   * Walking the dog is filed under `stay_put` because the wind and the
   * overnight minimum matter to it the way they matter to birdwatching. The
   * rain does not: that family's line is "a long time to sit in it", written
   * for a person in one place for hours, and nobody sits down to walk a dog.
   *
   * It also has the one thing none of the others have — a companion who is
   * enjoying it. Go Daisy's own copy has said so for years ("The dog will
   * enjoy it much more than you today"); it simply never reached this module.
   */
  dog_walking: {
    precipitation: {
      high: (v, w, win) => {
        const when = whenPhrase(win);
        /* Where the forecast knows when, that beats a duration: "showers in the
           morning" tells somebody which walk to take, "on and off for 9 hours"
           tells them only that today is a wash. */
        if (when) {
          return v < 0.5
            ? `A little drizzle ${when} — nothing a dog will notice.`
            : `Showers ${when} — the dog will enjoy it more than you will.`;
        }
        const h = typeof w.precipitationHours === 'number' ? Math.round(w.precipitationHours) : null;
        if (h !== null && h >= 6) {
          return v < 0.5
            ? `Drizzling on and off for ${h} hours — the dog will mind it less than you will.`
            : `Rain on and off for ${h} hours — the dog will enjoy it more than you will.`;
        }
        return v < 0.5 ? 'Spitting a bit — nothing a dog will notice.' : rainPhrase(v, w, 4, win);
      },
    },
  },

  birdwatching_passage: {
    windSpeed: {
      low: (v) => forceFromMs(v) <= 3
        ? `Nothing like enough wind to displace anything — ${force(v)}. Ordinary birding weather.`
        : `${force(v)} and steady. Worth a look, but nothing is being blown inland.`,
      high: (v) => `${forceAndKnots(v)} — as much as anyone would want to stand out in.`,
    },
    windDirection: {
      low: () => 'Wind is off the land rather than the Atlantic, which is the wrong half of the compass for this.',
      high: () => 'Wind is off the land rather than the Atlantic, which is the wrong half of the compass for this.',
      marginal: () => 'Direction is only half right — worth an hour rather than an afternoon.',
    },
    precipitation: {
      low: () => 'Dry, which is the one thing missing: rain in the wind is what puts them down on the water.',
    },
  },
};

const BY_FAMILY: Partial<Record<ActivityFamily, Record<string, Partial<Record<Direction, Phrasing>>>>> = {
  wind_powered: {
    windSpeed: {
      /**
       * Three different things, and the old copy called them all the same.
       *
       * A flat calm is nothing at all. Force 1 is drifting. Force 2 is a real
       * lesson — these are tuition centres, and a beginner learning to uphaul or
       * hold a course wants exactly the wind an experienced sailor calls dull.
       * Telling all three "not enough wind" writes off the days a first-timer
       * should be booking.
       */
      low: (v) => {
        const f = forceFromMs(v);
        if (f === 0) return 'Flat calm — there is nothing to work with.';
        if (f <= 1) return `Barely moving — ${forceAndKnots(v)}. Not enough to get out and back.`;
        return `Light — ${forceAndKnots(v)}. Fine for a lesson, not much more.`;
      },
      high: (v) => `Too much wind for it — ${forceAndKnots(v)}.`,
      marginal: (v) => `Marginal at ${force(v)}.`,
    },
    temperature: { low: (v) => `Cold on the water — ${degrees(v)}.` },
    airTemperature: { low: (v) => `Cold on the water — ${degrees(v)}.` },
  },
  paddle: {
    windSpeed: {
      high: (v) => `More wind than a paddle can hold against — ${forceAndKnots(v)}.`,
      marginal: (v) => `Getting up: ${force(v)}.`,
    },
    gust: {
      /* "Settled enough on the mean" was statistics, not English — `mean` is a
         word from the model, and a reader on a bank has no reason to know the
         sentence is comparing two wind figures. The point survives without it:
         it is the gusts, not the wind. The DEFAULTS gust clause above lost the
         same word for the same reason — "Force 4, but gusting Force 7" says
         both figures and needs no term of art to join them. */
      high: (v, w) => typeof w.windSpeed === 'number'
        ? `It is the gusts rather than the wind — ${force(v)} at times.`
        : `Gusting ${force(v)}.`,
    },
  },
  immersion: {
    waterTemperature: {
      /* The threshold that matters. Below 15 °C is cold water; below 10 °C is
         where cold-water shock and swim failure dominate open-water incidents,
         and the sentence says so rather than grading it out of a hundred. */
      low: (v) => v < 10
        ? `Water around ${degrees(v)} — cold-water shock territory, for acclimatised swimmers in company and not for long.`
        : `Water around ${degrees(v)} — cold enough to shorten a swim.`,
    },
    airTemperature: {
      low: (v) => `${degrees(v)} out of the water, which is the part that catches people — getting warm again is slower than it feels.`,
    },
    windSpeed: {
      high: (v) => `Chop on the water and wind chill on the way out — ${force(v)}.`,
    },
  },
  land_endurance: {
    windSpeed: {
      high: (v) => `Hard work into a ${forceName(forceFromMs(v))} — ${forceAndKnots(v)}.`,
    },
    precipitation: {
      high: (v, w, win) => {
        /* On the move, the useful question is whether you can go round it —
           so when the forecast knows the rain has a window, say it, and say
           what is on either side of it. */
        const when = whenPhrase(win);
        if (when) {
          if (v < 0.3) return `A little drizzle ${when}.`;
          return v < 0.5 * Math.max(1, w.precipitationHours ?? 1)
            ? `Showers ${when}.`
            : `Rain ${when}.`;
        }
        const h = typeof w.precipitationHours === 'number' ? Math.round(w.precipitationHours) : null;
        if (h !== null && h >= 1 && v < 0.5) return `Drizzling on and off for ${h} hour${h === 1 ? '' : 's'}.`;
        if (h !== null && h >= 4) return `Wet for ${h} hours of it.`;
        return `${v.toFixed(1)} mm of rain about.`;
      },
    },
  },
  stay_put: {
    windSpeed: {
      high: (v) => `${forceName(forceFromMs(v)).replace(/^./, (c) => c.toUpperCase())} — ${force(v)}.`,
    },
    precipitation: {
      high: (v, w, win) => {
        const when = whenPhrase(win);
        if (when) {
          return v < 0.5
            ? `A little drizzle ${when}.`
            : `Showers ${when} — a while to sit out.`;
        }
        const h = typeof w.precipitationHours === 'number' ? Math.round(w.precipitationHours) : null;
        if (h !== null && h >= 6) {
          return v < 0.5
            ? `Drizzling on and off for ${h} hours — a long time to sit in it.`
            : `Rain on and off for ${h} hours — a long time to sit in it.`;
        }
        return rainPhrase(v, w, 4, win);
      },
    },
  },
};

/**
 * The reason clause for one criterion, or null when nothing sensible can be said.
 *
 * Null rather than a filler sentence, deliberately. A criterion this module has
 * no words for should cost a shorter line, never an invented one — the same rule
 * the demo's own note classifier already follows.
 */
function clauseFor(
  activityId: string,
  family: ActivityFamily,
  criterion: CriterionScore,
  weather: WeatherData,
  window?: RainWindow,
): string | null {
  if (typeof criterion.value !== 'number') return null;
  /* An explicit direction beats one inferred from the numbers — see
     CriterionScore.direction. */
  const dir = criterion.direction ?? directionOf(criterion.condition, criterion.value);
  const table = BY_ACTIVITY[activityId]?.[criterion.key]
    ?? BY_FAMILY[family]?.[criterion.key]
    ?? DEFAULTS[criterion.key];
  const phrase = table?.[dir] ?? DEFAULTS[criterion.key]?.[dir];
  return phrase ? phrase(criterion.value, weather, window) : null;
}

// ─────────────────────────────────────────────────────────────────────────
// The verdict
// ─────────────────────────────────────────────────────────────────────────

type Band = 'perfect' | 'good' | 'fair' | 'poor';

function bandOf(score: number): Band {
  if (score >= 90) return 'perfect';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * The verdict, in the activity's own idiom where it has one.
 *
 * One stem for everything read as a template on a board that shows eight cards
 * at once: "A good day for sailing." beside "A good day for windsurfing."
 * beside "A good day for kayaking." — three tiles, one sentence, and the
 * repetition made the whole shelf look generated rather than considered.
 *
 * Note that a FAMILY table cannot fix this on its own, because the two tiles
 * that sat next to each other and read identically — sailing and windsurfing —
 * are the same family. So the things people compare side by side get their own
 * wording, and the family table catches everything else.
 *
 * Deterministic, and hand-written. There is no rotation and no hashing: the
 * same activity says the same thing every day, because a sentence that changes
 * on its own is a sentence a reader cannot trust twice.
 */
const VERDICT_BY_ACTIVITY: Record<string, Partial<Record<Band, string>>> = {
  sailing_inland: {
    perfect: 'A fine day to be under sail.',
    good: 'A good day to be under sail.',
    fair: 'Sailable, with something to work around.',
    poor: 'Not a day to take a boat out.',
  },
  sailing: {
    perfect: 'A fine day to be under sail.',
    good: 'A good day to be under sail.',
    fair: 'Sailable, with something to work around.',
    poor: 'Not a day to take a boat out.',
  },
  windsurfing_inland: {
    perfect: 'About the best a board gets here.',
    good: 'Conditions are good for windsurfing.',
    fair: 'Rideable, but you will work for it.',
    poor: 'Not a day for the board.',
  },
  windsurfing: {
    perfect: 'About the best a board gets here.',
    good: 'Conditions are good for windsurfing.',
    fair: 'Rideable, but you will work for it.',
    poor: 'Not a day for the board.',
  },
  stand_up_paddleboarding: {
    perfect: 'Glassy — ideal paddling.',
    good: 'Good paddling weather.',
    fair: 'Paddleable if you pick your bank.',
    poor: 'Not a day to be stood up on a board.',
  },
  kayaking: {
    perfect: 'About as good as the water gets for a kayak.',
    good: 'A good day on the water.',
    fair: 'Paddleable, with something to watch.',
    poor: 'Not a day for the kayak.',
  },
  canoeing: {
    perfect: 'About as good as the water gets for a canoe.',
    good: 'A good day on the water.',
    fair: 'Paddleable, with something to watch.',
    poor: 'Not a day for the canoe.',
  },
  wild_swimming: {
    perfect: 'Ideal for a swim.',
    good: 'Good swimming weather.',
    fair: 'Swimmable, but check the water first.',
    poor: 'Not a day to get in.',
  },
  road_cycling: {
    perfect: 'Ideal on the road.',
    good: 'Good going on the bike.',
    fair: 'Rideable, with something against you.',
    poor: 'Not a day for the road bike.',
  },
  cycling: {
    perfect: 'Ideal riding.',
    good: 'Good going on the bike.',
    fair: 'Rideable, with something against you.',
    poor: 'Not a day for the bike.',
  },
  dog_walking: {
    perfect: 'Ideal for a long one with the dog.',
    good: 'A good day for a walk with the dog.',
    fair: 'Fine for a shorter walk.',
    poor: 'One for a quick loop round the block.',
  },
  birdwatching: {
    perfect: 'Ideal watching conditions.',
    good: 'Good watching weather.',
    fair: 'Workable, if you can find shelter.',
    poor: 'Not a day for the binoculars.',
  },
  hiking: {
    perfect: 'Ideal walking weather.',
    good: 'Good walking weather.',
    fair: 'Walkable, with something to put up with.',
    poor: 'Not a day for the hills.',
  },
  fly_fishing_freshwater: {
    perfect: 'About as good as the fishing gets.',
    good: 'A good day to be on the water.',
    fair: 'Fishable, with something against you.',
    poor: 'Not a day for the fly rod.',
  },
  coarse_fishing: {
    perfect: 'About as good as the fishing gets.',
    good: 'A good day on the bank.',
    fair: 'Fishable, with something against you.',
    poor: 'Not a day on the bank.',
  },
};

/** Everything without its own idiom, varied by what kind of thing it is. */
const VERDICT_BY_FAMILY: Partial<Record<ActivityFamily, Partial<Record<Band, (phrase: string) => string>>>> = {
  wind_powered: { good: (p) => `Conditions are good for ${p}.` },
  paddle: { good: (p) => `A good day on the water for ${p}.` },
  immersion: { good: (p) => `Good conditions for ${p}.` },
  land_endurance: { good: (p) => `Good going for ${p}.` },
  stay_put: { good: (p) => `A good day to be out for ${p}.` },
};

const VERDICT: Record<Band, (phrase: string) => string> = {
  perfect: (p) => `About as good as it gets for ${p}.`,
  good: (p) => `A good day for ${p}.`,
  fair: (p) => `Workable for ${p}.`,
  /* Not "but still an option". That stem was being printed in front of the
     engine's own word "Dangerous". */
  poor: (p) => `Not a day for ${p}.`,
};

/** The activity's own wording, then its family's, then the generic stem. */
function verdictFor(activityId: string, family: ActivityFamily, band: Band, phrase: string): string {
  return VERDICT_BY_ACTIVITY[activityId]?.[band]
    ?? VERDICT_BY_FAMILY[family]?.[band]?.(phrase)
    ?? VERDICT[band](phrase);
}

/** Said instead of a verdict when a hazard fired hard enough to stop the scoring. */
function vetoVerdict(phrase: string, family: ActivityFamily): string {
  if (family === 'wind_powered' || family === 'paddle' || family === 'immersion') {
    return `Not safe for ${phrase} today.`;
  }
  return `Not a day for ${phrase}.`;
}

/**
 * A plain statement of what the day is doing, used when nothing is holding the
 * activity back.
 *
 * This is what fills the two-thirds of days that previously carried the stem
 * alone. It says less than a reason clause, because there is less to say, but it
 * is always true and always specific — which the restatement of the badge it
 * replaces was neither.
 */
/**
 * The keys `conditionsLine` already reports, and which a caveat must not repeat.
 *
 * Module scope rather than rebuilt per call: it is a constant, it is read on
 * every sentence the library writes, and having it next to the function whose
 * output it describes is how it stays true when that output changes.
 */
const COVERED_BY_CONDITIONS = new Set(['windSpeed', 'gust', 'temperature', 'airTemperature']);

function conditionsLine(w: WeatherData): string | null {
  const bits: string[] = [];
  if (typeof w.windSpeed === 'number') {
    const f = forceFromMs(w.windSpeed);
    bits.push(f === 0 ? 'Flat calm' : `${forceName(f).replace(/^./, (c) => c.toUpperCase())}, ${force(w.windSpeed)}`);
    /**
     * The gust, whenever it is a different force from the mean.
     *
     * This line quoted the mean and nothing else, which made two tiles on the
     * same shelf contradict each other: kayaking read "Gentle breeze, Force 3,
     * 17 °C" beside canoeing reading "Not safe for canoeing today ... Force 6
     * at times" — the same wind, one tile describing the average and the other
     * the peak, with no way for a reader to see they were the same weather.
     *
     * A good day with a big spread is still a good day. It is not a gentle
     * one, and saying only the gentle half of it is what made the shelf look
     * like it was disagreeing with itself.
     */
    if (typeof w.gust === 'number' && forceFromMs(w.gust) > f) {
      bits.push(`gusting ${force(w.gust)}`);
    }
  }
  const t = w.temperature ?? w.airTemperature;
  if (typeof t === 'number') bits.push(degrees(t));
  if (!bits.length) return null;
  return `${bits.join(', ')}.`;
}

// ─────────────────────────────────────────────────────────────────────────
// Public
// ─────────────────────────────────────────────────────────────────────────

export type RainWindow = 'overnight' | 'morning' | 'afternoon' | 'evening' | 'spread';

export interface ReasonInput {
  activityId: string;
  /**
   * When the rain falls, where the forecast publishes it hour by hour.
   *
   * Carried beside the weather rather than inside it, because everything the
   * scorer reads is a number and this is a word — see the index signature on
   * SuitabilityWeather.
   */
  rainWindow?: RainWindow;
  /** How the activity is named inside a sentence — "sailing", "walking the dog". */
  phrase: string;
  score: number;
  weather: WeatherData;
  /** The weakest criterion in the band that decided the score. */
  binding?: CriterionScore;
  /** The hazard that fired, when one did. */
  vetoed?: boolean;
  outOfSeason?: boolean;
}

/**
 * One or two sentences: the verdict, then why.
 *
 * The reason clause is only appended when the binding criterion actually scored
 * badly. On a day where nothing is limiting, appending "the wind is marginal"
 * because it happened to be the weakest of several good criteria would
 * contradict the verdict beside it — which is exactly the failure the old copy
 * had, where a day scored 29 carried "Optimal wind for this activity".
 */
export function describeConditions(input: ReasonInput): string {
  const { phrase, score, weather, binding, vetoed, outOfSeason } = input;
  const family = familyFor(input.activityId);
  const band = bandOf(score);

  const parts: string[] = [vetoed ? vetoVerdict(phrase, family) : verdictFor(input.activityId, family, band, phrase)];

  /**
   * The limiting clause is only for days that are actually limited.
   *
   * On a perfect or good day the binding criterion is merely the weakest of
   * several that all passed, and saying so contradicts the verdict in front of
   * it — measured, this produced "A good day for windsurfing. Not enough wind to
   * work with." The clause register is written in absolutes because that is the
   * right voice for a day that is genuinely constrained, and the wrong one for
   * a day that merely has a softest link. Good days get the plain conditions
   * line instead, which is still specific and cannot disagree with itself.
   */
  const constrained = band !== 'perfect' && band !== 'good';
  /**
   * `decisive` says WHICH criterion decided the day. It does not say the day
   * was a bad one, and it must not be allowed to turn a good verdict into a
   * complaint.
   *
   * Adding it to this test made rain the whole of the sentence on days that
   * scored well: "A good day for sailing. Rain for 9 hours of it, 2.7 mm in
   * total." — a reader is told it is a good day and then told the one thing
   * about it that is not good, and nothing at all about the wind that made it
   * good. On a constrained day naming the limit is the point; on a good day it
   * is a caveat, and it goes after the conditions rather than instead of them.
   */
  const limited = vetoed
    || (constrained && !!binding && (binding.decisive || binding.score < 0.6));
  const reason = limited && binding ? clauseFor(input.activityId, family, binding, weather, input.rainWindow) : null;

  if (reason) parts.push(reason);
  else {
    /* What the day IS — the answer to "why is this good?", which the verdict
       alone never gave. */
    const line = conditionsLine(weather);
    if (line) parts.push(line);
    /**
     * And then the one thing worth knowing in spite of it — provided the line
     * above has not just said it.
     *
     * `conditionsLine` now carries the gust, so a gust caveat behind it read:
     *
     *   Gentle breeze, Force 3, gusting Force 6, 18 °C. Force 3, but gusting
     *   Force 6 — it is the spread that catches you out.
     *
     * The same figure twice in two registers. A caveat earns its sentence by
     * adding something; rain is not in the conditions line and still does.
     */
    if (!constrained && binding?.decisive && !COVERED_BY_CONDITIONS.has(binding.key)) {
      const caveat = clauseFor(input.activityId, family, binding, weather, input.rainWindow);
      if (caveat) parts.push(caveat);
    }
  }

  /* Season last, because it is a different kind of fact from the weather — it
     does not describe the day, it says the day is beside the point. */
  if (outOfSeason) parts.push('Out of season for it, whatever the weather does.');

  return parts.join(' ');
}
