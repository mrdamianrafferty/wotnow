
export type ActivityTemplates = Record<'perfect' | 'good' | 'fair' | 'poor', string>;
export type ActivityMessageConfig = {
  templates: ActivityTemplates;
  omitReasons?: string[];
};

export type CategoryDefaults = {
  [category: string]: ActivityMessageConfig;
};


// Helper to create templates
const makeTemplates = (perfect: string, good: string, fair: string, poor: string): ActivityTemplates => ({ perfect, good, fair, poor });

export const categoryDefaults: CategoryDefaults = {
  'Active Sports': {
    templates: makeTemplates(
      "Perfect conditions for getting active—ideal weather for sports and movement. {reasons}",
      "Good conditions for an active session—grab your gear and get moving. {reasons}",
      "Conditions are decent enough for some activity—time to get the blood pumping. {reasons}",
      "Weather's not cooperating for outdoor sports today—maybe try an indoor alternative. {reasons}"
    )
  },
  'Water Sports': {
    templates: makeTemplates(
      "Prime water conditions—perfect day to make a splash. {reasons}",
      "Good conditions on the water—time to get wet and have some fun. {reasons}",
      "Water conditions are adequate—manageable for a session if you're keen. {reasons}",
      "Water conditions aren't ideal today—best to stay dry and wait for better conditions. {reasons}"
    )
  },
  'Winter Sports': {
    templates: makeTemplates(
      "Winter paradise—ideal conditions for snow and ice sports. {reasons}",
      "Solid winter conditions—great weather for cold-weather activities. {reasons}",
      "Conditions are decent for winter sports—bundle up and enjoy. {reasons}",
      "Winter conditions aren't right today—maybe warm up indoors instead. {reasons}"
    )
  },
  'Team Sports': {
    templates: makeTemplates(
      "Perfect team sport weather—ideal conditions to play with mates. {reasons}",
      "Good conditions for team sports—gather the squad and get playing. {reasons}",
      "Conditions are playable—not perfect but still worth a game. {reasons}",
      "Weather's not cooperating for team sports—maybe practice indoors or watch the highlights. {reasons}"
    )
  },
  'Outdoor Activities': {
    templates: makeTemplates(
      "Beautiful day to be outside—perfect conditions for outdoor adventures. {reasons}",
      "Great weather for outdoor activities—time to step outside and explore. {reasons}",
      "Conditions are decent for outdoor pursuits—worth venturing out. {reasons}",
      "Weather's not ideal for outdoor activities—maybe find something cozy indoors. {reasons}"
    )
  },
  'Fitness & Wellness': {
    templates: makeTemplates(
      "Ideal conditions for wellness activities—perfect weather to focus on your health. {reasons}",
      "Good conditions for fitness and wellness—time to prioritize your well-being. {reasons}",
      "Conditions are manageable for wellness activities—still worth getting some movement in. {reasons}",
      "Weather might impact your wellness routine—consider indoor alternatives. {reasons}"
    )
  },
  'Indoor Sports': {
    templates: makeTemplates(
      "Perfect day for indoor sports—enjoy the climate-controlled comfort. {reasons}",
      "Good conditions for indoor activities—great weather to stay active inside. {reasons}",
      "Decent weather for indoor sports—reliable conditions regardless of what's outside. {reasons}",
      "Indoor sports are your best bet today—weather's not cooperating outdoors. {reasons}"
    )
  }
};

// Activity to category mapping for message fallbacks
export const activityCategories: { [activityId: string]: string } = {
  // Active Sports
  'running': 'Active Sports',
  'trail_running': 'Active Sports',
  'cycling': 'Active Sports',
  'road_cycling': 'Active Sports',
  'gravel_biking': 'Active Sports',
  'mountain_biking': 'Active Sports',
  'hiking': 'Active Sports',
  'rock_climbing': 'Active Sports',
  'skateboarding': 'Active Sports',
  'rollerblading': 'Active Sports',
  'orienteering': 'Active Sports',
  'archery': 'Active Sports',
  'riding_motorbike': 'Active Sports',
  
  // Water Sports
  'surfing': 'Water Sports',
  'sailing': 'Water Sports',
  'sailing_inland': 'Water Sports',
  'kayaking': 'Water Sports',
  'sea_kayaking': 'Water Sports',
  'canoeing': 'Water Sports',
  'stand_up_paddleboarding': 'Water Sports',
  'sup_sea': 'Water Sports',
  'scuba_diving': 'Water Sports',
  'snorkeling': 'Water Sports',
  'snorkelling': 'Water Sports',
  'sea_swimming': 'Water Sports',
  'wild_swimming': 'Water Sports',
  'windsurfing': 'Water Sports',
  'windsurfing_inland': 'Water Sports',
  'kitesurfing': 'Water Sports',
  'jetskiing': 'Water Sports',
  'beach_volleyball': 'Water Sports',
  
  // Winter Sports
  'skiing': 'Winter Sports',
  'snowboarding': 'Winter Sports',
  'cross_country_skiing': 'Winter Sports',
  'ice_skating': 'Winter Sports',
  'ice_fishing': 'Winter Sports',
  'ice_hockey': 'Winter Sports',
  'curling': 'Winter Sports',
  
  // Team Sports
  'football_soccer': 'Team Sports',
  'american_football': 'Team Sports',
  'rugby': 'Team Sports',
  'cricket': 'Team Sports',
  'baseball': 'Team Sports',
  'field_hockey': 'Team Sports',
  'hockey': 'Team Sports',
  'basketball_outdoor': 'Team Sports',
  'netball': 'Team Sports',
  'hurling_camogie': 'Team Sports',
  'gaelic_football': 'Team Sports',
  
  // Outdoor Activities
  'beach': 'Outdoor Activities',
  'camping': 'Outdoor Activities',
  'picnicking': 'Outdoor Activities',
  'geocaching': 'Outdoor Activities',
  'birdwatching': 'Outdoor Activities',
  'foraging': 'Outdoor Activities',
  'mushroom_hunting': 'Outdoor Activities',
  'stargazing': 'Outdoor Activities',
  'photography': 'Outdoor Activities',
  'dog_walking': 'Outdoor Activities',
  'urban_exploring': 'Outdoor Activities',
  'bbq': 'Outdoor Activities',
  'outdoor_reading': 'Outdoor Activities',
  'outdoor_playground': 'Outdoor Activities',
  'outdoor_chess': 'Outdoor Activities',
  'outdoor_painting': 'Outdoor Activities',
  'outdoor_music': 'Outdoor Activities',
  'outdoor_gardening': 'Outdoor Activities',
  'beekeeping': 'Outdoor Activities',
  'rock_hopping': 'Outdoor Activities',
  
  // Fitness & Wellness
  'outdoor_gym': 'Fitness & Wellness',
  'outdoor_yoga': 'Fitness & Wellness',
  'outdoor_meditation': 'Fitness & Wellness',
  'tai_chi': 'Fitness & Wellness',
  
  // Fishing (subcategory of Outdoor Activities)
  'fly_fishing_freshwater': 'Outdoor Activities',
  'coarse_fishing': 'Outdoor Activities',
  'sea_fishing_shore': 'Outdoor Activities',
  'sea_fishing_boat': 'Outdoor Activities',
  
  // Individual Sports (subcategory of Active Sports)
  'tennis': 'Active Sports',
  'golf': 'Active Sports',
  'frisbee': 'Active Sports',
  'padel': 'Active Sports',
  'pickleball': 'Active Sports',
  'horse_riding': 'Active Sports',
};

// Activity aliases for spelling variations and normalization
export const activityAliases: { [alias: string]: string } = {
  // Common spelling variations
  'snorkelling': 'snorkeling',
  'jet_skiing': 'jetskiing',
  'stand_up_paddle_boarding': 'stand_up_paddleboarding',
  'sup': 'stand_up_paddleboarding',
  'paddle_boarding': 'stand_up_paddleboarding',
  'paddleboarding': 'stand_up_paddleboarding',
  'gravel_cycling': 'gravel_biking',
  'mountain_biking': 'mountain_biking',
  'mtb': 'mountain_biking',
  'road_biking': 'road_cycling',
  'cycling_road': 'road_cycling',
  
  // Soccer/Football variations
  'soccer': 'football_soccer',
  'football': 'football_soccer',
  
  // American vs other variations
  'american_football': 'american_football',
  'gridiron': 'american_football',
  
  // Ice vs field hockey
  'ice_hockey': 'ice_hockey',
  'field_hockey': 'field_hockey',
  
  // Various fishing terms
  'fishing': 'coarse_fishing', // default to coarse fishing
  'angling': 'coarse_fishing',
  'sea_angling': 'sea_fishing_shore',
  'shore_fishing': 'sea_fishing_shore',
  'boat_fishing': 'sea_fishing_boat',
  'deep_sea_fishing': 'sea_fishing_boat',
  
  // Swimming variations
  'swimming': 'sea_swimming', // default to sea swimming for coastal areas
  'open_water_swimming': 'wild_swimming',
  
  // Other common variations
  'bbq': 'bbq',
  'barbecue': 'bbq',
  'barbecuing': 'bbq',
  'grilling': 'bbq',
  'picnic': 'picnicking',
  'birdwatching': 'birdwatching',
  'bird_watching': 'birdwatching',
  'birding': 'birdwatching',
  'jogging': 'running',
  'trekking': 'hiking',
  'walking': 'hiking',
  'rambling': 'hiking',
};


// Global fallback defaults for when neither activity nor category templates exist
export const globalDefaults: ActivityMessageConfig = {
  templates: makeTemplates(
    "Perfect conditions—ideal weather for outdoor activities. {reasons}",
    "Good conditions—great weather to get outside and enjoy. {reasons}",
    "Conditions are decent—still worth venturing out. {reasons}",
    "Weather's not cooperating today—maybe try indoor alternatives. {reasons}"
  )
};

export const activityMessages: Record<string, ActivityMessageConfig> = {
  surfing: {
    templates: {
      perfect: "Surf's up! {reasons}",
      good: "Grab your wetsuit, it's pretty nice out there. {reasons}",
      fair: "Might be a bit rubbish, but still rideable. {reasons}",
      poor: "Keep that board in the van. {reasons}"
    },
    omitReasons: ['month']
  },
snowboarding: {
  templates: {
    perfect: "Pow day! Fresh lines and epic conditions. {reasons}",
    good: "Solid riding out there—worth strapping in. {reasons}",
    fair: "A bit crusty but still fun—grab your board. {reasons}",
    poor: "Might wanna keep the board waxed and wait this one out. {reasons}"
  },
  omitReasons: ['month']
},
road_cycling: {
  templates: {
    perfect: "Saddle up! Perfect riding weather. {reasons}",
    good: "Smooth roads and good vibes—ideal for a session. {reasons}",
    fair: "A bit bumpy but still rideable—time to hit the road. {reasons}",
    poor: "Heads down, wind up—conditions aren't on your side today. {reasons}"
  }
},
sailing: {
  templates: {
    perfect: "Ideal day on the water — smooth, steady, and set for adventure. {reasons}",
    good: "Great time to hoist the sails — conditions look inviting. {reasons}",
    fair: "Not the easiest sail, but still worth a try if you’re keen. {reasons}",
    poor: "Best to stay in harbour today — the sea will wait. {reasons}"
  },
  omitReasons: ['month']
},

hiking: {
  templates: {
    perfect: "Trails are calling — ideal day to wander and clear your head. {reasons}",
    good: "Great day to stretch your legs and enjoy the outdoors. {reasons}",
    fair: "Not the easiest hike, but still worth lacing up if you’re keen. {reasons}",
    poor: "Best to leave the boots by the door — the hills will wait. {reasons}"
  }
},
mountain_biking: {
  templates: {
    perfect: "Hero dirt and open skies—shred it!. {reasons}",
    good: "Good grip, good flow—trail calls. {reasons}",
    fair: "A bit less than optimal but still rideable—grab your bike. {reasons}",
    poor: "Trail conditions aren't suitable—better to wait for better weather. {reasons}"
  }
},
kayaking: {
  templates: {
    perfect: "Rivers and tides are calling—prime paddling ahead. {reasons}",
    good: "Grab your paddle, the water's welcoming. {reasons}",
    fair: "Conditions are decent enough—time to hit the water. {reasons}",
    poor: "Currents or weather say 'hold fire'—best to wait it out. {reasons}"
  }
},
running: {
  templates: {
    perfect: "Lace up for perfect miles and fresh air. {reasons}",
    good: "A good day to chase some personal bests. {reasons}",
    fair: "Conditions are decent enough—time to hit the pavement. {reasons}",
    poor: "Might be a day for treadmill miles—tough out there. {reasons}"
  }
},
trail_running: {
  templates: {
    perfect: "Trails are at their best—time to hit the dirt. {reasons}",
    good: "Solid trail conditions for exploring. {reasons}",
    fair: "A bit rough but still passable—time to lace up. {reasons}",
    poor: "Trail conditions aren't ideal—maybe stick to roads today. {reasons}"
  }
},
skateboarding: {
  templates: {
    perfect: "Concrete's dry, sky's clear—get out and shred. {reasons}",
    good: "Decent surface—time for a quick session. {reasons}",
    fair: "A bit rough but still rideable—grab your board. {reasons}",
    poor: "Conditions aren't right for skating—better to wait for better weather. {reasons}"
  }
},
rollerblading: {
  templates: {
    perfect: "Smooth paths and sunshine—roll on!. {reasons}",
    good: "Wheels up! Decent for a glide. {reasons}",
    fair: "A bit rough but still rideable—grab your skates. {reasons}",
    poor: "Watch out for puddles and slick spots—maybe skip today. {reasons}"
  }
},
birdwatching: {
  templates: {
    perfect: "Feathered friends abound—prime birdwatching ahead. {reasons}",
    good: "Binoculars at the ready; promising for spotting today. {reasons}",
    fair: "Birds are about but not in full swing—keep your eyes peeled. {reasons}",
    poor: "Birds are laying low—maybe bring a guidebook and stay cozy. {reasons}"
  }
},
foraging: {
  templates: {
    perfect: "Baskets out—nature's bounty is calling. {reasons}",
    good: "Worth a wander—keep your eyes peeled for wild treats. {reasons}",
    fair: "A bit sparse but still some goodies to find. {reasons}",
    poor: "Mother Nature's pantry is a bit bare today—better luck next forage. {reasons}"
  }
},
hurling_camogie: {
  templates: {
    perfect: "The pitch is slick and the sliotar's flying—deadly day to get out and whack it. {reasons}",
    good: "Fair enough conditions—grand for a bit of a hit about. {reasons}",
    fair: "Bit rough out, but grand for knockin’ about with the camán a while.. {reasons}",
    poor: "Maithid's the word—maybe keep the camán in the shed till it clears. {reasons}"
  }

},
gaelic_football: {
  templates: {
    perfect: "The pitch looks like it was ironed by angels, and the ball’s got the bounce of a caffeinated otter. {reasons}",
    good: "Decent day out, like kicking around in your granny’s back garden if she lived on the moon. {reasons}",
    fair: "Bit rough — the grass feels like it owes you money, but sure that’s character-building. {reasons}",
    poor: "The field’s a swamp, the ball’s a brick, and you’d be happier inside arguing with the lads about shit. {reasons}"
  }
},

mushroom_hunting: {
  templates: {
    perfect: "Mushrooms are popping—prime time to explore. {reasons}",
    good: "Some fungi to find—pack a basket and give it a go. {reasons}",
    fair: "A few mushrooms about, but not peak picking conditions. {reasons}",
    poor: "Fungi hiding out; conditions aren't right for mushrooming. {reasons}"
  }
},
stargazing: {
  templates: {
    perfect: "Crystal-clear night—stars and planets await. {reasons}",
    good: "Decent skies—worth bringing out the telescope. {reasons}",
    fair: "A bit hazy but still some celestial sights to see. {reasons}",
    poor: "Clouds block the show—save stargazing for another night. {reasons}"
  }
},
sea_swimming: {
  templates: {
    perfect: "Sparkling water and perfect temps—dive in!. {reasons}",
    good: "A good day for a swim—grab your goggles. {reasons}",
    fair: "Conditions are okay—might be a bit chilly. {reasons}",
    poor: "Waves or weather say 'stay dry today'—wait for better swims. {reasons}"
  }
},
stand_up_paddleboarding: {
  templates: {
    perfect: "The water lies flat as glass, an indifferent mirror. {reasons}",
    good: "The surface undulates gently, inviting the human to stand. {reasons}",
    fair: "The water resists, restless and uneven. Each stroke fights futility. {reasons}",
    poor: "The elements conspire. Today, the board becomes a coffin for pride. {reasons}"
  }
},
snorkeling: {
  templates: {
    perfect: "Ah, the waters, they shimmer like a lover’s gaze. Oh to kiss another world. {reasons}",
    good: "The sea's generous today, clear enough to spy the small citizens of Neptune’s garden. {reasons}",
    fair: "The waves are restless, but still they reveal fish with the patience of a saint. {reasons}",
    poor: "Non, mon ami… the sea is in no mood for guests. Better to wait, and dream of gills. {reasons}"
  }
},
scuba_diving: {
  templates: {
    perfect: "Into the blue cathedral we descend, pilgrims among the silent fish. {reasons}",
    good: "Currents are steady, visibility kind — the ocean opens her arms. {reasons}",
    fair: "She stirs with some resistance, yet still she offers mystery. {reasons}",
    poor: "The waters are clouded, unsettled — to dive now is to chase shadows. {reasons}"
  }
},
kitesurfing: {
  templates: {
    perfect: "Wind's dialed in—epic session ahead for kitesurfing. {reasons}",
    good: "Decent breeze for a solid ride. {reasons}",
    fair: "A bit out there but still manageable—take care though. {reasons}",
    poor: "Winds are wild or waves too rough—safer to stay ashore. {reasons}"
  }
},
windsurfing: {
  templates: {
    perfect: "Steady breeze and smooth water—windsurf heaven. {reasons}",
    good: "Good gusts for a fun windsurf session. {reasons}",
    fair: "A bit choppy but still manageable—grab your board. {reasons}",
    poor: "Choppy waters or lulls—maybe tune your gear and try later. {reasons}"
  }
},
beach: {
  templates: {
    perfect: "The beach is showing off today — sand, sea, and smiles all included. {reasons}",
    good: "A fine day to stretch out a towel and let the hours drift by. {reasons}",
    fair: "Not postcard-perfect, but still plenty of sandcastles and splashing to be had. {reasons}",
    poor: "The sea’s in one of her moods — maybe save the beach bag for tomorrow. {reasons}"
  }
},
camping: {
  templates: {
    perfect: "✨Stars out, vibes immaculate — go touch grass and pretend you’re Bear Grylls. {reasons}",
    good: "Pretty solid night for sleeping in a nylon bag like a woodland burrito. {reasons}",
    fair: "Low-key uncomfortable but that’s kinda the point — character development unlocked. {reasons}",
    poor: "Congrats, you’ve chosen ‘wet sock simulator 3000’. Maybe stay home. {reasons}"
  }
},
picnicking: {
  templates: {
    perfect: "Peak cottagecore moment — blanket down, strawberries out, live your aesthetic. {reasons}",
    good: "Solid day for snacks on grass — ants RSVP’d but it’s fine. {reasons}",
    fair: "Not the vibe but still edible outdoors — bring chaos napkins. {reasons}",
    poor: "Sky said no. Enjoy your sad little indoor charcuterie instead. {reasons}"
  }
},
geocaching: {
  templates: {
    perfect: "Lovely day for wandering about with your phone, pretending you’re Indiana Jones. {reasons}",
    good: "Decent weather — you’ll still look mad rooting around in bushes, but at least it’s dry. {reasons}",
    fair: "Bit scrappy out there — mud on your knees, GPS jumping about, but hey, that’s the adventure. {reasons}",
    poor: "Rain, fog, the lot — you’ll just look like a burglar in the park. Best wait it out. {reasons}"
  }

},outdoor_gym: {
  templates: {
    perfect: "Sun’s out, joints oiled — time to show the youngsters how it’s done. {reasons}",
    good: "Decent day for fresh-air fitness — you’ll feel it tomorrow, in a good way. {reasons}",
    fair: "Bit of breeze, bit of drizzle — nothing worse than what the knees say in the morning. {reasons}",
    poor: "Cold and wet — let the dumbbells rust, you’ve earned a tea break. {reasons}"
  }
},
outdoor_yoga: {
  templates: {
    perfect: "The cosmos has aligned — mats kissed by sunlight, chakras practically humming. {reasons}",
    good: "The breeze whispers encouragement, the sky applauds your downward dog. {reasons}",
    fair: "Slightly breezy, slightly chilly — think of it as resistance training for your aura. {reasons}",
    poor: "The elements refuse to vibe with your practice — retreat indoors to manifest serenity. {reasons}"
  }
},
outdoor_meditation: {
  templates: {
    perfect: "Stillness everywhere — the universe is practically begging you to close your eyes. {reasons}",
    good: "Air is pure enough to inhale enlightenment with minimal effort. {reasons}",
    fair: "A bit of wind, a hint of chaos — ideal conditions for levelling up your inner monk. {reasons}",
    poor: "Nature is not cooperating — realign your chakras on the sofa instead. {reasons}"
  }
},
dog_walking: {
  templates: {
    perfect: "Fine, I’ll admit it — even I don’t mind a walk on a day like this. The dog’s delighted, of course. {reasons}",
    good: "Leash up then… the mutt’s happy, my knees less so. {reasons}",
    fair: "The dog thinks it’s grand, but I’d rather be sat with a cuppa. Keep it short. {reasons}",
    poor: "Rain, cold, misery — the dog doesn’t care, but I do. Quick loop, then home. {reasons}"
  }
},
photography: {
  templates: {
    perfect: "The light is showing off — go pretend you’re Ansel Adams for a day. {reasons}",
    good: "Grab the camera — there’s always something worth pointing it at, even if it’s a bin with good shadows. {reasons}",
    fair: "Not ideal, but real photographers thrive on suffering. Go make ‘moody’ your style. {reasons}",
    poor: "The world looks dreadful — perfect time to charge batteries and sulk artistically. {reasons}"
  }

},
  // Add any additional outdoor activities from emojiMap here
 canoeing: {
  templates: {
    perfect: "Water like glass — glide along and feel like you invented peace. {reasons}",
    good: "Solid paddling day — rhythm, splash, and a bit of arm ache for free. {reasons}",
    fair: "Choppy enough to keep you humble, calm enough to stay afloat. {reasons}",
    poor: "The water’s having a tantrum — best to let the canoe dream onshore today. {reasons}"
  }
},
jetskiing: {
  templates: {
    perfect: "Ocean’s a racetrack — unleash your inner action hero. {reasons}",
    good: "Good day to make too much noise and annoy the fish. {reasons}",
    fair: "Bit bumpy — hang on tight and call it ‘extreme sports’. {reasons}",
    poor: "Chop’s nasty, wind’s worse — the jet ski stays parked while your ego cools off. {reasons}"
  }
},
 fly_fishing_freshwater: {
  templates: {
    perfect: "The trout are practically queueing up — even your dodgy cast might work today. {reasons}",
    good: "Fish are stirring, enough to keep you hopeful and humble. {reasons}",
    fair: "Not much rising, but you can always enjoy untangling knots in your leader. {reasons}",
    poor: "Fish have clocked off — best excuse for staring at the river and calling it mindfulness. {reasons}"
  }
},
coarse_fishing: {
  templates: {
    perfect: "The float will dip, the alarms will sing — even your flask of tea will taste like victory. {reasons}",
    good: "Decent day for sitting still and convincing yourself patience is a sport. {reasons}",
    fair: "A few nibbles if you’re lucky — otherwise it’s you, the maggots, and your thoughts. {reasons}",
    poor: "Fish aren’t biting, and neither are you — maybe just feed the ducks. {reasons}"
  }
},
sea_fishing_shore: {
  templates: {
    perfect: "The sea’s in a generous mood — you might even bring something home that isn’t just seaweed. {reasons}",
    good: "Good chance of a tug or two — at worst, you’ll perfect your windswept look. {reasons}",
    fair: "A bit patchy — expect long chats with gulls between bites. {reasons}",
    poor: "The tide’s laughing at you — might as well save the bait money for chips. {reasons}"
  }
},
sea_fishing_boat: {
  templates: {
    perfect: "The sea’s settled, the rods are lively — you’ll swear you’re a professional. {reasons}",
    good: "A solid day afloat — enough bites to justify the fuel bill. {reasons}",
    fair: "Choppy, queasy, but still fishable — remember, leaning over the side is part of the charm. {reasons}",
    poor: "Rough seas, empty buckets — better off telling tall tales ashore. {reasons}"
  }

},
 rock_climbing: {
  templates: {
    perfect: "Grip is spot on and weather's clear—perfect climbing conditions. {reasons}",
    good: "Solid conditions for sending those routes. {reasons}",
    fair: "A bit damp or breezy but still climbable—time to chalk up but be careful. {reasons}",
    poor: "Slippery or unsafe—best to stay grounded today. {reasons}"
  }
},
gravel_biking: {
  templates: {
    perfect: "Trails are dry and flowing—perfect for gravel biking. {reasons}",
    good: "Good conditions to get your gravel ride on. {reasons}",
    fair: "A bit muddy or rough but still rideable—time to hit the trails. {reasons}",
    poor: "Muddy or rough—challenging conditions for gravel biking. {reasons}"
  }
},
urban_exploring: {
  templates: {
    perfect: "Clear skies and good vibes—perfect for a stroll. {reasons}",
    good: "Nice day to wander about. {reasons}",
    fair: "A bit cloudy or windy but still worth a wander. {reasons}",
    poor: "Not the best weather—maybe wait for clearer skies. {reasons}"
  }
},
skiing: {
  templates: {
    perfect: "Powder perfect! Time to carve it up. {reasons}",
    good: "Good skiing conditions—enjoy the slopes. {reasons}",
    fair: "Not ideal but that's half the fun—bring extra layers. {reasons}",
    poor: "Conditions aren't great today—stay safe out there. {reasons}"
  },
  omitReasons: ['month']
},
cross_country_skiing: {
  templates: {
    perfect: "Glide through fresh snow—perfect XC skiing. {reasons}",
    good: "Good conditions for cross-country skiing. {reasons}",
    fair: "A bit rough but still skiable—time to hit the trails. {reasons}",
    poor: "Not ideal for XC skiing today—better to rest and recover. {reasons}"
  },
  omitReasons: ['month']
},
ice_skating: {
  templates: {
    perfect: "Smooth ice and crisp air—perfect for ice skating. {reasons}",
    good: "Good day to lace up and glide. {reasons}",
    fair: "A bit rough but still skateable—time to hit the rink. {reasons}",
    poor: "Ice or weather conditions not ideal—better to watch from the sidelines. {reasons}"
  }
},
ice_fishing: {
  templates: {
    perfect: "A banner day for holes and tall tales — drop a line and feel smug. {reasons}",
    good: "Decent for sitting, staring, and claiming the thermos improves technique. {reasons}",
    fair: "A slow grind — pack patience and a good story. {reasons}",
    poor: "Today’s for fixing the sled, not the hole. {reasons}"
  },
  omitReasons: ['month']
},

bbq: {
  templates: {
    perfect: "Peak sizzle energy — aprons on, debates about sauces commence. {reasons}",
    good: "Solid grilling vibes — smoke, chat, and a slightly overdone sausage. {reasons}",
    fair: "Not ‘BBQ of the year’, but the tongs still work. {reasons}",
    poor: "Let the grill rest — order chips and call it strategy. {reasons}"
  }
},

outdoor_reading: {
  templates: {
    perfect: "The garden becomes a library, the breeze turns pages like a courteous ghost; you read until the tea forgets to cool. {reasons}",
    good: "A fine afternoon for loitering between sentences; benches become armchairs if you believe hard enough. {reasons}",
    fair: "Reality coughs and tugs your sleeve, yet the book insists — read on, slightly askance. {reasons}",
    poor: "Today the sky edits your prose with damp and drama; retreat indoors and annotate the kettle. {reasons}"
  }
},

outdoor_playground: {
  templates: {
    perfect: "Slides sing, swings soar — bring the chaos and snacks. {reasons}",
    good: "Prime time for big laughs and small bruises. {reasons}",
    fair: "Playable enough — pocket snacks and negotiate turns. {reasons}",
    poor: "Quick burst, then cocoa — energy out, home you go. {reasons}"
  }
},

outdoor_chess: {
  templates: {
    perfect: "Silence enough for thinking, chaos enough for genius — let the pawns dream of promotion. {reasons}",
    good: "A fine time to quarrel politely with fate, one square at a time. {reasons}",
    fair: "The position is messy; so is life. Make a plan, then improve it. {reasons}",
    poor: "Today the world plays white from move one — retreat to a café and claim you meant it. {reasons}"
  }
},

outdoor_painting: {
  templates: {
    perfect: "Light so kind even your stick figures feel profound. {reasons}",
    good: "Colours practically begging to be immortalised. {reasons}",
    fair: "Breezes and wobbles — collaborators in your masterpiece. {reasons}",
    poor: "The muse has gone feral — commune with your canvas indoors. {reasons}"
  }
},

outdoor_music: {
  templates: {
    perfect: "Man, the sky’s wide and clean — let the air carry the stuff you can’t say. {reasons}",
    good: "Set up and blow. Don’t overthink it — play the damn instrument. {reasons}",
    fair: "It’s rough out, but music doesn’t care — put it down raw and walk away. {reasons}",
    poor: "Save the chorus — the world can hear you when it deserves it. {reasons}"
  }
},

tai_chi: {
  templates: {
    perfect: "Energy flows like silk — balance and harmony at their most photogenic. {reasons}",
    good: "Sway like bamboo and pretend you understand yin and yang. {reasons}",
    fair: "A wobble is just advanced enlightenment. {reasons}",
    poor: "Let your chi drift toward a warm cup of tea. {reasons}"
  }
},

american_football: {
  templates: {
    perfect: "Pads on, heads up — first down energy all day. {reasons}",
    good: "Crisp routes, loud huddles — get the chains moving. {reasons}",
    fair: "Ugly yardage is still yardage — lean on the basics. {reasons}",
    poor: "Save the heroics — chalk it up and plan the comeback. {reasons}"
  }
},

baseball: {
  templates: {
    perfect: "Sweet spots and scandalously optimistic slides. {reasons}",
    good: "Clean throws, loud dugouts — play ball. {reasons}",
    fair: "Small ball wins hearts — grind out the innings. {reasons}",
    poor: "Bench the ego — work the signs and live to bat tomorrow. {reasons}"
  }
},

cricket: {
  templates: {
    perfect: "A day for elegant leaves and scandalous cover drives. {reasons}",
    good: "Plenty of runs in it — play the percentages. {reasons}",
    fair: "Grit over glamour — nurdle, block, wait your moment. {reasons}",
    poor: "Call it tactics: tea now, heroics later. {reasons}"
  }
},

ice_hockey: {
  templates: {
    perfect: "Ice snaps, blades sing — make memories and divots. {reasons}",
    good: "Honest sheet — tape up and get stuck in. {reasons}",
    fair: "Scrappy shifts — win the corners, smile anyway. {reasons}",
    poor: "Call the change — today favours sticks and stories indoors. {reasons}"
  }
},

field_hockey: {
  templates: {
    perfect: "Ball zips, sticks talk — press high and enjoy it. {reasons}",
    good: "Crisp feeds and a bit of needle. {reasons}",
    fair: "Messy midfield day — hold shape and nick one. {reasons}",
    poor: "Tactics over turnovers — run drills and live to sprint tomorrow. {reasons}"
  }
},

padel: {
  templates: {
    perfect: "Walls are your friends — bring the lobs and the laughs. {reasons}",
    good: "Rallies for days — smash with abandon, apologise later. {reasons}",
    fair: "Scrappy points are still points — work the screens. {reasons}",
    poor: "Let the court miss you — group-chat the rematch. {reasons}"
  }
},

pickleball: {
  templates: {
    perfect: "Dinks on a string — kitchen zen unlocked. {reasons}",
    good: "Solid rallies and polite trash talk. {reasons}",
    fair: "Not pretty, still fun — reset, reset, reset. {reasons}",
    poor: "Park the paddle — save your wrists for tomorrow. {reasons}"
  }
},

netball: {
  templates: {
    perfect: "Zip in the passes, snap in the shots — textbook centre-court chaos. {reasons}",
    good: "Crisp feeds, noisy bibs — lovely stuff. {reasons}",
    fair: "Grit wins — work the channels and annoy the WA. {reasons}",
    poor: "Run the plays, shelve the heroics — legs for another day. {reasons}"
  }
},

rock_hopping: {
  templates: {
    perfect: "A day for nimble feet and tide-pool gossip. {reasons}",
    good: "Plenty to clamber — mind the gaps, enjoy the finds. {reasons}",
    fair: "Careful steps, curious eyes — adventure in small doses. {reasons}",
    poor: "Save the ankles — storytime, not scramble time. {reasons}"
  }
},

rugby: {
  templates: {
    perfect: "Glorious rugby day — big carries, slick hands, backs pretending they planned it. {reasons}",
    good: "Grand for a run — scrums bite, offloads stick, plenty of chat. {reasons}",
    fair: "Ugly rugby is still rugby — keep it tight, kick the corners, enjoy the wrestle. {reasons}",
    poor: "A day for brave fools — tape everything and rehearse the post-match excuses. {reasons}"
  }
},

archery: {
  templates: {
    perfect: "Arrows fly true — bullseyes and quiet nods. {reasons}",
    good: "Clean shots, tidy groups — breathe, release, repeat. {reasons}",
    fair: "Wobbly ends build legends — adjust, then grin. {reasons}",
    poor: "Today’s for fletching and tea — targets can wait. {reasons}"
  }
},

riding_motorbike: {
  templates: {
    perfect: "A day that turns roads into stories. {reasons}",
    good: "Measured miles — ride smooth, ride long. {reasons}",
    fair: "Keep it light and local — let the horizon wait. {reasons}",
    poor: "Wrench, polish, plot — the road will still be there. {reasons}"
  }
},

cycling: {
  templates: {
    perfect: "Legs purr, miles melt — queen-stage energy. {reasons}",
    good: "Steady spin, happy head — bank some quiet kilometres. {reasons}",
    fair: "No glory, just graft — cadence and snacks will see you through. {reasons}",
    poor: "Tune the bike, plan the loop — call it active patience. {reasons}"
  }
},

football_soccer: {
  templates: {
    perfect: "A day for triangles and poetry — play the beautiful game beautifully. {reasons}",
    good: "Plenty of zip — press high, pass fast, enjoy it. {reasons}",
    fair: "Scrappy but honest — win your duels and nick a goal. {reasons}",
    poor: "Boots off, brains on — tactics and tea instead. {reasons}"
    }
},
frisbee: {
  templates: {
    perfect: "Discs fly true — time for ridiculous layouts. {reasons}",
    good: "Solid day for a throw-around — spins, smiles, repeat. {reasons}",
    fair: "Not slick, still fun — keep it casual, keep it moving. {reasons}",
    poor: "Call it strategy: save the shoulder, plan the rematch. {reasons}"
  }
},
golf: {
  templates: {
    perfect: "Greens kind, swing unbothered — the only thing under par should be your score. {reasons}",
    good: "Course is honest — time to blame the clubs, not the weather. {reasons}",
    fair: "Manage your expectations and your tempo — excuses included. {reasons}",
    poor: "Practise the art of not playing — range, putting mat, tall tales. {reasons}"
  }
},
hockey: {
  templates: {
    perfect: "Sticks talking, passes snapping — game on. {reasons}",
    good: "Plenty in it — keep the press high and the chat higher. {reasons}",
    fair: "Scrappy shifts — win the corners and the day. {reasons}",
    poor: "Call the drill session — tactics now, trophies later. {reasons}"
  }
},
tennis: {
  templates: {
    perfect: "Ace energy — lines crisp, footwork light. {reasons}",
    good: "Rallies for days — your serve. {reasons}",
    fair: "Not pretty, still tennis — grind it out. {reasons}",
    poor: "Rest the knees — highlights now, comebacks later. {reasons}"
  }
},
wild_swimming: {
  templates: {
    perfect: "A dip that feels like starting over — in, breathe, grin. {reasons}",
    good: "Bracing and brilliant — swim, warm up, tell everyone. {reasons}",
    fair: "Short, sharp, soul-reset — towel and flask highly recommended. {reasons}",
    poor: "Today the water wins — plan the plunge, not the hypothermia. {reasons}"
  }
},
beach_volleyball: {
  templates: {
    perfect: "Sand angels and perfect sets — spike with abandon. {reasons}",
    good: "Good rally energy — dive, laugh, repeat. {reasons}",
    fair: "Messy points are still points — play to the whistle. {reasons}",
    poor: "Bench the bump — playlist and chill instead. {reasons}"
  }
},
horse_riding: {
  templates: {
    perfect: "Miles of quiet — let the hooves write the story. {reasons}",
    good: "Saddle up for steady miles and long breaths. {reasons}",
    fair: "Keep it easy, keep it local — good company in the reins. {reasons}",
    poor: "Stable day — brush, bond, and plan the next ride. {reasons}"
  }
},
orienteering: {
  templates: {
    perfect: "Map magic — get lost exactly where you meant to. {reasons}",
    good: "A fine day for dots, dashes, and smug bearings. {reasons}",
    fair: "Expect detours — the right kind of wrong turns. {reasons}",
    poor: "Practise at the table — the forest will wait. {reasons}"
  }
},
snorkelling: {
  templates: {
    perfect: "Ah, the waters, they shimmer like a lover’s gaze. Oh to kiss another world. {reasons}",
    good: "The sea is generous today, clear enough to spy the small citizens of Neptune’s garden. {reasons}",
    fair: "The waves are restless, but still they reveal fish with the patience of a saint. {reasons}",
    poor: "Non, mon ami… the sea is in no mood for guests. Better to wait, and dream of gills. {reasons}"
  }
},
sailing_inland: {
  templates: {
    perfect: "A friendly mirror of a lake — set a course for nowhere in particular. {reasons}",
    good: "Sheltered water, simple joys — trim, drift, grin. {reasons}",
    fair: "Not elegant, still afloat — practice makes stories. {reasons}",
    poor: "Harbour day — tie knots, tell lies, make tea. {reasons}"
  },
  omitReasons: ['month']
},
windsurfing_inland: {
  templates: {
    perfect: "Everything clicks — harness in, grin out. {reasons}",
    good: "Plenty to play with — sheet in and dance. {reasons}",
    fair: "Wobbly fun — treat it like balance training. {reasons}",
    poor: "Rig, tweak, daydream — tomorrow will rip. {reasons}"
  },
  omitReasons: ['month']
},
sup_sea: {
  templates: {
    perfect: "You stand upon the sea and nothing argues — for once. {reasons}",
    good: "The board forgives and the horizon approves — take the hint. {reasons}",
    fair: "Every stroke is a small negotiation with chaos. {reasons}",
    poor: "Today the ocean insists — sit it out and keep your pride dry. {reasons}"
  }
},
sea_kayaking: {
  templates: {
    perfect: "A quiet line along the coast — let the bow draw it. {reasons}",
    good: "Coves and stories — mosey and mind the rhythm. {reasons}",
    fair: "Short hops, curious eyes — adventure, politely. {reasons}",
    poor: "Chart it, don’t chase it — plan the next crossing. {reasons}"
  }
},
basketball_outdoor: {
  templates: {
    perfect: "Blacktop’s calling — run it till the lights come on. {reasons}",
    good: "Good run energy — clear lane, fresh trash talk. {reasons}",
    fair: "Rim rattlin’, still hoopin’ — play smart, keep it chill. {reasons}",
    poor: "Call next for another day — ankles and pride intact. {reasons}"
  }
},
outdoor_gardening: {
  templates: {
    perfect: "A day to potter and forget the clock. {reasons}",
    good: "Enough promise in the soil to keep hands happy. {reasons}",
    fair: "Little jobs, little joys — the garden will notice. {reasons}",
    poor: "Let the beds rest — plan, prune, and put the kettle on. {reasons}"
  }
},
beekeeping: {
  templates: {
    perfect: "The apiary hums like a compliment — visit with respect. {reasons}",
    good: "Steady hands, calm hearts — check the frames and learn the mood. {reasons}",
    fair: "Go slow, be brief — the bees have their opinions. {reasons}",
    poor: "Admire from the gate — queens dislike drama. {reasons}"
  }
},
curling: {
  templates: {
    perfect: "Ice is a pure belter — keen as ye like; gie it laldy and sweep tae glory. {reasons}",
    good: "Sheet’s sound — steady throw and gie the broom a right good laldy. {reasons}",
    fair: "Bit clatty, bit bumpy — haud the line and dinnae daft the weight. {reasons}",
    poor: "Ice is mingin’ and the stanes are skitin’ — sack it and hit the café. {reasons}"
  },
  omitReasons: ['month']
  }
}




export function getActivityMessage(
  activityId: string,
  category: keyof ActivityTemplates,
  reasons: { key: string; value: any; label: string }[] = []
): string {
  const arr = Array.isArray(reasons) ? reasons : [];

  // Unified config lookup
  let config = activityMessages[activityId]
    || activityMessages[activityAliases[activityId]]
    || categoryDefaults[activityCategories[activityId] || activityCategories[activityAliases[activityId]]]
    || globalDefaults;

  // Special handling for surfing when rating is poor (preserve existing logic)
  if ((activityId === 'surfing' || activityAliases[activityId] === 'surfing') && category === 'poor') {
    const waveReason = arr.find(r => r.key === 'wave');
    if (waveReason) {
      const waveHeight = waveReason.value || 0;
      if (waveHeight < 0.5) {
        return `Keep that board in the van. Waves are too small today. ${getReasonText(arr, config.omitReasons)}`;
      } else if (waveHeight > 2.5) {
        return `Warning: Dangerous surf conditions! Waves too large for safe surfing. ${getReasonText(arr, config.omitReasons)}`;
      }
    }
  }

  // Standard processing for all activities
  const filteredReasons = arr.filter(
    r => !(config.omitReasons || []).includes(r.key)
  );
  const reasonText = getReasonText(filteredReasons, config.omitReasons);
  const template = config.templates[category] ?? config.templates.fair;
  return template.replace('{reasons}', reasonText);
}

// Helper function to extract and format reasons text
function getReasonText(reasons: { key: string; value: any; label: string }[], omitReasons?: string[]): string {
  return reasons
    .filter(r => r && typeof r === 'object' && r.label) // Ensure r and r.label exist
    .map(r => r.label.trim().replace(/\.$/, ''))
    .join('. ') + (reasons.length > 0 ? '.' : '');
}
