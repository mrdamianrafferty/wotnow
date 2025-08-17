export type ActivityMessageConfig = {
  templates: {
    perfect: string;
    good: string;
    fair: string;
    poor: string;
  };
  omitReasons?: string[];
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
    perfect: "Steady breeze and calm seas—perfect day to set sail and enjoy the water. {reasons}",
    good: "Good winds and manageable waves—great for a relaxed sail or honing your skills. {reasons}",
    fair: "A bit gusty but still worth it—grab your gear and head out. {reasons}",
    poor: "Winds or waves are not in your favour—best to keep the boat docked for now. {reasons}"
  },
  omitReasons: ['month']
},

hiking: {
  templates: {
    perfect: "Blue skies, clear trails—get those boots on. {reasons}",
    good: "A solid day for some trail time. {reasons}",
    fair: "A bit marginal but still passable—time to explore. {reasons}",
    poor: "Might be best to admire the peaks from indoors today. {reasons}"
  }
},
mountain_biking: {
  templates: {
    perfect: "Hero dirt and clear skies—shred it!. {reasons}",
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
    perfect: "The pitch is perfect and the ball's bouncing true—a cracker of a day to play. {reasons}",
    good: "Decent enough conditions for a bit of football. {reasons}",
    fair: "Bit rough out, but sure you’d manage a kickabout all the same. {reasons}",
    poor: "Dodgy weather for football—might be better to have a pint. {reasons}"
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
    perfect: "Glass-calm water—SUP heaven. {reasons}",
    good: "Good conditions for paddling and balance. {reasons}",
    fair: "A bit choppy but still manageable—grab your board. {reasons}",
    poor: "Chop or wind make it tricky—maybe sit this session out. {reasons}"
  }
},
  snorkeling: {
  templates: {
    perfect: "Waters are crystal clear—snorkel paradise awaits. {reasons}",
    good: "Decent visibility and gentle seas—grab your mask. {reasons}",
    fair: "A bit choppy but still some fish to see—don't forget your gear. {reasons}",
    poor: "Surf's up or currents strong—best to skip snorkeling today. {reasons}"
  }
},
scuba_diving: {
  templates: {
    perfect: "Blue depths beckon—prime conditions to dive in. {reasons}",
    good: "Steady currents and good viz—solid day to explore. {reasons}",
    fair: "A bit of current but still plenty to see—but be careful. {reasons}",
    poor: "Seas are unsettled or murky—dive another day. {reasons}"
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
    perfect: "Sun's out, sea's calm—ultimate beach day. {reasons}",
    good: "Pack your towel—good times await on the sand. {reasons}",
    fair: "A few clouds but still nice—enjoy the beach. {reasons}",
    poor: "High winds or stormy skies—best to plan the beach for another day. {reasons}"
  }
},
camping: {
  templates: {
    perfect: "Starry skies and gentle breezes—pitch that tent. {reasons}",
    good: "Decent weather for a night under canvas. {reasons}",
    fair: "Not ideal but that's half the fun—bring extra layers. {reasons}",
    poor: "Storms or chill in the air—maybe hold off on camping. {reasons}"
  }
},
picnicking: {
  templates: {
    perfect: "Blankets down and baskets out—it's a perfect picnic day. {reasons}",
    good: "Fresh air and fine skies—ideal for alfresco snacks. {reasons}",
    fair: "Conditions are decent for a picnic—just bring a backup plan. {reasons}",
    poor: "Breezy or wet—picnic indoors and save the park for next time. {reasons}"
  }
},
geocaching: {
  templates: {
    perfect: "Clear skies and firm ground—time for a geocaching quest. {reasons}",
    good: "Solid hiding and seeking weather—GPS at the ready. {reasons}",
    fair: "A bit muddy or windy but still findable—grab your gear. {reasons}",
    poor: "Rain, mud, or fog—track down caches another day. {reasons}"
  }
},
 outdoor_gym: {
  templates: {
    perfect: "Fresh air and sunshine—prime time for outdoor gym gains. {reasons}",
    good: "Solid conditions to get your workout on outside. {reasons}",
    fair: "A bit breezy or drizzly but still doable—time to hit the outdoor gym. {reasons}",
    poor: "Rain or cold's got the upper hand—save the muscle for another day. {reasons}"
  }
},
outdoor_yoga: {
  templates: {
    perfect: "Sun-kissed mats and peaceful vibes—outdoor yoga bliss. {reasons}",
    good: "Nice breeze and open skies—unroll the mat for some flow. {reasons}",
    fair: "A bit windy or chilly but still manageable—find your zen outdoors. {reasons}",
    poor: "Wind or weather might disrupt your zen—try indoor yoga today. {reasons}"
  }
},
outdoor_meditation: {
  templates: {
    perfect: "Calm, quiet, and perfect air—ideal for outdoor meditation. {reasons}",
    good: "Serene enough for mindful moments outdoors. {reasons}",
    fair: "A bit breezy but still peaceful—find your calm outside. {reasons}",
    poor: "Noise or weather out of balance—find some calm indoors instead. {reasons}"
  }
},
dog_walking: {
  templates: {
    perfect: "Paws up! It's a great day to walk the dog. {reasons}",
    good: "Leash up—solid weather for a stroll with your buddy. {reasons}",
    fair: "The dog will enjoy it much more than you today—maybe a shorter walk today. {reasons}",
    poor: "Greys or rain holding you back—maybe just a quick loop today. {reasons}"
  }
},
photography: {
  templates: {
    perfect: "Light's magic, skies are stunning—get out and capture the moment. {reasons}",
    good: "Grab your camera—decent light and some inspiration out there. {reasons}",
    fair: "Conditions are manageable for photography—still opportunities to explore. {reasons}",
    poor: "Challenging conditions for photography—might be worth waiting for better light. {reasons}"
  }
},
  // Add any additional outdoor activities from emojiMap here
  canoeing: {
  templates: {
    perfect: "Calm waters and blue skies—paddle on, it's perfect for canoeing. {reasons}",
    good: "Steady water and fresh air—worth launching your canoe. {reasons}",
    fair: "A bit choppy but still manageable—grab your paddle and go. {reasons}",
    poor: "Winds or weather aren't on your side—safer to stay ashore for canoes today. {reasons}"
  }
},
jetskiing: {
  templates: {
    perfect: "Sun's out, water's smooth—prime time to rev up the jet ski. {reasons}",
    good: "Decent conditions for a fun jet skiing session. {reasons}",
    fair: "A bit bumpy but still rideable if you absolutely insist. {reasons}",
    poor: "Choppy waves or gusty winds—best park the jet ski and ride another day. {reasons}"
  }
},
  
  fly_fishing_freshwater: {
  templates: {
    perfect: "Hatches rising and clear water—prime time to cast your fly. {reasons}",
    good: "Steady trout activity—good for refining that drift and presentation. {reasons}",
    fair: "A bit tricky but still worth a cast—time to hit the water. {reasons}",
    poor: "Tricky conditions for fly fishing—might be best to watch the water today. {reasons}"
  }
},
coarse_fishing: {
  templates: {
    perfect: "Bite alarms ready—ideal weather to chase that PB. {reasons}",
    good: "Solid conditions to settle in and enjoy your session. {reasons}",
    fair: "A bit slow but still some bites to be had—time to cast a line. {reasons}",
    poor: "Tough conditions for fishing today—fish won't be feeding actively. {reasons}"
  }
},
sea_fishing_shore: {
  templates: {
    perfect: "Fish the incoming tide, and bag a shore catch. {reasons}",
    good: "Steady bites—great day to try your luck from the beach. {reasons}",
    fair: "A bit hit and miss but still fishable—time to cast from the shore. {reasons}",
    poor: "Shore fishing could be a challenge today. {reasons}"
  }
},
sea_fishing_boat: {
  templates: {
    perfect: "Clear skies and calm seas—prime boat fishing conditions. {reasons}",
    good: "Steady weather and good marks—solid day on the water. {reasons}",
    fair: "A bit of chop but still plenty to catch—time to head out but bring some motion sickness pills. {reasons}",
    poor: "Rough seas or safety concerns—best to anchor the boat and wait it out. {reasons}"
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
    perfect: "Solid ice and calm conditions—great ice fishing today. {reasons}",
    good: "Good conditions to drop a line through the ice. {reasons}",
    fair: "A bit sketchy but still fishable—time to bundle up and try. {reasons}",
    poor: "Dangerous ice or weather—best to postpone your ice fishing trip. {reasons}"
  },
  omitReasons: ['month']
},
  bbq: {
  templates: {
    perfect: "Sunshine and gentle breeze—perfect BBQ weather. {reasons}",
    good: "Good conditions to fire up the grill and enjoy. {reasons}",
    fair: "A bit 🤷 but still manageable—time to grill up some fun. {reasons}",
    poor: "Rain or wind might spoil the sizzle—better to wait on the BBQ. {reasons}"
  }
},
outdoor_reading: {
  templates: {
    perfect: "Calm and bright—perfect for getting lost in a book outside. {reasons}",
    good: "Nice day to enjoy your reading nook outdoors. {reasons}",
    fair: "A bit breezy or cloudy but still cozy enough to read outside. {reasons}",
    poor: "Cloudy or windy—might be best to read indoors today. {reasons}"
  }
},
outdoor_playground: {
  templates: {
    perfect: "Clear skies and safe grounds—perfect playground weather. {reasons}",
    good: "Good day for playtime and fun outside. {reasons}",
    fair: "Weather is 🤷 but the kids don't care—time for some outdoor fun. {reasons}",
    poor: "Wet or slippery—better to keep the playground visits short today. {reasons}"
  }
},
outdoor_chess: {
  templates: {
    perfect: "Peaceful and pleasant—perfect for a game of chess in the park. {reasons}",
    good: "Good weather to enjoy some outdoor strategy. {reasons}",
    fair: "A bit breezy but still manageable—time to set up the board outside. {reasons}",
    poor: "Wind or clouds might interrupt your moves—better indoors today. {reasons}"
  }
},
outdoor_painting: {
  templates: {
    perfect: "Bright light and gentle breeze—ideal plein air painting conditions. {reasons}",
    good: "Good day to set up your easel outside. {reasons}",
    fair: "A bit breezy but still inspiring—time to paint outdoors. {reasons}",
    poor: "Unfavorable weather for painting outdoors—keep the canvas inside. {reasons}"
  }
},
outdoor_music: {
  templates: {
    perfect: "Clear skies and warm air—perfect for outdoor music sessions. {reasons}",
    good: "Good conditions to share your tunes outside. {reasons}",
    fair: "A bit 🤷 but still enjoyable—time to play some music outdoors. {reasons}",
    poor: "Wind or rain might dampen the mood—better save outdoor music for another day. {reasons}"
  }
},
tai_chi: {
  templates: {
    perfect: "Calm and serene—perfect for tai chi practice outdoors. {reasons}",
    good: "Good weather to move and breathe outside. {reasons}",
    fair: "Weather a bit 🤷 but still manageable—time to find your flow outdoors. {reasons}",
    poor: "Windy or unsettled conditions—better to find your zen indoors today. {reasons}"
  }
},
american_football: {
  templates: {
    perfect: "Gridiron glory! Crisp air, dry field—prime time for pigskin. {reasons}",
    good: "Decent field conditions—plenty good for drills or a friendly scrimmage. {reasons}",
    fair: "Bit sketchy, but hey—tape up, run some plays, make it count. {reasons}",
    poor: "Slick turf and nasty weather—might be smarter to break down game film today. {reasons}"
  }
},
baseball: {
  templates: {
    perfect: "Sun’s out, field’s dry—perfect day to knock it outta the park. {reasons}",
    good: "Decent diamond and clear skies—grab your glove and let’s play ball. {reasons}",
    fair: "Bit of drizzle or wind, but nothing we haven’t played through—game on. {reasons}",
    poor: "Pitch is soaked or wind’s a mess—better bench it and save your arm. {reasons}"
  }
},

cricket: {
  templates: {
    perfect: "Wicket's dry, sky is clear—textbook cricket weather. {reasons}",
    good: "Decent bounce and no showers—grab the pads and get out there. {reasons}",
    fair: "Could go either way—keep the covers handy and see how it plays. {reasons}",
    poor: "Pitch is a bog or it's blowing sideways—probably a day for the highlights reel. {reasons}"
  }
},

ice_hockey: {
  templates: {
    perfect: "Cracking cold—prime day for some outdoor puck. {reasons}",
    good: "Decent freeze and not too gusty—grand for a proper match. {reasons}",
    fair: "Bit slushy or breezy, but sure it’s still a runabout with the lads. {reasons}",
    poor: "Puck’ll sink or wind’ll steal it—probably wise to head for the indoor rink. {reasons}"
  }
},
field_hockey: {
  templates: {
    perfect: "Dry pitch and perfect temp—let’s stick it to ’em. {reasons}",
    good: "Conditions are grand—grab the shinguards and go. {reasons}",
    fair: "Bit blowy or damp, but still worth a match. {reasons}",
    poor: "Soaked pitch or gusty chaos—maybe hit the tactics board instead. {reasons}"
  }
},

  padel: {
    templates: {
      perfect: "Sun's shining and the court’s dry—grab your mates and smash it. {reasons}",
      good: "Decent enough for a rally—just mind the breeze. {reasons}",
      fair: "Bit warm or blowy, but grand for a casual knockabout. {reasons}",
      poor: "Courts are soaked or the sun’s scorchin’—maybe hit the indoor court instead. {reasons}"
    }
  },
  pickleball: {
    templates: {
      perfect: "Clear skies and perfect temps—time to dink and smash. {reasons}",
      good: "Decent bounce and not too breezy—grab your paddle and go. {reasons}",
      fair: "Bit gusty or warm, but you’ll get a good rally in. {reasons}",
      poor: "Slick court or roasting heat—might be better to sit this match out. {reasons}"
    }
  },

  netball: {
    templates: {
      perfect: "Bright skies and calm air—spot on for netball drills or a proper match. {reasons}",
      good: "Conditions are decent—grab your bibs and have a go. {reasons}",
      fair: "Bit gusty or grey, but grand for keeping sharp and passing around. {reasons}",
      poor: "Too wild or wet to play safely—maybe stick to tactics and dry runs indoors. {reasons}"
    }
  },

  rock_hopping: {
    templates: {
      perfect: "Clear skies and dry rocks—ideal day for hopping about the shore. {reasons}",
      good: "Good grip and nice weather—mind your step and explore. {reasons}",
      fair: "Bit slippy or windy, but still worth a careful clamber. {reasons}",
      poor: "Waves, rain, or slick rocks—probably not worth the tumble. {reasons}"
    }
  },
rugby: {
  templates: {
    perfect: "Firm ground and crisp air—ideal for big hits and flowing rugby. {reasons}",
    good: "Conditions are solid—plenty of grip for a good running game. {reasons}",
    fair: "Bit greasy or blustery, but grand for a good old forwards battle. {reasons}",
    poor: "Pitch is a swamp or wind’s howling—maybe better to review the playbook. {reasons}"
  }
},
  archery: {
    templates: {
      perfect: "Clear skies and steady hands—perfect for nocking arrows and hitting bullseyes. {reasons}",
      good: "Decent weather to fine-tune your aim—time to draw and release. {reasons}",
      fair: "A bit breezy or grey, but still manageable for some target practice. {reasons}",
      poor: "Wind or rain could throw off your aim—maybe fletch some arrows instead. {reasons}"
    }
  },
  riding_motorbike: {
    templates: {
      perfect: "Dry roads and open skies—ideal for a scenic ride. {reasons}",
      good: "Conditions are decent—saddle up and enjoy the road. {reasons}",
      fair: "A bit of wind or cloud, but still rideable—take it steady. {reasons}",
      poor: "Wet, windy, or just plain risky—best save the trip for another day. {reasons}"
    }
  },
  cycling: {
    templates: {
      perfect: "Sun on your back and smooth tarmac—crackin' day for a proper spin. {reasons}",
      good: "Grand weather to clock a few miles and clear the head. {reasons}",
      fair: "Bit of a breeze or damp patch, but still worth gettin’ the legs movin’. {reasons}",
      poor: "Windy, wet, or dodgy roads—probably better to tune the bike or put the feet up. {reasons}"
    }
  },
football_soccer: {
  templates: {
    perfect: "Pitch is mint and the weather’s a dream—time for a beautiful game. {reasons}",
    good: "Conditions are solid—great day for a proper kickabout. {reasons}",
    fair: "Bit iffy, but you'll still get a good match in—just mind your footing. {reasons}",
    poor: "Pitch is a puddle or the wind’s gone mad—might be best to call it off. {reasons}"
  }
},  
  frisbee: {
    templates: {
      perfect: "Clear skies and no wind—time for some serious hucking. {reasons}",
      good: "Good conditions for a game or a throw-around in the park. {reasons}",
      fair: "Bit gusty or cloudy, but still good for a casual toss about. {reasons}",
      poor: "Wind's wild or rain’s coming in sideways—best leave the disc at home. {reasons}"
    }
  },
  golf: {
    templates: {
      perfect: "Sun’s out, greens are rolling—time to hit the fairways. {reasons}",
      good: "Solid conditions—good day to work on your game. {reasons}",
      fair: "Bit breezy or damp, but still a decent round if you’re keen. {reasons}",
      poor: "Wet greens or wild wind—maybe head to the range or clubhouse. {reasons}"
    }
  },
  hockey: {
    templates: {
      perfect: "Pitch is prepped and skies are fair—stick down and game on. {reasons}",
      good: "Conditions are decent—plenty fine for a solid match. {reasons}",
      fair: "Bit dodgy underfoot or breezy, but grand for a knockabout. {reasons}",
      poor: "Pitch is boggy or weather’s wild—best to regroup and wait it out. {reasons}"
    }
  },
    tennis: {
    templates: {
      perfect: "Courts are dry and the breeze is just right—ace day for tennis. {reasons}",
      good: "Decent bounce and clear skies—grab your racquet. {reasons}",
      fair: "Bit breezy or warm but still good for a rally or two. {reasons}",
      poor: "Slippery courts or wild winds—maybe time to watch Wimbledon highlights instead. {reasons}"
    }
  },
    wild_swimming: {
    templates: {
      perfect: "Water’s like glass and the sun’s peepin’ out—prime for a dip. {reasons}",
      good: "Bit fresh but still a fine day for a wild swim. {reasons}",
      fair: "Chilly or breezy, but sure it’ll waken you up—bring a towel and a flask. {reasons}",
      poor: "Waves are up or the sky’s throwin’ shade—better to wait it out. {reasons}"
    }
  },
beach_volleyball: {
  templates: {
    perfect: "Sun’s out, sand’s prime—game on! Time to spike and dive. {reasons}",
    good: "Solid beach vibes—grab your mates and hit the court. {reasons}",
    fair: "Bit breezy or grey, but still good for a casual rally or two. {reasons}",
    poor: "Sand’s soggy or wind’s wild—probably best to chill and save it for later. {reasons}"
  }
},
  horse_riding: {
    templates: {
      perfect: "Sun’s out, hooves down—perfect day for a ride through the fields. {reasons}",
      good: "Solid ground and good weather—saddle up and enjoy the trot. {reasons}",
      fair: "Bit mucky or gusty, but still rideable if you take it easy. {reasons}",
      poor: "Slippery trails or wild wind—best to keep the horse dry and safe. {reasons}"
    }
  },
  orienteering: {
    templates: {
      perfect: "Clear skies and firm ground—ideal for getting lost (on purpose). {reasons}",
      good: "Good day for map and compass adventures—get exploring. {reasons}",
      fair: "Bit rough underfoot but still fun—just mind your bearings. {reasons}",
      poor: "Rain, fog, or wild wind—navigation could be sketchy, maybe wait it out. {reasons}"
    }
  },
  snorkelling: {
    templates: {
      perfect: "Water’s crystal clear and calm—snorkel heaven awaits. {reasons}",
      good: "Good visibility and light current—plenty to see below the surface. {reasons}",
      fair: "A bit choppy but still doable—keep it close to shore. {reasons}",
      poor: "Rough seas or murky water—best to stay dry and try tomorrow. {reasons}"
    }
  },
  sailing_inland: {
    templates: {
      perfect: "Perfect lake conditions—ideal breeze and calm waters for inland sailing. {reasons}",
      good: "Good winds on sheltered waters—great for a relaxed sail or skills practice. {reasons}",
      fair: "Conditions are decent enough for lake sailing—time to hoist the sails. {reasons}",
      poor: "Wind conditions aren't suitable for sailing—best to keep the boat on dry land. {reasons}"
    },
    omitReasons: ['month']
  },
  windsurfing_inland: {
    templates: {
      perfect: "Prime lake conditions for windsurfing—steady winds and flat water. {reasons}",
      good: "Good wind strength and calm waters—ideal for inland windsurfing. {reasons}",
      fair: "Conditions are adequate for lake windsurfing—grab your gear. {reasons}",
      poor: "Wind conditions aren't right for windsurfing—maybe work on rigging instead. {reasons}"
    },
    omitReasons: ['month']
  },
  sup_sea: {
    templates: {
      perfect: "Calm seas and perfect conditions for stand-up paddleboarding. {reasons}",
      good: "Good conditions for SUP—manageable waves and steady weather. {reasons}",
      fair: "Conditions are decent for coastal paddleboarding—stay close to shore. {reasons}",
      poor: "Sea conditions aren't safe for SUP—stick to sheltered waters or skip today. {reasons}"
    }
  },
  sea_kayaking: {
    templates: {
      perfect: "Tides are calling—prime paddling conditions ahead. {reasons}",
      good: "Grab your paddle, the sea's welcoming. {reasons}",
      fair: "Conditions are adequate for a coastal paddle. {reasons}",
      poor: "Sea conditions aren't ideal for kayaking—stay closer to shore or skip today. {reasons}"
    }
  },
  basketball_outdoor: {
    templates: {
      perfect: "Court's dry and the weather's perfect—time to shoot some hoops. {reasons}",
      good: "Solid conditions for a game—grab the ball and let's play. {reasons}",
      fair: "Bit breezy or cloudy but still good for a pickup game. {reasons}",
      poor: "Wet court or harsh conditions—better to hit the indoor courts today. {reasons}"
    }
  },
  outdoor_gardening: {
    templates: {
      perfect: "Soil's ready and the sun's shining—perfect day to tend the garden. {reasons}",
      good: "Good conditions for planting, weeding, or harvesting. {reasons}",
      fair: "Bit muddy or overcast but still manageable—time to get your hands dirty. {reasons}",
      poor: "Too wet or harsh for gardening—maybe plan what to plant next instead. {reasons}"
    }
  },
  beekeeping: {
    templates: {
      perfect: "Calm, warm weather—ideal day to visit the hives and check on your bees. {reasons}",
      good: "Good conditions for hive inspection—bees should be active and manageable. {reasons}",
      fair: "Weather's okay but bees might be a bit cranky—suit up and be careful. {reasons}",
      poor: "Too windy, cold, or wet—bees won't be happy, better to leave them be today. {reasons}"
    }
  },
  curling: {
    templates: {
      perfect: "Ice is keen and conditions are spot-on—perfect for sweeping up a win. {reasons}",
      good: "Solid ice conditions—grab your broom and slide into action. {reasons}",
      fair: "Ice is a bit rough but still playable—mind your delivery. {reasons}",
      poor: "Ice conditions aren't ideal—maybe watch the pros instead. {reasons}"
    },
    omitReasons: ['month']
  },
};



export function getActivityMessage(
  activityId: string,
  category: 'perfect' | 'good' | 'fair' | 'poor',
  reasons: { key: string; value: any; label: string }[] = []
): string {
  const config = activityMessages[activityId];
  if (!config) return 'Enjoy!';

  const arr = Array.isArray(reasons) ? reasons : [];
  
  // Special handling for surfing when rating is poor
  if (activityId === 'surfing' && category === 'poor') {
    const waveReason = arr.find(r => r.key === 'wave');
    if (waveReason) {
      const waveHeight = waveReason.value || 0;
      
      // Prepend specific wave condition information
      if (waveHeight < 0.5) {
        return `Keep that board in the van. Waves are too small today. ${getReasonText(arr, config.omitReasons)}`; 
      } 
      else if (waveHeight > 2.5) {
        return `Warning: Dangerous surf conditions! Waves too large for safe surfing. ${getReasonText(arr, config.omitReasons)}`;
      }
    }
  }
  
  // Standard processing for other activities
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
