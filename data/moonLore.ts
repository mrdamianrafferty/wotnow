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

    // India
    { title: 'Shivratri Vigil', text: 'The new moon is sacred to Shiva; devotees keep night-long vigils and fasts.', culture: 'general', key: 'india-new-shivratri' },
    { title: 'Pitru Offering', text: 'Ancestral rites in India are performed on new moons, offering rice balls to departed souls.', culture: 'general', key: 'india-new-pitrupaksha' },
    { title: 'No Travel Day', text: 'Villagers often avoid setting out on long journeys during new moon, fearing misfortune.', culture: 'general', key: 'india-new-notravel' },
    { title: 'Seed Rest', text: 'Farmers refrain from sowing during new moon, calling it infertile ground-time.', culture: 'general', key: 'india-new-noplants' },
    { title: 'Hidden Goddess', text: 'Some say Lakshmi hides during the dark moon, so wealth must be guarded carefully.', culture: 'general', key: 'india-new-lakshmi' },

    // China
    { title: 'Ancestor Cleanse', text: 'New moon nights are for cleaning ancestral tablets and household altars to welcome new blessings.', culture: 'chinese', key: 'china-new-ancestor-cleanse' },
    { title: 'Seed Selection', text: 'Farmers mark the new moon as the time to select seeds for planting to ensure strong crops.', culture: 'chinese', key: 'china-new-seed-selection' },
    { title: 'Quiet Waters', text: 'Fishermen wait for the new moon to launch boats, believing the waters will be calm and bountiful.', culture: 'chinese', key: 'china-new-quiet-waters' },
    { title: 'Moon Meditation', text: 'Taoist monks use the new moon phase for meditation retreats focused on renewal and clarity.', culture: 'chinese', key: 'china-new-moon-meditation' },
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

    // India
    { title: 'Shubha Tithi', text: 'First crescent days are called favourable (shubha), good for new household tasks and minor rituals.', culture: 'general', key: 'india-crescent-shubha' },
    { title: 'Cow Calf Luck', text: 'Farmers bless calves born under waxing moons as strong and milk-rich.', culture: 'general', key: 'india-crescent-cows' },
    { title: 'Lantern Nights', text: 'Villages used to light tiny lamps when the crescent returned, greeting its growth.', culture: 'general', key: 'india-crescent-lamps' },
    { title: 'Scribal Moon', text: 'Accounts were traditionally opened when the new crescent grew, thought to bring gain.', culture: 'general', key: 'india-crescent-accounts' },

    // China
    { title: 'Silver Moon Tea', text: 'A tea ceremony celebrates the waxing crescent moon, symbolizing growth and harmony.', culture: 'chinese', key: 'china-crescent-tea' },
    { title: 'Sprouting Rice', text: 'Farmers watch the crescent moon for the best time to start rice sprouting.', culture: 'chinese', key: 'china-crescent-sprouting-rice' },
    { title: 'Lantern Blessings', text: 'Lanterns are lit early in the waxing crescent to bless the household with light and luck.', culture: 'chinese', key: 'china-crescent-lanterns' },
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

    // India
    { title: 'Field Turning', text: 'Tilling at the half-moon was thought to balance soil energies.', culture: 'general', key: 'india-quarter-tilling' },
    { title: 'Ayurvedic Baths', text: 'Bathing on the first quarter was said to soothe doshas and prepare body heat for the fortnight.', culture: 'general', key: 'india-quarter-baths' },
    { title: 'Village Fairs', text: 'Many village melas timed stalls at the half-moon, balancing trade and leisure.', culture: 'general', key: 'india-quarter-fair' },

    // China
    { title: 'Mid-Qing Ritual', text: 'Mid-quarter moon is a time for balancing yin and yang energies through quiet rituals.', culture: 'chinese', key: 'china-quarter-yinyang' },
    { title: 'Tilling Timing', text: 'The first quarter moon signals the ideal time to begin tilling for healthful soil.', culture: 'chinese', key: 'china-quarter-tilling' },
    { title: 'Ancestor Feast', text: 'Families hold modest feasts for ancestors, appreciating their guidance at the half-moon.', culture: 'chinese', key: 'china-quarter-ancestor-feast' },
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

    // India
    { title: 'Festival Build', text: 'Major Hindu festivals often see preparation days in the waxing gibbous period.', culture: 'general', key: 'india-gibbous-festivalprep' },
    { title: 'Elephant Feeding', text: 'In Kerala, elephants were fed special fodder during swelling moons to increase strength.', culture: 'general', key: 'india-gibbous-elephants' },
    { title: 'Bridal Moon', text: 'Astrologers recommended waxing gibbous phases for wedding ceremonies to ensure prosperity.', culture: 'general', key: 'india-gibbous-weddings' },
    { title: 'Rice Sprouts', text: 'Farmers believed transplanted rice tillers best under gibbous moons.', culture: 'general', key: 'india-gibbous-rice' },

    // China
    { title: 'Tea Harvest', text: 'Tea gardens prepare for harvest during waxing gibbous moon for best flavor.', culture: 'chinese', key: 'china-gibbous-tea-harvest' },
    { title: 'Silkworm Feeding', text: 'Silkworm farmers feed larvae under swelling moons to boost silk quality.', culture: 'chinese', key: 'china-gibbous-silkworm' },
    { title: 'Soup Brewing', text: 'Medicinal soups are brewed during the gibbous phase to absorb the moon’s nourishing energy.', culture: 'chinese', key: 'china-gibbous-soup' },
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

    // India
    { title: 'Guru Purnima', text: 'The full moon of July is celebrated to honour teachers and mentors.', culture: 'general', key: 'india-full-gurupurnima' },
    { title: 'Holi Moon', text: 'The colourful Holi festival is tied to the full moon of Phalguna month.', culture: 'general', key: 'india-full-holi' },
    { title: 'Buddha Purnima', text: 'The Buddha’s birth and enlightenment are marked on a May full moon.', culture: 'general', key: 'india-full-buddhapurnima' },
    { title: 'Sharad Beauty', text: 'The autumn harvest full moon is praised in poetry as “Sharad purnima,” when dew turns nectar-sweet.', culture: 'general', key: 'india-full-sharad' },
    { title: 'Ganga Rituals', text: 'Bathing in the Ganges on full moons is believed to cleanse sins fully.', culture: 'general', key: 'india-full-ganga' },

    // China
    { title: 'Full Moon Dance', text: 'Villages perform traditional dance and music to honor the full moon’s power.', culture: 'chinese', key: 'china-full-dance' },
    { title: 'Rice Blessing', text: 'Farmers offer first rice harvest gifts to the moon deity on mid-autumn.', culture: 'chinese', key: 'china-full-rice-blessing' },
    { title: 'Full Moon Meditation', text: 'Meditative practices intensify under the full moon to harness lunar energy.', culture: 'chinese', key: 'china-full-meditation' },
    { title: 'Lantern Release', text: 'Releasing lanterns into the sky symbolizes sending prayers to ancestors.', culture: 'chinese', key: 'china-full-lantern-release' },
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

    // India
    { title: 'Debt Clearing', text: 'Traders settle debts in waning bright days, lest growth turn to decline.', culture: 'general', key: 'india-gibbous-debts' },
    { title: 'Herbal Storage', text: 'Healers advised drying and storing herbs after the full moon’s peak light.', culture: 'general', key: 'india-gibbous-herbs' },
    { title: 'Children’s Games', text: 'Folklore says children should not play too much after full moon, lest spirits tire them.', culture: 'general', key: 'india-gibbous-children' },

    // China
    { title: 'Herb Drying', text: 'Medicinal herbs are harvested before waning gibbous to cure ailments.', culture: 'chinese', key: 'china-gibbous-herb-drying' },
    { title: 'Clay Pot Mending', text: 'Families mend clay pots to avoid breakage during waning phases.', culture: 'chinese', key: 'china-gibbous-pot-mending' },
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

    // India
    { title: 'Tulsi Pruning', text: 'Sacred basil plants (Tulsi) are trimmed at the waning half to prevent overgrowth.', culture: 'general', key: 'india-quarter-tulsi' },
    { title: 'Penance Time', text: 'Ascetics observed austerities during waning halves, when ego should diminish.', culture: 'general', key: 'india-quarter-penance' },

    // China
    { title: 'Luck Renewal', text: 'Cleaning at last quarter is believed to renew fortune and remove bad energy.', culture: 'chinese', key: 'china-quarter-luck-renewal' },
    { title: 'Quiet Reflection', text: 'Villagers take the last quarter moon for quiet thought and planning.', culture: 'chinese', key: 'china-quarter-reflection' },
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

    // India
    { title: 'Ancestor Thread', text: 'Tying sacred thread is avoided in waning crescents; life-rites wait for new moon or waxing return.', culture: 'general', key: 'india-crescent-thread' },
    { title: 'Spirits Walk', text: 'Villagers warn the thin waning crescent is when preta (unquiet souls) roam most strongly.', culture: 'general', key: 'india-crescent-preta' },
    { title: 'End-of-Month Sweep', text: 'Houses are broomed clean before the dark moon, to bring fresh fortune in.', culture: 'general', key: 'india-crescent-sweep' },
    { title: 'Moon Fasting', text: 'Women take crescent waning nights for light fasting, thought to purify ahead of renewal.', culture: 'general', key: 'india-crescent-fast' },

    // China
    { title: 'Soft Prayers', text: 'The fading crescent is a time for soft, silent prayers and soul rest.', culture: 'chinese', key: 'china-crescent-soft-prayers' },
    { title: 'Window Washing', text: 'Washing windows before the new moon is done to bring clarity and fresh fortune.', culture: 'chinese', key: 'china-crescent-window-washing' },
    { title: 'Sweep and Bless', text: 'Sweeping the house in waning crescent days clears past troubles before new beginnings.', culture: 'chinese', key: 'china-crescent-sweep-bless' },
  ],
};


// Deduplication and syntax cleanup complete. All moon phase arrays are now unique and valid.







// Deduplication and syntax cleanup complete. All moon phase arrays are now unique and valid.

export function getMoonLore(phase: MoonPhase): LoreItem[] {
  return moonLore[phase] || [];
}

export function getMoonLoreDistinct(phase: MoonPhase, options?: { used?: Set<string> }): { item: LoreItem | null; key: string } {
  const loreItems = getMoonLore(phase);
  if (loreItems.length === 0) {
    return { item: null, key: '' };
  }
  
  const used = options?.used || new Set();
  
  // Try to find an unused item
  for (let i = 0; i < loreItems.length; i++) {
    const item = loreItems[i];
    const key = `${phase}-${i}`;
    if (!used.has(key)) {
      return { item, key };
    }
  }
  
  // If all items have been used, return the first one
  return { item: loreItems[0], key: `${phase}-0` };
}