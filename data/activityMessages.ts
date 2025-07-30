export type ActivityMessageConfig = {
  templates: {
    perfect: string;
    good: string;
    poor: string;
  };
  omitReasons?: string[];
};

export const activityMessages: Record<string, ActivityMessageConfig> = {
  surfing: {
    templates: {
      perfect: "Surf's up! {reasons}",
      good: "Grab your wetsuit, it's pretty nice out there: {reasons}",
      poor: "Keep that board in the van: {reasons}"
    },
    omitReasons: ['month']
  },
snowboarding: {
  templates: {
    perfect: "Pow day! Fresh lines and epic conditions: {reasons}",
    good: "Solid riding out there—worth strapping in: {reasons}",
    poor: "Might wanna keep the board waxed and wait this one out: {reasons}"
  },
  omitReasons: ['month']
},
road_cycling: {
  templates: {
    perfect: "Saddle up! Perfect riding weather: {reasons}",
    good: "Smooth roads and good vibes—ideal for a session: {reasons}",
    poor: "Heads down, wind up—conditions aren't on your side today: {reasons}"
  }
},
hiking: {
  templates: {
    perfect: "Blue skies, clear trails—get those boots on: {reasons}",
    good: "A solid day for some trail time: {reasons}",
    poor: "Might be best to admire the peaks from indoors today: {reasons}"
  }
},
mountain_biking: {
  templates: {
    perfect: "Hero dirt and clear skies—shred it!: {reasons}",
    good: "Good grip, good flow—trail calls: {reasons}",
    poor: "Unless you love mud baths and washouts, maybe wait this one: {reasons}"
  }
},
kayaking: {
  templates: {
    perfect: "Rivers and tides are calling—prime paddling ahead: {reasons}",
    good: "Grab your paddle, the water’s welcoming: {reasons}",
    poor: "Currents or weather say 'hold fire'—best to wait it out: {reasons}"
  }
},
running: {
  templates: {
    perfect: "Lace up for perfect miles and fresh air: {reasons}",
    good: "A good day to chase some personal bests: {reasons}",
    poor: "Might be a day for treadmill miles—tough out there: {reasons}"
  }
},
trail_running: {
  templates: {
    perfect: "Trails are at their best—time to hit the dirt: {reasons}",
    good: "Solid trail conditions for exploring: {reasons}",
    poor: "Roots, rocks, and weather say pause—maybe rest this one: {reasons}"
  }
},
skateboarding: {
  templates: {
    perfect: "Concrete’s dry, sky’s clear—get out and shred: {reasons}",
    good: "Decent surface—time for a quick session: {reasons}",
    poor: "Slippery decks and sketchy weather—better keep the grip tape dry: {reasons}"
  }
},
rollerblading: {
  templates: {
    perfect: "Smooth paths and sunshine—roll on!: {reasons}",
    good: "Wheels up! Decent for a glide: {reasons}",
    poor: "Watch out for puddles and slick spots—maybe skip today: {reasons}"
  }
},
birdwatching: {
  templates: {
    perfect: "Feathered friends abound—prime birdwatching ahead: {reasons}",
    good: "Binoculars at the ready; promising for spotting today: {reasons}",
    poor: "Birds are laying low—maybe bring a guidebook and stay cozy: {reasons}"
  }
},
foraging: {
  templates: {
    perfect: "Baskets out—nature's bounty is calling: {reasons}",
    good: "Worth a wander—keep your eyes peeled for wild treats: {reasons}",
    poor: "Mother Nature’s pantry is a bit bare today—better luck next forage: {reasons}"
  }
},
mushroom_hunting: {
  templates: {
    perfect: "Mushrooms are popping—prime time to explore: {reasons}",
    good: "Some fungi to find—pack a basket and give it a go: {reasons}",
    poor: "Fungi hiding out; conditions aren't right for mushrooming: {reasons}"
  }
},
stargazing: {
  templates: {
    perfect: "Crystal-clear night—stars and planets await: {reasons}",
    good: "Decent skies—worth bringing out the telescope: {reasons}",
    poor: "Clouds block the show—save stargazing for another night: {reasons}"
  }
},
swimming: {
  templates: {
    perfect: "Sparkling water and perfect temps—dive in!: {reasons}",
    good: "A good day for a swim—grab your goggles: {reasons}",
    poor: "Waves or weather say 'stay dry today'—wait for better swims: {reasons}"
  }
},
stand_up_paddleboarding: {
  templates: {
    perfect: "Glass-calm water—SUP heaven: {reasons}",
    good: "Good conditions for paddling and balance: {reasons}",
    poor: "Chop or wind make it tricky—maybe sit this session out: {reasons}"
  }
},
  snorkeling: {
  templates: {
    perfect: "Waters are crystal clear—snorkel paradise awaits: {reasons}",
    good: "Decent visibility and gentle seas—grab your mask: {reasons}",
    poor: "Surf’s up or currents strong—best to skip snorkeling today: {reasons}"
  }
},
scuba_diving: {
  templates: {
    perfect: "Blue depths beckon—prime conditions to dive in: {reasons}",
    good: "Steady currents and good viz—solid day to explore: {reasons}",
    poor: "Seas are unsettled or murky—dive another day: {reasons}"
  }
},
kitesurfing: {
  templates: {
    perfect: "Wind’s dialed in—epic session ahead for kitesurfing: {reasons}",
    good: "Decent breeze for a solid ride: {reasons}",
    poor: "Winds are wild or waves too rough—safer to stay ashore: {reasons}"
  }
},
windsurfing: {
  templates: {
    perfect: "Steady breeze and smooth water—windsurf heaven: {reasons}",
    good: "Good gusts for a fun windsurf session: {reasons}",
    poor: "Choppy waters or lulls—maybe tune your gear and try later: {reasons}"
  }
},
beach: {
  templates: {
    perfect: "Sun’s out, sea’s calm—ultimate beach day: {reasons}",
    good: "Pack your towel—good times await on the sand: {reasons}",
    poor: "High winds or stormy skies—best to plan the beach for another day: {reasons}"
  }
},
camping: {
  templates: {
    perfect: "Starry skies and gentle breezes—pitch that tent: {reasons}",
    good: "Decent weather for a night under canvas: {reasons}",
    poor: "Storms or chill in the air—maybe hold off on camping: {reasons}"
  }
},
picnicking: {
  templates: {
    perfect: "Blankets down and baskets out—it’s a perfect picnic day: {reasons}",
    good: "Fresh air and fine skies—ideal for alfresco snacks: {reasons}",
    poor: "Breezy or wet—picnic indoors and save the park for next time: {reasons}"
  }
},
geocaching: {
  templates: {
    perfect: "Clear skies and firm ground—time for a geocaching quest: {reasons}",
    good: "Solid hiding and seeking weather—GPS at the ready: {reasons}",
    poor: "Rain, mud, or fog—track down caches another day: {reasons}"
  }
},
 outdoor_gym: {
  templates: {
    perfect: "Fresh air and sunshine—prime time for outdoor gym gains: {reasons}",
    good: "Solid conditions to get your workout on outside: {reasons}",
    poor: "Rain or cold's got the upper hand—save the muscle for another day: {reasons}"
  }
},
outdoor_yoga: {
  templates: {
    perfect: "Sun-kissed mats and peaceful vibes—outdoor yoga bliss: {reasons}",
    good: "Nice breeze and open skies—unroll the mat for some flow: {reasons}",
    poor: "Wind or weather might disrupt your zen—try indoor yoga today: {reasons}"
  }
},
outdoor_meditation: {
  templates: {
    perfect: "Calm, quiet, and perfect air—ideal for outdoor meditation: {reasons}",
    good: "Serene enough for mindful moments outdoors: {reasons}",
    poor: "Noise or weather out of balance—find some calm indoors instead: {reasons}"
  }
},
dog_walking: {
  templates: {
    perfect: "Paws up! It's a great day to walk the dog: {reasons}",
    good: "Leash up—solid weather for a stroll with your buddy: {reasons}",
    poor: "Greys or rain holding you back—maybe just a quick loop today: {reasons}"
  }
},
photography: {
  templates: {
    perfect: "Light’s magic, skies are stunning—get out and capture the moment: {reasons}",
    good: "Grab your camera—decent light and some inspiration out there: {reasons}",
    poor: "Clouds or drizzle blur the scene—save your shots for another day: {reasons}"
  }
},
  // Add any additional outdoor activities from emojiMap here
  canoeing: {
  templates: {
    perfect: "Calm waters and blue skies—paddle on, it’s perfect for canoeing: {reasons}",
    good: "Steady water and fresh air—worth launching your canoe: {reasons}",
    poor: "Winds or weather aren't on your side—safer to stay ashore for canoes today: {reasons}"
  }
},
jetskiing: {
  templates: {
    perfect: "Sun’s out, water’s smooth—prime time to rev up the jet ski: {reasons}",
    good: "Decent conditions for a fun jet skiing session: {reasons}",
    poor: "Choppy waves or gusty winds—best park the jet ski and ride another day: {reasons}"
  }
},
  
  fly_fishing_freshwater: {
  templates: {
    perfect: "Hatches rising and clear water—prime time to cast your fly: {reasons}",
    good: "Steady trout activity—good for refining that drift and presentation: {reasons}",
    poor: "Tricky conditions for fly fishing—might be best to watch the water today: {reasons}"
  }
},
coarse_fishing: {
  templates: {
    perfect: "Bite alarms ready—ideal weather to chase that PB: {reasons}",
    good: "Solid conditions to settle in and enjoy your session: {reasons}",
    poor: "Mud and wind may hamper fishing—consider holding off and prepping gear: {reasons}"
  }
},
sea_fishing_shore: {
  templates: {
    perfect: "Tides right, surf calm—perfect for bagging a shore catch: {reasons}",
    good: "Good surf and steady bites—great day to try your luck from the beach: {reasons}",
    poor: "Rough surf or strong winds—shore fishing could be a challenge today: {reasons}"
  }
},
sea_fishing_boat: {
  templates: {
    perfect: "Clear skies and calm seas—prime boat fishing conditions: {reasons}",
    good: "Steady weather and good marks—solid day on the water: {reasons}",
    poor: "Rough seas or safety concerns—best to anchor the boat and wait it out: {reasons}"
  }
},
 rock_climbing: {
  templates: {
    perfect: "Grip is spot on and weather’s clear—perfect climbing conditions: {reasons}",
    good: "Solid conditions for sending those routes: {reasons}",
    poor: "Slippery or unsafe—best to stay grounded today: {reasons}"
  }
},
gravel_biking: {
  templates: {
    perfect: "Trails are dry and flowing—perfect for gravel biking: {reasons}",
    good: "Good conditions to get your gravel ride on: {reasons}",
    poor: "Muddy or rough—challenging conditions for gravel biking: {reasons}"
  }
},
urban_exploring: {
  templates: {
    perfect: "Clear skies and good vibes—perfect for a stroll: {reasons}",
    good: "Nice day to wander about: {reasons}",
    poor: "Not the best weather—maybe wait for clearer skies: {reasons}"
  }
},
skiing: {
  templates: {
    perfect: "Powder perfect! Time to carve it up: {reasons}",
    good: "Good skiing conditions—enjoy the slopes: {reasons}",
    poor: "Conditions aren’t great today—stay safe out there: {reasons}"
  },
  omitReasons: ['month']
},
cross_country_skiing: {
  templates: {
    perfect: "Glide through fresh snow—perfect XC skiing: {reasons}",
    good: "Good conditions for cross-country skiing: {reasons}",
    poor: "Not ideal for XC skiing today—better to rest and recover: {reasons}"
  },
  omitReasons: ['month']
},
ice_skating: {
  templates: {
    perfect: "Smooth ice and crisp air—perfect for ice skating: {reasons}",
    good: "Good day to lace up and glide: {reasons}",
    poor: "Ice or weather conditions not ideal—better to watch from the sidelines: {reasons}"
  }
},
ice_fishing: {
  templates: {
    perfect: "Solid ice and calm conditions—great ice fishing today: {reasons}",
    good: "Good conditions to drop a line through the ice: {reasons}",
    poor: "Dangerous ice or weather—best to postpone your ice fishing trip: {reasons}"
  },
  omitReasons: ['month']
},
  bbq: {
  templates: {
    perfect: "Sunshine and gentle breeze—perfect BBQ weather: {reasons}",
    good: "Good conditions to fire up the grill and enjoy: {reasons}",
    poor: "Rain or wind might spoil the sizzle—better to wait on the BBQ: {reasons}"
  }
},
outdoor_reading: {
  templates: {
    perfect: "Calm and bright—perfect for getting lost in a book outside: {reasons}",
    good: "Nice day to enjoy your reading nook outdoors: {reasons}",
    poor: "Cloudy or windy—might be best to read indoors today: {reasons}"
  }
},
outdoor_playground: {
  templates: {
    perfect: "Clear skies and safe grounds—perfect playground weather: {reasons}",
    good: "Good day for playtime and fun outside: {reasons}",
    poor: "Wet or slippery—better to keep the playground visits short today: {reasons}"
  }
},
outdoor_chess: {
  templates: {
    perfect: "Peaceful and pleasant—perfect for a game of chess in the park: {reasons}",
    good: "Good weather to enjoy some outdoor strategy: {reasons}",
    poor: "Wind or clouds might interrupt your moves—better indoors today: {reasons}"
  }
},
outdoor_painting: {
  templates: {
    perfect: "Bright light and gentle breeze—ideal plein air painting conditions: {reasons}",
    good: "Good day to set up your easel outside: {reasons}",
    poor: "Unfavorable weather for painting outdoors—keep the canvas inside: {reasons}"
  }
},
outdoor_music: {
  templates: {
    perfect: "Clear skies and warm air—perfect for outdoor music sessions: {reasons}",
    good: "Good conditions to share your tunes outside: {reasons}",
    poor: "Wind or rain might dampen the mood—better save outdoor music for another day: {reasons}"
  }
},
tai_chi: {
  templates: {
    perfect: "Calm and serene—perfect for tai chi practice outdoors: {reasons}",
    good: "Good weather to move and breathe outside: {reasons}",
    poor: "Windy or unsettled conditions—better to find your zen indoors today: {reasons}"
  }
}

};



export function getActivityMessage(
  activityId: string,
  category: 'perfect' | 'good' | 'poor',
  reasons: { key: string; value: any; label: string }[]
): string {
  const config = activityMessages[activityId];
  if (!config) return '';
  const filteredReasons = reasons.filter(
    r => !(config.omitReasons || []).includes(r.key)
  );
const reasonText = reasons.map(r => r.label.trim().replace(/\.$/, '')).join('. ') + '.';  const template = config.templates[category];
  return template.replace('{reasons}', reasonText);
}