// data/moonLore.ts

export type MoonPhase =
  | 'new'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export type Culture =
  | 'general'
  | 'asturian'
  | 'irish'
  | 'native_american'
  | 'chinese'
  | 'african'
  | 'caribbean'
  | 'latin_american'
  | 'eastern_european'
  | 'japanese'
  | 'ainu';

export interface LoreItem {
  title: string;
  text: string;
  culture: Culture;
  // Optional unique key for de-dup across translations/edits
  key?: string;
}

export const moonLore: Record<MoonPhase, LoreItem[]> = {
  new: [
    { title: 'Beginnings', text: 'Folklore saw the new moon as the best time to sow seeds, both in the soil and in life.', culture: 'general' },
    { title: 'Lucky Glimpse', text: 'Spotting the new moon over your right shoulder was thought to bring fortune.', culture: 'general' },
    { title: 'Cider Time', text: 'Asturian farmers pruned apple trees after the new moon to strengthen the cider harvest.', culture: 'asturian' },
    { title: 'Hearth Moon', text: 'In Ireland, the new moon was invoked when kindling a new fire at the hearth.', culture: 'irish' },
    { title: 'Corn Planting Moon', text: 'Many Native American nations took the spring new moon as the sign to plant maize.', culture: 'native_american' },
    { title: 'Month Opener', text: 'In China, the new moon begins the lunar month and frames household rituals.', culture: 'chinese' },

    { title: 'Calabash Blessing', text: 'Across West Africa, the first sight of the new moon was greeted with blessings for full granaries and healthy children.', culture: 'african' },
    { title: 'New Nets', text: 'Caribbean fishers favoured mending or blessing nets at the new moon to “fill them with luck”.', culture: 'caribbean' },
    { title: 'Maté & Seeds', text: 'In parts of Latin America, gardeners start herb cuttings on the new moon for quick rooting.', culture: 'latin_american' },
    { title: 'Quiet Crossroads', text: 'Eastern European sayings call the new moon a time to pause at crossroads and choose “the right road”.', culture: 'eastern_european' },
    { title: 'First Bow', text: 'In Japan, the first sliver (mikazuki) is admired as a lucky sign for starting arts and studies.', culture: 'japanese' },
    { title: 'Bear’s Dreaming', text: 'Ainu stories link the dark new moon to the bear’s dreams before spring, a time to plan and prepare.', culture: 'ainu' },
  ],

  waxing_crescent: [
    { title: 'Growth Energy', text: 'The waxing crescent was linked with growth — projects, ambitions, and crops alike.', culture: 'general' },
    { title: 'Love Lore', text: 'On St. Agnes’ Eve, gazing at a waxing crescent was said to bring dreams of your true love.', culture: 'irish' },
    { title: 'Fishing Luck', text: 'Asturian fishermen said waxing moons meant rising tides and better catches.', culture: 'asturian' },
    { title: 'Hunting Signs', text: 'Some Native American traditions favoured setting traps as the moon’s light grew.', culture: 'native_american' },
    { title: 'Festival Prep', text: 'Chinese households often begin festival tasks under a growing moon.', culture: 'chinese' },

    { title: 'Milk & Moon', text: 'East African herders associate the young moon with swelling udders and increasing milk.', culture: 'african' },
    { title: 'Plantain Shoots', text: 'Caribbean gardeners plant quick-growing greens under a waxing moon for leafy abundance.', culture: 'caribbean' },
    { title: 'Silver of Hope', text: 'Latin American sayings call the crescent “una sonrisa del cielo” — a smile that grows with your efforts.', culture: 'latin_american' },
    { title: 'Bread to Rise', text: 'In Eastern Europe, dough mixed under a waxing moon was said to rise higher and bake lighter.', culture: 'eastern_european' },
    { title: 'Learning Curve', text: 'Japanese students pin revision schedules to the waxing moon for steady improvement.', culture: 'japanese' },
    { title: 'River Brightening', text: 'Ainu anglers watched the young moon for clearer river nights that favour salmon runs.', culture: 'ainu' },
  ],

  first_quarter: [
    { title: 'Balance Point', text: 'The half-lit moon symbolised balance between light and dark, decision and challenge.', culture: 'general' },
    { title: 'Farmer’s Quarter', text: 'Asturian peasants timed potato planting around first quarter for sturdy growth.', culture: 'asturian' },
    { title: 'Fair Weather Sign', text: 'Irish lore linked a sharp, clear half-moon with a spell of fair weather.', culture: 'irish' },
    { title: 'Deer Watching', text: 'Some Native American stories time deer courtship lore to half-moons in autumn.', culture: 'native_american' },
    { title: 'Family Balance', text: 'Chinese sayings take the half-moon as a sign to balance work and home.', culture: 'chinese' },

    { title: 'Market Day Moon', text: 'In parts of West Africa, a crisp half-moon was read as good fortune for market bargains.', culture: 'african' },
    { title: 'Windward Choice', text: 'Caribbean sailors weighed routes at the half-moon, seen as a time for clear decisions.', culture: 'caribbean' },
    { title: 'Cut the Vines', text: 'Latin American growers prune climbing plants at the first quarter to thicken stems.', culture: 'latin_american' },
    { title: 'Heal & Hold', text: 'Eastern European folk medicine marks the half-moon for binding poultices and steady healing.', culture: 'eastern_european' },
    { title: 'Archers’ Night', text: 'Samurai tales sometimes note practice at the half-moon, when light and shadow train the eye.', culture: 'japanese' },
    { title: 'Owl’s Lesson', text: 'Ainu tales say the half-moon is when owl spirits teach patience between dark and light.', culture: 'ainu' },
  ],

  waxing_gibbous: [
    { title: 'Refinement Time', text: 'The waxing gibbous was seen as the time to perfect what you’ve begun.', culture: 'general' },
    { title: 'Sea Restlessness', text: 'Asturian sailors warned that a swollen moon could bring unsettled swells.', culture: 'asturian' },
    { title: 'Churn the Butter', text: 'Irish farmhouse lore: churns “take” best as the moon fattens to full.', culture: 'irish' },
    { title: 'Green Corn Time', text: 'Native American calendars mark swelling moons as maize ripens on the stalk.', culture: 'native_american' },
    { title: 'Tend the Rows', text: 'Chinese almanacs encourage weeding and tending fields under the near-full moon.', culture: 'chinese' },

    { title: 'Drums & Dance', text: 'In many African villages, near-full moons invite evening drums and community rehearsal.', culture: 'african' },
    { title: 'Rum & Rhythm', text: 'Caribbean folklore pairs the swelling moon with music rehearsals before the full-moon fête.', culture: 'caribbean' },
    { title: 'Beans & Moon', text: 'Latin American gardeners say beans “fill their bellies” under the gibbous moon.', culture: 'latin_american' },
    { title: 'Pickles & Preserves', text: 'Eastern European kitchens prepare jars as the moon swells, for flavour to develop.', culture: 'eastern_european' },
    { title: 'Tea Whisk Practice', text: 'Japanese tea students refine whisking technique in calm, gibbous evenings.', culture: 'japanese' },
    { title: 'Net Mending', text: 'Ainu fishers mend nets before the bright full moon nights that draw fish shallow.', culture: 'ainu' },
  ],

  full: [
    { title: 'Moon Madness', text: 'The word “lunatic” comes from luna — full moons were said to stir madness and magic.', culture: 'general' },
    { title: 'Asturian Orchards', text: 'In Asturias, the full moon was believed to quicken growth in vines and orchards.', culture: 'asturian' },
    { title: 'Werewolf Tales', text: 'Irish and broader European lore brim with shapeshifter stories at the full moon.', culture: 'irish' },
    { title: 'Harvest Moon', text: 'Many Native American nations named full moons for seasonal markers like harvest and snow.', culture: 'native_american' },
    { title: 'Moon Festival', text: 'In China, the Mid-Autumn full moon celebrates reunion and shared cakes.', culture: 'chinese' },

    { title: 'Praise Songs', text: 'Across Africa, the full moon is a time for praise-singing and communal storytelling.', culture: 'african' },
    { title: 'Jonkanoo Glow', text: 'Caribbean carnivals and night parades often favour full-moon brightness.', culture: 'caribbean' },
    { title: 'Luna de Amor', text: 'Latin American lore ties full moons to serenades and courtship luck.', culture: 'latin_american' },
    { title: 'Wolf Nights', text: 'Eastern European folktales warn travellers to keep to roads on full-moon nights.', culture: 'eastern_european' },
    { title: 'Tsukimi', text: 'Japanese moon-viewing (tsukimi) honours the full moon with poetry and little dumplings.', culture: 'japanese' },
    { title: 'Kamuy Watch', text: 'Ainu tradition treats the full moon as a time when kamuy (spirits) are especially attentive.', culture: 'ainu' },
  ],

  waning_gibbous: [
    { title: 'Sharing & Gratitude', text: 'The waning gibbous marked a time to give thanks and share abundance.', culture: 'general' },
    { title: 'Sheep Lore', text: 'Asturian shepherds often sheared just after the full moon, in waning light.', culture: 'asturian' },
    { title: 'Luck Ebbs', text: 'Irish sayings warn that quick profits after full moon may ebb away.', culture: 'irish' },
    { title: 'Story Circles', text: 'Native American communities turn to stories and teaching as the moon begins to wane.', culture: 'native_american' },
    { title: 'Dry & Store', text: 'Chinese households dry herbs and store teas as the light recedes.', culture: 'chinese' },

    { title: 'Cool the Pots', text: 'African cooks say sauces mellow best when cooled under waning moon nights.', culture: 'african' },
    { title: 'Trim & Tidy', text: 'Caribbean homes take waning moons for clearing clutter after festivities.', culture: 'caribbean' },
    { title: 'Settle Debts', text: 'Latin American proverbs advise settling small debts as the moon wanes.', culture: 'latin_american' },
    { title: 'Quiet the House', text: 'Eastern European lore marks waning gibbous for quiet mending and home blessings.', culture: 'eastern_european' },
    { title: 'Ink & Reflection', text: 'Japanese calligraphers practise slower, meditative scripts under waning light.', culture: 'japanese' },
    { title: 'Game Trails', text: 'Ainu hunters note animals keep to shaded trails as nights grow darker.', culture: 'ainu' },
  ],

  last_quarter: [
    { title: 'Release Time', text: 'The last quarter is a time to let go of what no longer serves you.', culture: 'general' },
    { title: 'Hair Charm', text: 'Cutting hair at the waning half was said to slow its growth.', culture: 'irish' },
    { title: 'Fishing Pause', text: 'Asturian fishers often rested nets at last quarter, wary of poor returns.', culture: 'asturian' },
    { title: 'Healing Moon', text: 'Some Native American traditions favour healing rites at the waning half.', culture: 'native_american' },
    { title: 'Housekeeping Moon', text: 'Chinese sayings urge cleaning at last quarter to shoo out stale luck.', culture: 'chinese' },

    { title: 'Ash & Sweep', text: 'African households sweep out old ash under the waning half to invite new luck.', culture: 'african' },
    { title: 'Mend the Boat', text: 'Caribbean boatmen do hull checks and repairs when the moon is at half and falling.', culture: 'caribbean' },
    { title: 'Let Go, Travel Light', text: 'Latin American sayings pair the waning half with ending quarrels.', culture: 'latin_american' },
    { title: 'Unknot Charms', text: 'Eastern European folk magic “unknots” bindings and removes hexes at last quarter.', culture: 'eastern_european' },
    { title: 'Brush the Tatami', text: 'Japanese homes do a quiet tidy to clear minds at the waning half.', culture: 'japanese' },
    { title: 'Foxfire Watch', text: 'Ainu stories place foxfire sightings around the waning half, a sign to tread softly.', culture: 'ainu' },
  ],

  waning_crescent: [
    { title: 'Endings & Rest', text: 'The waning crescent marks reflection and endings before the cycle resets.', culture: 'general' },
    { title: 'Dark Moon Warning', text: 'Asturian fishers avoided the “dark of the moon”, expecting thin catches.', culture: 'asturian' },
    { title: 'Fairy Walks', text: 'Irish folklore says the dim crescent is when the Good People wander.', culture: 'irish' },
    { title: 'Storytime Moon', text: 'Native American elders told winter stories as the moon thinned to darkness.', culture: 'native_american' },
    { title: 'Ancestor Quiet', text: 'Chinese folk belief links the fading moon with honouring ancestors in silence.', culture: 'chinese' },

    { title: 'Dream-Travel', text: 'African tales speak of dream-journeys and counsel at the dark sliver of moon.', culture: 'african' },
    { title: 'Salt & Smoke', text: 'Caribbean kitchens smoke and salt foods at month’s end to start fresh.', culture: 'caribbean' },
    { title: 'Sweep to Threshold', text: 'Latin American homes sweep dust to the door before the new moon for a clean start.', culture: 'latin_american' },
    { title: 'Braid the Garlic', text: 'Eastern European kitchens braid garlic and hang it before the month turns.', culture: 'eastern_european' },
    { title: 'Kagenotsuki Calm', text: 'In Japan, the old moon (kagenotsuki) is a time to finish letters and close accounts.', culture: 'japanese' },
    { title: 'Quiet River', text: 'Ainu fishers say the river “keeps its secrets” in the thinnest moon — a time for rest.', culture: 'ainu' },
  ],
};

// --- Helpers ---------------------------------------------------------------

// Random item (with optional culture filter)
export function getMoonLore(phase: MoonPhase, culture?: Culture): LoreItem {
  const items = culture ? moonLore[phase].filter(i => i.culture === culture) : moonLore[phase];
  return items[Math.floor(Math.random() * items.length)];
}

// Non-repeating picker: pass in a Set of used keys/titles; it will try to avoid repeats.
// Returns the item plus the key it used so you can add it to your Set.
export function getMoonLoreDistinct(
  phase: MoonPhase,
  opts?: { culture?: Culture; used?: Set<string> }
): { item: LoreItem; key: string } {
  const used = opts?.used ?? new Set<string>();
  const pool = (opts?.culture ? moonLore[phase].filter(i => i.culture === opts.culture) : moonLore[phase]).map(i => ({
    ...i,
    _key: i.key ?? `${i.culture}:${i.title}`,
  }));
  // Try to find an unused item
  const unused = pool.filter(i => !used.has(i._key));
  const chosen = (unused.length ? unused : pool)[Math.floor(Math.random() * (unused.length ? unused.length : pool.length))];
  return { item: chosen, key: chosen._key };
}