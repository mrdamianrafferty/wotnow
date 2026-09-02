import type { ActivityType } from './types';

export const lifestyleActivities: ActivityType[] = [
  
  
  
  {
    id: 'cooking',
    name: 'Cook Something',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['creativity', 'relaxation', 'home', 'family', 'Saturday', 'Sunday', 'evening']
  },
  {
    id: 'crafts',
    name: 'Do Some Crafts',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['relaxation', 'hobby', 'home', 'craft', 'Wednesday', 'Thursday', 'Sunday', 'evening', 'solo']
  },
  
  
  {
    id: 'dance',
    name: 'Dance',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['fun', 'art', 'music', 'social', 'evening', 'Friday', 'Saturday'],
  },
  {
    id: 'diy',
    name: 'Do Some DIY',
    category: 'Indoor Recreation',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['craft', 'home', 'practical', 'Saturday', 'Sunday', 'evening', 'creative']
  },
  {
    id: 'dog_walking',
    name: 'Walk the Dog',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: [
      'leisure', 'outdoor', 'animal', 'pet', 'exercise', 'social',
      'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    ],

    /**
     * ─── The wind ladder was unreachable, fixed 2026-09 ──────────────────
     *
     * POOR was `windSpeed>30`. The engine's units are metres per second, so that
     * is 108 km/h — above the universal danger cut-off the scorer applies to
     * every outdoor activity, and above anything the British Isles record
     * outside a named storm. FAIR at 20–30 m/s (39–58 knots) was equally out of
     * reach.
     *
     * So this model has never once applied a wind limit: every wind verdict it
     * produced came from the separate recommendation table instead. Measured, it
     * scored 92 and "perfect" at Force 4 and was still 62 and "Good" at Force 6.
     *
     * The replacement is what a reservoir perimeter path is actually like with a
     * dog on a lead: fine to a stiff breeze, hard work in a Force 6, and no
     * pleasure at all above it.
     */
    poorConditions: [
      'precipitation>5',               // heavy rain
      'windSpeed>13',                  // Force 7 — leads, litter and no conversation
      'gust>18',
      'temperature<-2 or temperature>32', // icy paws or heatstroke risk
      'soilMoisture<10 or soilMoisture>60', // icy pavements or boggy fields
      'snowfallRateMmH>1',             // active snowfall reduces visibility & paw grip
      'snowDepthCm>4'                  // deeper snow becomes exhausting & icy
    ],

    // Chilly, warm, or damp — not ideal, but you go anyway
    fairConditions: [
      'temperature=-2..5 or 30..32',   // cold or hot but brief walks doable
      'windSpeed=9..13',               // Force 5–6, blustery on an open bank
      'gust=13..18',
      'precipitation=1..5',            // drizzle or showery
      'soilMoisture=10..15 or soilMoisture=45..60',
      'visibility=2..5'                // hazy but not unsafe
    ],

    // The usual “it’ll do” kind of weather
    goodConditions: [
      'temperature=5..30',             // tolerable range even if not ideal
      'windSpeed<9',                   // to about 17 kn — manageable on a lead
      'gust<13',
      'precipitation=0..1',            // light or no rain
      'soilMoisture=15..45',
      'visibility>2'                   // safe to see surroundings
    ],

    // Your dog stops every five steps to sniff the flowers — it’s that nice
    perfectConditions: [
      'temperature=16..22',
      'windSpeed<5',                   // to about 10 kn — still enough to be pleasant
      'gust<8',
      'precipitation=0',
      'soilMoisture=20..35',
      'visibility>10'
    ],

    seasonalMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Every month is a dog month

    indoorAlternative: 'Play tug or hide-and-seek indoors, or practise new tricks'
  },
  
  
  {
    id: 'gaming',
    name: 'Play Some Games',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['home','leisure','Tuesday','Wednesday','Thursday','cultural']
  },
 
  {
    id: 'going_to_pub',
    name: 'Go to the Pub',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'leisure', 'relaxation', 'group', 'Sunday', 'Thursday', 'Friday', 'Saturday', 'evening'],
  },
  
 
 
 
  {
    id: 'knitting',
    name: 'Do Some Knitting',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['relaxation', 'hobby', 'home', 'craft', 'Wednesday', 'Thursday', 'Sunday', 'evening', 'solo'],
  },
  {
    id: 'make_music',
    name: 'Make Music',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['music', 'creativity', 'relaxation', 'leisure', 'Saturday', 'Sunday', 'evening', 'home'],
  },
  
 
  {
    id: 'outdoor_chess',
    name: 'Play Chess in the Park',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'strategy', 'outdoor', 'social', 'Saturday', 'Sunday'],
    poorConditions: [
      'precipitation>0.1',             // rain ruins the board
      'windSpeed>8',                // blows pieces away
      'temperature<2',               // fingers too cold to move pieces
      'temperature>30',              // overheated and uncomfortable
      'visibility<2',                // can't see the board
      'snowfallRateMmH>0.5',         // flakes soak boards & reduce contrast
      'snowDepthCm>0.5',              // even light snow covers squares & benches
      'gust>11'],
    fairConditions: [
      'temperature=2..10',           // brisk, but playable with gloves
      'temperature=26..30',          // warm but tolerable in shade
      'windSpeed=5.5..8',            // breezy, may need to hold the board
      'cloudCover=80..100',           // grey skies, low contrast
      'visibility=2..5',              // misty but moody
      'precipitation=0',               // light drizzle acceptable,
      'gust=8.8..11'],
    goodConditions: [
      'temperature=10..26',
      'windSpeed<5.5',
      'cloudCover=0..80',
      'visibility>5',
      'precipitation=0',
      'gust<8.8'],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed<3',
      'cloudCover=20..50',
      'visibility>10',
      'precipitation=0',
      'gust<6.1'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Play online, at a café, or solve puzzles at home'
  },
  
  {
    id: 'outdoor_music',
    name: 'Play Music Outdoors',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: true,
    tags: ['music', 'performance', 'practice', 'social', 'creative', 'Friday', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<8',                // cold fingers, detuning
      'temperature>30',              // heat discomfort, glue softens
      'windSpeed>8',                // disruptive
      'precipitation>1',             // even drizzle can ruin wood
      'humidity>85',                 // too damp
      'visibility<2',                // fog, unsafe
      'snowfallRateMmH>0.5',         // snowfall saturates instruments quickly
      'snowDepthCm>0.5',              // snow on seating/stage is unsafe
      'gust>11'
    ],
    fairConditions: [
      'temperature=8..12',           // chilly but playable in a coat
      'temperature=25..30',          // hot, shady spot needed
      'windSpeed=5.5..8',            // breezy, might need to anchor music
      'cloudCover=70..90',            // grey skies, less vibrant
      'humidity=70..85',             // damp but manageable
      'visibility=2..5',              // misty but atmospheric
      'precipitation=0',
      'gust=8.8..11'
    ],
    goodConditions: [
      'temperature=12..25',
      'windSpeed<5.5',
      'cloudCover=10..70',
      'precipitation=0',
      'humidity=40..70',
      'visibility>5',
      'gust<8.8'
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed<3',
      'cloudCover=20..50',
      'precipitation=0',
      'humidity=50..65',
      'visibility>10',
      'gust<6.1'
    ],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Practise at home, compose, or maintain instruments'
  },
  {
    id: 'outdoor_painting',
    name: 'Paint Outdoors',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: true,
    tags: ['art', 'outdoor', 'relaxation', 'mindfulness', 'hobby', 'Saturday', 'Sunday', 'holiday'],

    // Unsafe, uncomfortable, or impractical for painting
    poorConditions: [
      'precipitation>0',            // rain spoils paper, canvas, paint
      'windSpeed>8',               // blows over easel & supplies
      'temperature<5',              // too cold for hands & comfort
      'temperature>30',             // uncomfortable & damaging to paints
      'humidity>85',                // damp & sticky, paper curls
      'visibility<2',               // fog or very poor light
      'snowfallRateMmH>0.5',        // snowflakes ruin canvases instantly
      'snowDepthCm>0.5',             // snow-covered ground impractical for setup
      'gust>11'
    ],

    // Conditions that require adaptation (wind blocks, sun shelter, etc.)
    fairConditions: [
      'temperature=5..12 or 26..30', // chilly or quite warm
      'windSpeed=5.5..8',            // breezy, may disturb paper
      'humidity=75..85',             // sticky, paint drying issues
      'cloudCover=80..100',           // gloomy light
      'visibility=2..5',              // hazy or diffuse light
      'gust=8.8..11'
    ],

    // Comfortable and pleasant painting conditions
    goodConditions: [
      'temperature=12..26',          // pleasant range
      'windSpeed<5.5',                // calm to light breeze
      'cloudCover=10..80',            // even overcast is fine
      'humidity<75',                 // workable
      'visibility>5',                 // decent light
      'precipitation=0',      // no Rain,
      'gust<8.8'
    ],

    // Ideal weather for outdoor painting
    perfectConditions: [
      'temperature=18..22',          // ideal comfort
      'windSpeed<3',                 // very calm
      'cloudCover=20..50',            // some sun for highlights
      'humidity=50..65',              // comfortable
      'visibility>10' ,               // clear & bright
      'precipitation=0',      // no Rain,
      'gust<6.1'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

    indoorAlternative: 'Work on studio pieces, practise techniques, or plan your next plein air session'
  },
  {
    id: 'outdoor_reading',
    name: 'Read in the Park',
    category: 'Outdoor Activities',
    secondaryCategory: 'Literature',
    weatherSensitive: true,
    tags: [
      'leisure', 'outdoor', 'relaxation', 'mindfulness', 'quiet',
      'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    ],

    poorConditions: [
      'precipitation>0',            // rain ruins book & comfort
      'windSpeed>8',               // pages blow, unpleasant
      'temperature<8',              // too chilly to sit still
      'temperature>30',             // too hot for comfort
      'humidity>85',                // muggy & sticky
      'visibility<2',               // gloomy or foggy
      'snowfallRateMmH>0.5',        // snow wets pages and reduces visibility
      'snowDepthCm>0.5',             // benches covered or icy
      'gust>11'
    ],

    fairConditions: [
      'temperature=8..12 or 26..30',  // a little cool or warm, tolerable
      'windSpeed=5.5..8',             // breezy but doable if sheltered
      'humidity=75..85',              // slightly muggy
      'cloudCover=80..100',            // heavy overcast
      'visibility=2..5',               // dull light but readable
      'precipitation=0',               // no Rain,
      'gust=8.8..11'
    ],

    goodConditions: [
      'temperature=12..26',           // comfortable range
      'windSpeed<5.5',                 // light breeze ok
      'cloudCover=10..80',             // even overcast is fine
      'humidity<75',                  // not too muggy
      'visibility>5',
      'precipitation=0',               // no Rain
      'gust<8.8'
    ],

    perfectConditions: [
      'temperature=18..22',           // ideal comfort
      'windSpeed<3',                  // very calm
      'cloudCover=20..50',             // some sun for light
      'humidity=50..65',               // pleasant
      'visibility>10',
      'precipitation=0',               // no Rain
      'gust<6.1'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

    indoorAlternative: 'Curl up with your book at home or in a cosy café'
  },
  
  {
    id: 'painting',
    name: 'Paint',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: false,
    tags: ['art', 'creativity', 'relaxation', 'Sunday', 'Saturday', 'evening', 'home', 'solo']
  },
  {
    id: 'photography',
    name: 'Take Photos',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: true,
    tags: ['creative', 'outdoors', 'observational', 'nature', 'urban', 'light', 'weather', 'patience', 'Saturday', 'Sunday', 'golden_hour', 'seasonal'],
    poorConditions: [
      'temperature<-10',               // extreme cold, uncomfortable
      'temperature>35',               // oppressive heat
      'windSpeed>12',                 // camera shake, unpleasant
      'precipitation>15',             // reduced from 20 - heavy rain, unsafe for gear
      'visibility<1',                 // reduced from 2 - severe fog/whiteout
      'snowfallRateMmH>2',            // intense snowfall threatens gear and sightlines
      'snowDepthCm>5',                 // deep snow complicates access & tripod setup
      'gust>16'
    ],
    fairConditions: [
      'temperature=-5..5 or temperature=30..35',  // extended cold range, reduced hot range
      'windSpeed=8..12',             // reduced from 20-30 - quite windy but manageable
      'cloudCover=95..100',            // reduced from 90-100 - very overcast only
      'precipitation=8..15',          // reduced from 5-20 - moderate rain
      'visibility=1..3',               // reduced from 2-5 - thick fog/mist
      'gust=12.8..16'
    ],
    goodConditions: [
      'temperature=5..30',            // extended from 0-25 - 22°C should be good!
      'windSpeed<8',                 // increased from 20 - light winds are fine
      'cloudCover=10..95',             // wider range - broken clouds are good!
      'precipitation=0..8',           // increased from 0-5 - light drizzle OK
      'visibility>3',                  // reduced from 5 - excellent visibility is good
      'gust<12.8'
    ],
    perfectConditions: [
      'temperature=10..25',           // extended from 8-18 - more comfortable range
      'windSpeed<4',
      'cloudCover=30..80',             // wider range from 40-70 - broken clouds perfect
      'precipitation=0',
      'visibility>8',                  // reduced from 10 - very good visibility
      'gust<8.8'
    ],
    seasonalMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    indoorAlternative: 'Organise and edit your photos, research new locations, or experiment with indoor lighting and composition'
  },
  
  {
    id: 'playing_cards',
    name: 'Play Cards',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'fun', 'leisure', 'relaxation', 'group', 'Sunday', 'evening', 'Thursday', 'Friday', 'Saturday'],
  },
  {
    id: 'playing_records',
    name: 'Play Records',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['music', 'relaxation', 'leisure', 'solo', 'evening', 'Saturday', 'Friday', 'Sunday', 'home']
  },
  {
    id: 'reading',
    name: 'Read',
    category: 'Creative & Arts',
    secondaryCategory: 'Literature',
    weatherSensitive: false,
    tags: ['relaxation', 'learning', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  
  
  
  
  

  
  {
    id: 'watch_a_movie',
    name: 'Watch TV',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['home','leisure','Tuesday','Wednesday','Thursday','cultural']
  },
  
  
];

export default lifestyleActivities;
