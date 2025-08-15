// All condition keys are normalised: temp → temperature, wind_speed → windSpeed, rain → precipitation

export interface ActivityType {
  id: string;
  name: string;
  category: string;
  secondaryCategory?: string;
  weatherSensitive: boolean;
  tags: string[];
  seasonalMonths?: number[];              // Optional: indicates best months for this activity
  poorConditions?: string[];              // Conditions where the activity becomes unsuitable or unsafe
  fairConditions?: string[];              // Acceptable but not ideal conditions
  goodConditions?: string[];              // Recommended and generally enjoyable
  perfectConditions?: string[];           // Ideal and most desirable conditions
  indoorAlternative?: string;             // Optional fallback if the activity is weather-sensitive
}

/**
 * In which months this activity is considered 'in season' (1 = January, ..., 12 = December)
 */

export const activityTypes: ActivityType[] = [
{
  id: 'running',
  name: 'Running',
  category: 'Fitness & Wellness',
  secondaryCategory: 'Cardio & Running',
  weatherSensitive: true,
  tags: [
    'sport',
    'cardio',
    'exercise',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Saturday',
    'Sunday'
  ],
  perfectConditions: [
    'temperature=10..13',
    'windSpeed<8',
    'clouds=20..60',
    'humidity=45..60',
    'visibility>10',
    'precipitation=0'
  ],
  goodConditions: [
    'temperature=5..20',
    'windSpeed<18',
    'clouds=0..100',
    'humidity<80',
    'visibility>2',
    'precipitation<2'
  ],
  fairConditions: [
    'temperature=0..5 or 20..25',
    'windSpeed<=25',
    'humidity<=90',
    'precipitation<=4',
    'visibility>=1'
  ],
  poorConditions: [
    'temperature<0 or temperature>25..28',
    'windSpeed>25',
    'precipitation>4',
    'humidity>90',
    'visibility<1'
  ]
},
{
  id: 'trail_running',
  name: 'Trail Running',
  category: 'Active Sports',
  secondaryCategory: 'Cardio & Running',
  weatherSensitive: true,
  tags: ['sport', 'trail', 'nature', 'outdoors', 'Saturday', 'Sunday'],
  perfectConditions: [
    'temperature=8..14',
    'windSpeed<8',
    'clouds=10..50',
    'humidity=40..55',
    'visibility>10',
    'precipitation=0'
    // 'firm_trail'
  ],
  goodConditions: [
    'temperature=5..20',
    'windSpeed<15',
    'clouds=0..80',
    'humidity<80',
    'visibility>2',
    'precipitation<2'
    // 'trail_passable'
  ],
  fairConditions: [
    'temperature=2..5 or 20..25',
    'windSpeed<=25',
    'humidity<=90',
    'precipitation=2..4',
    'visibility=1..2'
  ],
  poorConditions: [
    'temperature<2 or temperature>25',
    'windSpeed>25',
    'precipitation>4',
    'humidity>90',
    'visibility<1'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},
{
  id: 'road_cycling',
  name: 'Road Cycling',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'cycling', 'cardio', 'group', 'solo', 'Saturday', 'Sunday', 'Wednesday'],
  perfectConditions: [
    'temperature=16..22',
    'windSpeed<8',
    'clouds=10..50',
    'humidity=40..55',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=10..28',
    'windSpeed<15',
    'clouds=0..80',
    'humidity<80',
    'precipitation<1',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=5..10 or 28..32',
    'windSpeed=15..25',
    'humidity=80..90',
    'precipitation=1..3',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<5 or temperature>32',
    'windSpeed>25',
    'precipitation>3',
    'humidity>90',
    'visibility<2'
  ]
},
{
  id: 'cycling',
  name: 'Cycling',
  category: 'Fitness & Wellness',
  secondaryCategory: 'Cardio & Running',
  weatherSensitive: true,
  tags: ['sport', 'cycling', 'cardio', 'group', 'solo', 'Saturday', 'Sunday', 'Wednesday'],
  perfectConditions: [
    'temperature=18..24',
    'windSpeed<10',
    'clouds=10..50',
    'humidity=40..60',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=14..28',
    'windSpeed<15',
    'clouds=0..80',
    'humidity<75',
    'precipitation<1',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=8..14 or 28..30',
    'windSpeed=15..20',
    'humidity=75..85',
    'precipitation=1..2',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<8 or temperature>30',
    'windSpeed>20',
    'precipitation>2',
    'humidity>85',
    'visibility<2'
  ]
},
{
  id: 'mountain_biking',
  name: 'Mountain Biking',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'cycling', 'trail', 'nature', 'Saturday', 'Sunday'],
  perfectConditions: [
    'temperature=10..18',
    'windSpeed<10',
    'clouds=10..50',
    'humidity=50..65',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=8..24',
    'windSpeed<20',
    'clouds=0..90',
    'humidity<80',
    'precipitation<2',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=4..8 or 24..28',
    'windSpeed=20..30',
    'humidity=80..90',
    'precipitation=2..5',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<4 or temperature>28',
    'windSpeed>30',
    'precipitation>5',
    'humidity>90',
    'visibility<2'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},
  {
  id: 'gravel_biking',
  name: 'Gravel Biking',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'cycling', 'mixed_surface', 'adventure'],
  perfectConditions: [
    'temperature=10..18',
    'windSpeed<8',
    'clouds=20..50',
    'humidity=45..55',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=7..24',
    'windSpeed<15',
    'clouds=0..75',
    'humidity<75',
    'precipitation<1',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=2..7 or 24..28',
    'windSpeed=15..25',
    'humidity=75..90',
    'precipitation=1..4',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<2 or temperature>28',
    'windSpeed>25',
    'precipitation>4',
    'humidity>90',
    'visibility<2'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},
{
  id: 'riding_motorbike',
  name: 'Motorbiking',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'auto', 'social', 'group', 'solo', 'Saturday', 'Sunday', 'Wednesday'],
  perfectConditions: [
    'temperature=16..22',
    'windSpeed<8',
    'clouds=10..50',
    'humidity=40..55',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=10..28',
    'windSpeed<15',
    'clouds=0..80',
    'humidity<75',
    'precipitation<1',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=5..10 or 28..30',
    'windSpeed=15..25',
    'humidity=75..90',
    'precipitation=1..3',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<5 or temperature>30',
    'windSpeed>25',
    'precipitation>3',
    'humidity>90',
    'visibility<2'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},
{
  id: 'fly_fishing_freshwater',
  name: 'Fly Fishing (Freshwater)',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['fishing', 'freshwater', 'technique', 'quiet', 'outdoors', 'patience', 'nature', 'Saturday', 'Sunday', 'Friday'],
  perfectConditions: [
    'temperature=12..18',
    'windSpeed<8',
    'clouds=70..100',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=8..22',
    'windSpeed<12',
    'clouds=50..100',
    'precipitation=0..2',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=4..8 or 22..26',
    'windSpeed=12..20',
    'clouds=20..50',
    'precipitation=2..5',
    'visibility=2..5'
  ],
  poorConditions: [
    'temperature<4 or temperature>26',
    'windSpeed>20',
    'precipitation>5',
    'clouds<20',
    'visibility<2'
  ],
  indoorAlternative: 'Tie some flies',
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9]
},
{
  id: 'outdoor_gardening',
  name: 'Gardening',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['hobby', 'relaxation', 'nature', 'creative', 'Saturday', 'Sunday'],
  perfectConditions: [
    'airTemperature=18..24',
    'windSpeed<5',
    'cloudCover=50..90',
    'humidity=50..70',
    'soilMoisture=30..50',
    'precipitation=0',
    'visibility>10'
  ],
  goodConditions: [
    'airTemperature=12..27',
    'windSpeed<12',
    'cloudCover=50..100',
    'precipitation=0..2',
    'humidity<80',
    'soilMoisture=20..60',
    'visibility>5'
  ],
  fairConditions: [
    'airTemperature=5..12 or 27..32',
    'windSpeed=12..20',
    'cloudCover=20..50',
    'precipitation=2..5',
    'humidity=80..90',
    'soilMoisture=10..20 or 60..70',
    'visibility=2..5'
  ],
  poorConditions: [
    'airTemperature<5 or airTemperature>32',
    'windSpeed>20',
    'precipitation>5',
    'humidity>90',
    'soilMoisture<10 or soilMoisture>70',
    'visibility<2'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  indoorAlternative: 'Plan garden layout or start seedlings indoors'
},
 {
  id: 'surfing',
  name: 'Surfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'waves', 'leisure', 'ocean', 'outdoors', 'sport', 'adventure', 'Friday', 'Saturday', 'Sunday'],
 perfectConditions: [
    'waterTemperature=16..20',
    'airTemperature=18..24',
    'waveHeight=0.8..1.5',
    'swellPeriod=10..12',
    'windSpeed=5..10',
    'windDirection=offshore',
    'gust<8',
    'visibility>10'
  ],
  goodConditions: [
    'waterTemperature=14..26',
    'airTemperature=12..28',
    'waveHeight=0.5..1.8',
    'swellPeriod=8..12',
    'windSpeed=5..15',
    'windDirection=offshore',
    'gust<12',
    'visibility>5'
  ],
  fairConditions: [
    'waterTemperature=12..14 or 26..28',
    'airTemperature=8..12 or 28..30',
    'waveHeight=0.3..0.5 or 1.8..2.5',
    'swellPeriod=6..8 or 12..14',
    'windSpeed=15..20',
    'windDirection=cross-shore',
    'gust=12..18',
    'visibility=2..5'
  ],
  poorConditions: [
    'waterTemperature<12',
    'airTemperature<8 or airTemperature>30',
    'waveHeight<0.3 or waveHeight>2.5',
    'swellPeriod<6 or swellPeriod>14',
    'windSpeed>20',
    'windDirection=onshore',
    'gust>18',
    'visibility<2',
    'precipitation>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Watch surf films or work on your pop-up at home'
},
  {
  id: 'hiking',
  name: 'Hiking',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['nature', 'walking', 'outdoors', 'leisure', 'Saturday', 'Sunday'],
  perfectConditions: [
    'temperature=15..18',
    'windSpeed<10',
    'clouds=20..50',
    'humidity=40..60',
    'visibility>10'
  ],
  goodConditions: [
    'temperature=8..24',
    'windSpeed<15',
    'clouds=20..80',
    'humidity<75',
    'visibility>5'
  ],
  fairConditions: [
    'temperature=2..8 or 24..28',
    'windSpeed=15..25',
    'clouds=0..20 or 80..100',
    'humidity=75..90',
    'precipitation=1..5',
    'visibility=1..5'
  ],
  poorConditions: [
    'temperature<2 or temperature>28',
    'windSpeed>25',
    'precipitation>5',
    'humidity>90',
    'visibility<1'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Hit the gym for a treadmill incline workout or a strength session'
},
  {
  id: 'skiing',
  name: 'Skiing',
  category: 'Winter Sports',
  secondaryCategory: 'Snow Sports',
  weatherSensitive: true,
  tags: ['winter', 'snow', 'mountain', 'sport', 'Saturday', 'Sunday', 'Friday'],
  perfectConditions: [
    'temperature=-6..-2',
    'windSpeed<10',
    'clouds=10..50',
    'visibility>5',
    // 'snowDepth=100..200',      // excellent base and coverage (Meteomatics or similar)
    // 'freshSnow=10..20'         // overnight powder sweet spot (Meteomatics)
  ],
  goodConditions: [
    'temperature=-12..0',
    'windSpeed<20',
    'clouds=25..75',
    'visibility>2',
    // 'snowDepth=50..100',       // solid base for resort skiing
    // 'freshSnow=5..10'          // light fresh snow improves grip
  ],
  fairConditions: [
    'temperature=0..2 or temperature=-20..-12',
    'windSpeed=20..30',
    'clouds=0..25 or 75..100',
    'visibility=1..2',
    // 'snowDepth=20..50',        // just enough cover — some icy patches or rocks
    // 'freshSnow=0..5',          // old or crusty snow, not fresh
    // 'iceConditions=true'       // slick, hard-packed conditions more common
  ],
  poorConditions: [
    'temperature>2 or temperature<-20',
    'windSpeed>30',
    'precipitation>2',
    'visibility<1',
    // 'snowDepth<20',            // not enough snow to cover hazards
    // 'iceConditions=true'       // dangerous slicks on steeper slopes
  ],
  seasonalMonths: [12, 1, 2, 3],
  indoorAlternative: 'Tune your skis, check avalanche reports, or hit the gym for leg day'
},
{
  id: 'birdwatching',
  name: 'Birdwatching',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['nature', 'wildlife', 'observation', 'leisure', 'patience', 'Saturday', 'Sunday'],

  perfectConditions: [
    'temperature=12..18',           // mild temps are ideal for comfort and bird activity
    'windSpeed<5',                  // still air reduces bird disturbance and helps sound travel
    'cloudCover=30-60',             // broken cloud creates ideal light for viewing and photography
    'visibility>10'                 // clear, distant views are possible
  ],

  goodConditions: [
    'temperature=5..24',            // birds active in this range, humans comfortable
    'windSpeed<12',                 // light breeze is fine
    'cloudCover=20-80',             // varied light conditions still workable
    'visibility>5'                  // good viewing range
  ],

  fairConditions: [
    'temperature=0..5 or 24..28',   // a bit cold or warm, but manageable
    'windSpeed=12..15',             // gusty, some bird activity reduced
    'cloudCover=0-20 or 80-100',    // harsh sun or heavy cloud makes spotting trickier
    'precipitation=0..2',           // light drizzle may be tolerable with shelter
    'visibility=2..5'               // reduced but still usable viewing range
  ],

  poorConditions: [
    'temperature<0 or temperature>28',   // birds less active, human discomfort
    'windSpeed>15',                      // hard to hear calls or keep optics steady
    'precipitation>2',                   // rain drives birds to cover, ruins visibility
    'visibility<2'                       // fog or heavy mist renders watching impractical
  ],

  seasonalMonths: [3, 4, 5, 9, 10, 11],  // peak migratory and nesting seasons in Europe

  indoorAlternative: 'Review your field guide and update your sightings log'
},
  {
  id: 'coarse_fishing',
  name: 'Coarse and Carp Fishing',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['fishing', 'freshwater', 'quiet', 'patience', 'outdoors', 'nature', 'Saturday', 'Sunday'],

  perfectConditions: [
    'temperature=18..22',           // optimal feeding activity for most coarse species
    'windSpeed=3..8',               // a light ripple increases oxygenation but doesn't affect line control
    'cloudCover=70-90',             // overcast, reduces visibility for wary fish and glare for the angler
    'visibility>10'
    // 'falling_pressure',          // often associated with fish starting to feed
    // 'light_precipitation<2'     // can stimulate feeding, especially for barbel
  ],

  goodConditions: [
    'temperature=10..24',           // fish reasonably active and comfortable for the angler
    'windSpeed=0..12',              // calm to light breeze is fine
    'cloudCover=50-100',            // mostly cloudy is ideal for cover and bite confidence
    'visibility>5'
    // 'stable_pressure'           // prolonged steady pressure maintains activity
  ],

  fairConditions: [
    'temperature=5..10 or 24..28',  // fish slower in cold or lethargic in heat
    'windSpeed=12..20',             // blustery conditions may affect casting/bite detection
    'cloudCover=10-50',             // bright conditions reduce feeding confidence
    'precipitation=1..5',           // light rain may be tolerable, even helpful
    'visibility=2..5'
  ],

  poorConditions: [
    'temperature<5 or temperature>28',   // fish sluggish, stressed, or deep
    'windSpeed>20',                      // makes casting and line watching difficult
    'precipitation>5',                   // sustained heavy rain can raise turbidity or flood margins
    'visibility<2'                       // poor safety and observation
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],  // covers peak activity outside deep winter

  indoorAlternative: 'Tie rigs, sort your tackle box, or plan your next session'
},
  {
  id: 'football_soccer',
  name: 'Football (Soccer)',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'outdoors', 'football', 'Saturday', 'Sunday', 'Wednesday'],

  perfectConditions: [
    'temperature=12..18',         // comfortable running temperature
    'windSpeed<10',               // no ball drift or discomfort
    'cloudCover=40..70',          // partial cloud helps visibility without glare
    'precipitation=0',            // dry = best ball control and pitch condition
    'visibility>10'               // long-distance visibility ideal for playmaking
  ],

  goodConditions: [
    'temperature=5..25',          // widely playable for most amateur players
    'windSpeed<20',               // breezy but not disruptive
    'cloudCover=20..90',          // glare or overcast is manageable
    'precipitation=0..5',         // light drizzle, but pitch still fine
    'visibility>5'                // enough to see the game well
  ],

  fairConditions: [
    'temperature=0..5 or 25..30', // chilly or hot but not dangerous
    'windSpeed=20..30',           // gusty conditions may affect long balls
    'precipitation=5..15',        // moderate rain, some puddles likely
    'visibility=2..5'             // foggy or poor light, may reduce situational awareness
  ],

  poorConditions: [
    'temperature<0 or temperature>30',   // frozen or dangerously hot
    'windSpeed>30',                      // hard to control ball or run
    'precipitation>15',                  // waterlogged pitch, ball unplayable
    'visibility<2'                       // unsafe, hard to see ball or players
  ],

  seasonalMonths: [2, 3, 4, 5, 8, 9, 10, 11],  // popular months outside winter break or summer heat

  indoorAlternative: 'Hit the gym for drills, or play futsal indoors'
},
{
  id: 'kayaking',
  name: 'Kayaking',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['sport', 'water', 'outdoors', 'adventure', 'Saturday', 'Sunday', 'holiday'],

  perfectConditions: [
    'temperature=15..22',         // warm enough without overheating
    'windSpeed<8',                // gentle breeze, safe for sea or lake paddling
    'waveHeight<0.3',             // flat to gently rippled water
    'gust<5',                     // steady, predictable conditions
    'visibility>10',              // excellent for navigation and scenery
    'precipitation=0'             // dry conditions ensure comfort and safety
  ],

  goodConditions: [
    'temperature=10..24',         // comfortable paddling temps
    'windSpeed<15',               // manageable breeze, OK for experienced users
    'waveHeight<0.8',             // light swell, fine for coastal touring
    'gust<10',                    // moderate gusts, not disruptive
    'visibility>5',               // sufficient for basic orientation
    'precipitation=0..2'          // light drizzle tolerable with gear
  ],

  fairConditions: [
    'temperature=5..10 or 24..28', // brisk or hot, may need extra gear
    'windSpeed=15..25',            // moderate winds, challenging but possible
    'waveHeight=0.8..1.2',         // choppy water, requires experience
    'gust=10..15',                 // noticeable gusts, impacts handling
    'precipitation=2..10',         // persistent rain affects comfort/visibility
    'visibility=2..5'              // foggy or misty, adds navigation risk
  ],

  poorConditions: [
    'temperature<5 or temperature>28', // risk of cold shock or heat exhaustion
    'windSpeed>25',                    // strong winds, very unsafe especially at sea
    'waveHeight>1.2',                  // dangerous swell, risk of capsizing
    'gust>15',                         // unpredictable, difficult to control
    'precipitation>10',                // heavy rain affects vision, temperature, judgement
    'visibility<2'                     // white-out or dense fog, dangerous for orientation or rescue
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],  // spring to autumn — best chance for decent weather and warm water

  indoorAlternative: 'Check your gear, practise strokes on a paddle machine, or plan your next trip'
},
{
  id: 'rock_climbing',
  name: 'Rock Climbing',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'outdoors', 'adventure', 'technical', 'Saturday', 'Sunday', 'Friday'],

  perfectConditions: [
    'temperature=12..18',         // cool temps improve friction and comfort
    'windSpeed<8',                // calm conditions help with control and safety
    'humidity=30-50',             // dry air improves hand friction on rock
    'cloudCover=20-40',           // some shade without glare
    'visibility>10'               // full visibility for route reading and safety
  ],

  goodConditions: [
    'temperature=10..22',         // within range for comfort and performance
    'windSpeed<15',               // light breeze is acceptable
    'humidity<60',                // still reasonable grip
    'cloudCover=20-50',           // partly cloudy is ideal
    'visibility>5'                // sufficient for safe route navigation
  ],

  fairConditions: [
    'temperature=5..10 or 22..28',  // cooler or warmer than ideal
    'windSpeed=15..25',             // gusty, which may affect safety on exposed routes
    'humidity=60..80',              // holds may feel greasy
    'cloudCover=50-100',            // overcast or flat light makes spotting holds harder
    'visibility=2..5'               // limited view, especially problematic on multi-pitch
  ],

  poorConditions: [
    'temperature<5 or temperature>28', // cold fingers or overheating = high risk
    'windSpeed>25',                    // destabilising and dangerous on exposed faces
    'precipitation>2',                 // wet rock is unsafe and slippery
    'humidity>80',                     // sweaty hands, slick surfaces
    'visibility<2'                     // risky navigation, poor route assessment
  ],

  seasonalMonths: [3, 4, 5, 6, 9, 10],  // spring and early autumn when conditions are most reliable

  indoorAlternative: 'Train at an indoor climbing gym or work on finger strength at home'
},
  {
  id: 'golf',
  name: 'Golf',
  category: 'Outdoor Activities',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],

  perfectConditions: [
    'temperature=15..21',         // comfortable for walking & concentration
    'windSpeed<10',               // ball flight unaffected, pleasant to play
    'cloudCover=30-60',           // partly cloudy = no glare, good contrast
    'precipitation=0',            // dry, ideal course condition
    'visibility>10'               // full visibility down fairways
  ],

  goodConditions: [
    'temperature=10..25',         // playable in mild to warm temps
    'windSpeed<20',               // a breeze, may affect shots but acceptable
    'cloudCover=20-90',           // broad range from sunny to overcast
    'precipitation=0..3',         // occasional light rain
    'visibility>5'                // decent range of visibility
  ],

  fairConditions: [
    'temperature=5..10 or 25..32', // cool or hot, might be a bit uncomfortable
    'windSpeed=20..30',            // stronger gusts affect play
    'precipitation=3..10',         // persistent or heavier drizzle
    'cloudCover=90-100',           // fully overcast may be gloomy
    'visibility=2..5'              // patchy mist or haze
  ],

  poorConditions: [
    'temperature<5 or temperature>32',  // risk of frostbite or heat exhaustion
    'windSpeed>30',                    // hard to control shots, unpleasant
    'precipitation>10',                // wet clubs, soggy greens
    'visibility<2'                     // can't safely see down the course
    // 'thunderstorm'                  // dangerous, often halts play (not currently modelled)
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],  // when courses are open and grass is growing

  indoorAlternative: 'Practise your swing at the driving range or putting indoors with a mat'
},
  {
  id: 'tennis',
  name: 'Outdoor Tennis',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],

  perfectConditions: [
    'temperature=15..21',         // ideal for physical activity without overheating
    'windSpeed<8',                // minimal wind for consistent ball control
    'cloudCover=30-60',           // soft lighting, no glare
    'precipitation=0',            // dry courts only
    'visibility>10'               // excellent sightlines and contrast
  ],

  goodConditions: [
    'temperature=10..25',         // comfortably cool to warm for recreational play
    'windSpeed<15',               // occasional breeze is manageable
    'cloudCover=20-80',           // sun or mild overcast still fine
    'precipitation=0..1',         // occasional very light drizzle may not stop play
    'visibility>5'                // good visibility across court
  ],

  fairConditions: [
    'temperature=5..10 or 25..32', // chilly or hot but tolerable
    'windSpeed=15..25',            // gusty, may disrupt serving
    'cloudCover=80-100',           // very dull, poor contrast
    'precipitation=1..5',          // patchy or light rain, courts may be slippery
    'visibility=2..5'              // mist or haze
  ],

  poorConditions: [
    'temperature<5 or temperature>32',  // risk of injury or heat stress
    'windSpeed>25',                    // affects ball toss, general safety
    'precipitation>5',                 // wet court is unsafe
    'visibility<2'                     // fog makes ball tracking hard
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],  // aligned with club season in most of Europe

  indoorAlternative: 'Book a court at an indoor tennis centre or work on fitness at the gym'
},
{
  id: 'beach_volleyball',
  name: 'Beach Volleyball',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'social', 'beach', 'outdoors', 'Saturday', 'Sunday', 'Friday'],

  perfectConditions: [
    'temperature=22..28',         // warm enough for bare feet, not scorching
    'windSpeed<8',                // minimal wind keeps the ball predictable
    'cloudCover=10-30',           // some sun, great beach vibes
    'precipitation=0',            // dry sand is essential
    'visibility>10'               // full visibility across court
  ],

  goodConditions: [
    'temperature=18..30',         // solid beach weather
    'windSpeed<15',               // light breeze is fine
    'cloudCover=0-60',            // sun or mild overcast
    'precipitation=0',            // still dry enough
    'visibility>5'                // good view of ball & surroundings
  ],

  fairConditions: [
    'temperature=12..18 or 30..35', // chilly or very hot, playable but not comfy
    'windSpeed=15..25',             // ball may drift, sand may blow
    'cloudCover=60-100',            // overcast or flat light
    'precipitation=0..5',           // light rain might dampen enthusiasm
    'visibility=2..5'               // misty or dull but not dangerous
  ],

  poorConditions: [
    'temperature<12 or temperature>35', // unsafe or deeply unpleasant
    'windSpeed>25',                     // play becomes chaotic
    'precipitation>5',                  // wet sand & discomfort
    'visibility<2'                      // fog = no-go
  ],

  seasonalMonths: [5, 6, 7, 8, 9],       // peak summer activity

  indoorAlternative: 'Play indoor volleyball at a sports hall or practise drills at home'
},
{
  id: 'horse_riding',
  name: 'Horse Riding',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'animal', 'leisure', 'outdoors', 'Saturday', 'Sunday'],

  perfectConditions: [
    'temperature=15..20',         // optimal comfort for horse and rider
    'windSpeed<10',               // low wind = safe control and calm horses
    'cloudCover=20-50',           // soft light, not glaring or gloomy
    'visibility>10'               // ideal for hacking, eventing, or lessons
  ],

  goodConditions: [
    'temperature=8..27',          // broad comfortable range
    'windSpeed<15',               // manageable breeze
    'cloudCover=10-80',           // sunny to overcast, no issue
    'visibility>5'                // clear enough for trail or arena riding
  ],

  fairConditions: [
    'temperature=5..8 or 27..30', // cool or hot but rideable
    'windSpeed=15..25',           // windier = less pleasant, possibly spookier
    'cloudCover=80-100',          // flat light or gloom
    'precipitation=0..10',        // light rain or recent damp, may affect footing
    'visibility=2..5'             // murky conditions, not unsafe but not ideal
  ],

  poorConditions: [
    'temperature<5 or temperature>30',  // icy or dangerously hot
    'windSpeed>25',                    // hard to control horses, trees blowing
    'precipitation>10',                // muddy, unsafe ground
    'visibility<2'                     // fog, dusk, or heavy rain limit sight
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],  // reflects most outdoor riding seasons

  indoorAlternative: 'Ride in the indoor school, groom your horse, or clean tack'
},
 {
  id: 'ice_skating',
  name: 'Outdoor Ice Skating',
  category: 'Winter Sports',
  secondaryCategory: 'Ice Sports',
  weatherSensitive: true,
  tags: ['winter', 'sport', 'leisure', 'social', 'Saturday', 'Sunday', 'Friday', 'evening'],

  perfectConditions: [
    'temperature=-5..-1',          // ideal balance of ice stability and comfort
    'windSpeed<10',                // little wind chill or disruption
    'cloudCover=10-50',            // some sun for ambience and visibility
    'visibility>10'                // clear for spotting obstacles and safe skating
    // 'fresh_ice'                 // optionally track freshly cleared or smooth surfaces
  ],

  goodConditions: [
    'temperature=-15..0',          // comfortably cold, safe for the ice
    'windSpeed<15',                // light wind, manageable chill
    'cloudCover=0-80',             // overcast or bright, both acceptable
    'visibility>5'                 // safe for families, dusk or cloudy is okay
  ],

  fairConditions: [
    'temperature=0..2 or temperature=-20..-15',  // ice may be soft or bitterly cold
    'windSpeed=15..20',                          // stronger wind, less fun
    'cloudCover=80-100',                         // very gloomy or snowy light
    'precipitation=0..2',                        // light flurries possible but tolerable
    'visibility=2..5'                             // mist, low sun glare, or snow may reduce visibility
  ],

  poorConditions: [
    'temperature>2 or temperature<-20',          // ice melts or frostbite risk
    'precipitation>2',                           // snow/rain obscures or softens ice
    'windSpeed>20',                              // strong gusts risk imbalance and cold
    'visibility<2'                               // dangerous for group skating
  ],

  seasonalMonths: [12, 1, 2],  // core winter skating season

  indoorAlternative: 'Skate at an indoor rink or practise balance & drills at home'
},
{
    id: 'curling',
    name: 'Curling',
    category: 'Indoor Sports',
    secondaryCategory: 'Ice Sports',
    weatherSensitive: false,
    tags: ['winter', 'ice', 'indoor', 'social', 'strategic', 'team', 'fun', 'leisure', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
    poorConditions: [],
    goodConditions: [],
    perfectConditions: [],
    seasonalMonths: [1, 2, 3, 10, 11, 12],
},
{
  id: 'cross_country_skiing',
  name: 'Cross-country Skiing',
  category: 'Winter Sports',
  secondaryCategory: 'Snow Sports',
  weatherSensitive: true,
  tags: ['winter', 'endurance', 'scenic', 'fitness', 'snow', 'nature', 'outdoors', 'Saturday', 'Sunday'],

  perfectConditions: [
    'temperature=-8..-3',          // optimal snow quality and comfort
    'windSpeed<8',                 // little wind chill, safe on open trails
    'cloudCover=20-50',            // soft contrast and scenic light
    'visibility>10'                // clear trail visibility and surroundings
  ],

  goodConditions: [
    'temperature=-15..-1',         // broad comfortable skiing range
    'windSpeed<15',                // minor breeze tolerable
    'cloudCover=10-80',            // overcast or patchy skies fine
    'visibility>5'                 // good visibility for trail awareness
  ],

  fairConditions: [
    'temperature=-20..-15 or temperature=0..2', // cold or slushy edge cases
    'windSpeed=15..30',                         // stronger wind = chill and control issues
    'cloudCover=80-100',                        // very gloomy
    'precipitation=0..5',                       // light snowfall okay
    'visibility=2..5'                            // snowy, misty or dusk conditions manageable
  ],

  poorConditions: [
    'temperature>2 or temperature<-20',         // poor snow or extreme cold
    'windSpeed>30',                             // dangerous wind chill
    'precipitation>5',                          // heavy snow = poor glide & visibility
    'visibility<2',                             // whiteout or fog = unsafe
    'ice_conditions=true'                       // frozen crust = loss of grip/control
  ],

  seasonalMonths: [12, 1, 2, 3],  // typical snow season in Europe and North America

  indoorAlternative: 'Train on a ski erg or rollerskis, or focus on strength & flexibility exercises'
},
  {
  id: 'canoeing',
  name: 'Canoeing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['sport', 'water', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'holiday'],

  perfectConditions: [
    'temperature=16..22',
    'windSpeed<8',
    'gust<10',
    'waveHeight<0.2',
    'cloudCover=20-50',
    'precipitation=0',
    'visibility>10'
  ],

  goodConditions: [
    'temperature=12..25',
    'windSpeed<12',
    'gust<15',
    'waveHeight<0.4',
    'cloudCover=10-80',
    'precipitation=0..2',
    'visibility>5'
  ],

  fairConditions: [
    'temperature=8..12 or 25..30',
    'windSpeed=12..20',
    'gust=15..25',
    'waveHeight=0.4..0.6',
    'cloudCover=80-100',
    'precipitation=2..10',
    'visibility=2..5'
  ],

  poorConditions: [
    'temperature<8 or temperature>30',
    'windSpeed>20',
    'gust>25',
    'waveHeight>0.6',
    'precipitation>10',
    'visibility<2'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

  indoorAlternative: 'Check and repair gear, plan your next camping route, or practise strokes on a paddle machine'
},
{
  id: 'picnicking',
  name: 'Picnicking',
  category: 'Outdoor Leisure',
  secondaryCategory: 'Social Activities',
  weatherSensitive: true,
  tags: ['leisure', 'social', 'outdoors', 'nature', 'Saturday', 'Sunday', 'holiday'],

  perfectConditions: [
    'temperature=18..25',         // warm, comfortable
    'windSpeed<8',
    'cloudCover=20-50',
    'humidity=40-60',
    'visibility>10'
  ],

  goodConditions: [
    'temperature=15..28',         // up to summer highs with shade
    'windSpeed<12',
    'cloudCover=10-70',
    'humidity<75',
    'visibility>5'
  ],

  fairConditions: [
    'temperature=10..14 or 29..34',  // cooler or hotter but manageable
    'windSpeed=12..20',
    'cloudCover=70-100',
    'humidity=75..85',
    'precipitation=0..1',
    'visibility=2..5'
  ],

  poorConditions: [
    'temperature<10',
    'temperature>34',                // very hot — shade often not enough
    'windSpeed>20',
    'precipitation>1',
    'humidity>85',
    'visibility<2'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9],

  indoorAlternative: 'Prepare a picnic-style meal indoors or plan your next outdoor gathering'
},
{
  id: 'bbq',
  name: 'Barbecue',
  category: 'Outdoor Leisure',
  secondaryCategory: 'Social Activities',
  weatherSensitive: true,
  tags: ['leisure', 'social', 'outdoors', 'food', 'Saturday', 'Sunday', 'holiday'],

  perfectConditions: [
    'temperature=20..26',            // warm but not baking
    'windSpeed<10',                  // gentle breeze
    'cloudCover=10-50',              // some shade, nice light
    'humidity=40-65',                // comfortable for guests & grill
    'visibility>10'
  ],

  goodConditions: [
    'temperature=16..30',            // broader comfort zone
    'windSpeed<18',                  // manageable even with umbrellas or gazebos
    'cloudCover=0-80',
    'humidity<80',
    'visibility>5'
  ],

  fairConditions: [
    'temperature=12..15 or 31..34',  // still doable with jumpers or shade
    'windSpeed=18..25',              // might need to move grill or cover
    'cloudCover=80-100',
    'humidity=80..90',
    'precipitation=0..1',
    'visibility=2..5'
  ],

  poorConditions: [
    'temperature<12',                // shivering with a sausage
    'temperature>34',                // sweaty guests, grill fatigue
    'windSpeed>25',                  // flames out, napkins airborne
    'precipitation>1',               // drizzle or worse
    'visibility<2'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9],

  indoorAlternative: 'Grill indoors or host a casual dinner party with BBQ flavours'
},
{
  id: 'beach',
  name: 'Go to the Beach',
  category: 'Outdoor Leisure',
  secondaryCategory: 'Social Activities',
  weatherSensitive: true,
  tags: ['leisure', 'social', 'outdoors', 'coast', 'sea', 'Saturday', 'Sunday', 'holiday'],

  perfectConditions: [
    'airTemperature=22..28',            // warm, not too hot
    'waterTemperature=18..24',         // swimmable without discomfort
    'windSpeed<10',                    // light breeze
    'waveHeight=0..0.5',               // calm for paddling/swimming
    'cloudCover=0-10',                 // mostly sunny
    'humidity=40-65',
    'visibility>10',
    'precipitation=0'
  ],

  goodConditions: [
    'airTemperature=20..32',
    'waterTemperature=16..26',
    'windSpeed<14',
    'waveHeight=0..0.8',
    'cloudCover=0-40',
    'humidity<75',
    'visibility>6',
    'precipitation=0..0.5'
  ],

  fairConditions: [
    'airTemperature=14..20 or 32..35',
    'waterTemperature=14..28',         // refreshing or bath-like
    'windSpeed=14..18',
    'waveHeight=0.5..1.2',             // choppy but manageable
    'cloudCover=40..90',
    'humidity<85',
    'visibility=3..6',
    'precipitation=0..1'
  ],

  poorConditions: [
    'airTemperature<14',
    'airTemperature>35',
    'waterTemperature<14',             // very cold
    'windSpeed>18',
    'waveHeight>1.2',                  // rough & unsafe for most
    'cloudCover>90',
    'precipitation>1',
    'visibility<3'
  ],

  seasonalMonths: [5, 6, 7, 8, 9],

  indoorAlternative: 'Get that Baywatch box set out and watch some classic beach scenes or plan your next beach trip'
},
{
  id: 'geocaching',
  name: 'Geocaching',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['outdoors', 'adventure', 'hiking', 'game', 'exploration', 'social', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'temperature<-2',               // freezing and uncomfortable
    'temperature>34',              // risk of overheating
    'windSpeed>30',                // dangerous in wooded or exposed areas
    'precipitation>10',           // heavy rain or storms
    'visibility<2'                 // poor navigation and safety risks
  ],

  fairConditions: [
    'temperature=0..8',            // chilly but manageable
    'temperature=26..32',          // a bit hot for walking, but fine in short bursts
    'windSpeed=20..30',            // gusty but not extreme
    'precipitation=2..6',          // light to moderate rain, may affect enjoyment
    'visibility=2..5'              // limited visibility but not unsafe
  ],

  goodConditions: [
    'temperature=8..26',
    'windSpeed<20',
    'cloudCover=0-80',
    'precipitation=0..2',          // light drizzle at most
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=15..22',
    'windSpeed<10',
    'cloudCover=10-50',            // pleasant light, not too bright or gloomy
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],

  indoorAlternative: 'Log past finds online, solve puzzle caches, or plan your next route'
},
{
  id: 'sea_fishing_shore',
  name: 'Sea Fishing (Shore)',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['fishing', 'saltwater', 'shore', 'tide', 'evening', 'patience', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<0',                  // freezing, unpleasant
    'temperature>32',                // excessive heat, uncomfortable
    'windSpeed>35',                  // gales, casting impossible
    'gust>25',                       // sudden gusts can affect casting safety
    'waveHeight>2',                  // dangerous swells
    'precipitation>10',              // heavy rain, miserable
    'visibility<2',                  // fog, unsafe
    'waterTemperature<7',            // most shore species sluggish or absent
    'waterTemperature>24'            // fish often deeper, less shoreline activity
  ],
  fairConditions: [
    'temperature=2..6',              // chilly but manageable
    'windSpeed=20..30',              // blustery, tough casting
    'gust=15..25',                   // inconsistent handling
    'waveHeight=1.5..2',             // rough but some may fish
    'precipitation=2..10',           // light to moderate showers
    'visibility=2..5',               // reduced visibility
    'waterTemperature=8..10'         // fish more active, but not prime
  ],
  goodConditions: [
    'temperature=6..18',
    'windSpeed=10..20',
    'gust<15',
    'waveHeight=0.5..1.5',
    'cloudCover=50-100',
    'precipitation=0..2',
    'visibility>5',
    'waterTemperature=10..18'        // very productive for common species (bass, bream, flatfish)
  ],
  perfectConditions: [
    'temperature=10..16',
    'windSpeed=12..18',
    'gust<10',
    'waveHeight=0.8..1.2',           // rolling but clean
    'cloudCover=70-90',              // low light helps fish come close
    'precipitation=0',
    'visibility>10',
    'waterTemperature=12..16'        // ideal for nearshore feeders in spring/autumn
  ],
  seasonalMonths: [1, 2, 3, 4, 5, 6, 9, 10, 11, 12],
  indoorAlternative: 'Tie rigs, organise tackle box, or research tides and marks for your next trip'
},
{
  id: 'sea_fishing_boat',
  name: 'Sea Fishing (Boat)',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['fishing', 'saltwater', 'boat', 'adventure', 'safety', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<0',                 // freezing, hypothermia risk
    'temperature>30',               // heat & sunstroke
    'windSpeed>30',                 // unsafe seas
    'gust>20',                      // high gusts create instability
    'waveHeight>2',                 // too rough
    'precipitation>10',             // soaking & slippery
    'visibility<2',                 // fog
    'waterTemperature<8',           // many species sluggish
    'waterTemperature>24'           // oxygen depletion, deeper fish
  ],
  fairConditions: [
    'temperature=8..28',            // tolerable
    'windSpeed<25',
    'gust=15..20',
    'waveHeight<1.5',
    'cloudCover=20-100',
    'visibility>5',
    'waterTemperature=10..22'       // average mixed-species comfort range
  ],
  goodConditions: [
    'temperature=10..22',
    'windSpeed<20',
    'gust<15',
    'waveHeight<1',
    'cloudCover=50-100',
    'visibility>5',
    'waterTemperature=12..20'       // ideal for many inshore predatory species
  ],
  perfectConditions: [
    'temperature=12..18',
    'windSpeed<12',
    'gust<8',
    'waveHeight<0.5',
    'cloudCover=60-80',
    'visibility>10',
    'waterTemperature=14..18'       // sweet spot for bass, pollack, bream, etc.
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Tidy tackle, research tide tables, or book your next charter trip'
},
{
  id: 'foraging',
  name: 'Foraging',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['nature', 'food', 'hiking', 'quiet', 'discovery', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<5',                 // uncomfortable & limited growth
    'temperature>30',                // too dry or hot
    'precipitation>10',              // soaking, slippery, poor footing
    'windSpeed>25',                  // makes identifying & reaching plants harder
    'visibility<2'                   // unsafe, difficult to see or ID
  ],
  fairConditions: [
    'temperature=6..12',
    'windSpeed<20',
    'precipitation=0..5',            // light drizzle okay
    'cloudCover=30-100',
    'visibility=3..5'
  ],
  goodConditions: [
    'temperature=12..20',
    'windSpeed<15',
    'precipitation=0..2',            // recent light rain helps growth
    'cloudCover=30-80',
    'humidity=60..85',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=14..18',
    'windSpeed<8',
    'precipitation=0',
    'cloudCover=40-70',
    'humidity=65..75',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  indoorAlternative: 'Research seasonal finds, preserve what you’ve picked, or prep recipes with past harvests'
},
  {
  id: 'archery',
  name: 'Archery',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'outdoors', 'precision', 'focus', 'social', 'Saturday', 'Sunday', 'Wednesday'],
  poorConditions: [
    'temperature<5',                // numb fingers, discomfort
    'temperature>32',              // risk of heat exhaustion, sweaty grip
    'windSpeed>25',                // arrows veer off course
    'precipitation>5',             // soaking wet makes shooting hard
    'visibility<2'                 // can't clearly see targets
  ],
  fairConditions: [
    'temperature=5..10',           // a bit chilly but manageable
    'temperature=26..30',          // hot but tolerable
    'windSpeed=15..20',            // windy but possible for short sessions
    'precipitation=1..5',          // light drizzle or damp ground
    'visibility=3..5'              // hazy but not dangerous
  ],
  goodConditions: [
    'temperature=10..25',
    'windSpeed<12',
    'cloudCover=0-80',
    'precipitation=0..2',          // occasional light showers
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=15..22',          // comfortable & stable
    'windSpeed<5',                 // minimal drift
    'cloudCover=20-50',            // easy on the eyes
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise at an indoor range, tune your bow, or work on strength & focus exercises'
},
  {
  id: 'orienteering',
  name: 'Orienteering',
  category: 'Active Sports',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['sport', 'navigation', 'outdoors', 'running', 'adventure', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature<0',                // icy & unsafe footing
    'temperature>30',              // heat exhaustion risk
    'windSpeed>30',                // unsafe in forested areas
    'precipitation>15',            // heavy rain, slippery
    'visibility<2'                 // foggy, disorienting
  ],
  fairConditions: [
    'temperature=0..5',            // cold but safe
    'temperature=22..26',          // warmer but manageable
    'windSpeed=20..30',            // breezy but doable
    'precipitation=5..10',         // light showers
    'visibility=2..5'              // reduced, but passable
  ],
  goodConditions: [
    'temperature=5..22',
    'windSpeed<20',
    'cloudCover=10-80',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=10..16',
    'windSpeed<10',
    'cloudCover=30-60',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise map reading & route planning or train on a treadmill'
},
{
  id: 'rock_hopping',
  name: 'Rock Hopping',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['adventure', 'walking', 'nature', 'coastal', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<5',                // cold, uncomfortable
    'temperature>28',              // heat, exhausting
    'precipitation>0',             // wet rocks, unsafe
    'windSpeed>15',                // gusty, unsafe
    'visibility<2'                 // fog, risky
  ],
  fairConditions: [
    'temperature=5..10',           // chilly but manageable
    'temperature=22..26',          // warm, may require breaks
    'windSpeed=10..15',            // slightly breezy
    'cloudCover=60-90',            // mostly overcast
    'visibility=2..5'
    // 'tide=mid'                   // not ideal but not dangerous
  ],
  goodConditions: [
    'temperature=10..22',
    'windSpeed<10',
    'cloudCover=10-60',
    'visibility>5'
    // 'tide=low'                   // better rock exposure
  ],
  perfectConditions: [
    'temperature=15..20',
    'windSpeed<5',
    'cloudCover=20-50',
    'visibility>10'
    // 'tide=low & dry_rocks'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Plan your next coastal walk or practise balance & agility exercises'
},

{
  id: 'snorkelling',
  name: 'Snorkelling',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'swimming', 'adventure', 'leisure', 'nature', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'waterTemperature<17',           // uncomfortably cold
    'waterTemperature>30',           // stifling, algae risk
    'windSpeed>20',                  // choppy & unsafe
    'gust>18',                       // unpredictable surface disturbance
    'waveHeight>1',                  // hard to breathe & see
    'precipitation>10',              // poor visibility, unpleasant
    'visibility<2'                   // foggy, unsafe
  ],
  fairConditions: [
    'waterTemperature=17..19',       // brisk but tolerable with gear
    'windSpeed=12..18',
    'gust=12..18',
    'waveHeight=0.5..1',
    'cloudCover=60-90',
    'visibility=2..5'
  ],
  goodConditions: [
    'waterTemperature=20..28',
    'windSpeed<12',
    'gust<=10',
    'waveHeight<0.5',
    'cloudCover=0-60',
    'visibility>5'
  ],
  perfectConditions: [
    'waterTemperature=22..26',
    'windSpeed<6',
    'gust<5',
    'waveHeight<0.3',
    'cloudCover=10-40',
    'visibility>10'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise breath-holding techniques, research marine life, or plan your next beach trip'
},

{
  id: 'stand_up_paddleboarding',
  name: 'Stand-Up Paddleboarding',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'balance', 'nature', 'leisure', 'fitness', 'SUP', 'stand-up', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<12',               // too cold for falling in
    'temperature>32',               // heat stress
    'windSpeed>20',                 // very hard to control
    'gust>18',                      // unstable & fatiguing
    'waveHeight>1',                 // unstable
    'precipitation>10',             // heavy rain, poor visibility
    'visibility<2'                  // fog, unsafe
  ],
  fairConditions: [
    'temperature=12..15',           // brisk but manageable in a wetsuit
    'windSpeed=10..15',             // gusty but OK on sheltered water
    'gust=10..18',                  // moderate gustiness adds challenge
    'waveHeight=0.3..0.6',          // choppy, some balance required
    'cloudCover=50-90',
    'visibility=2..5'
  ],
  goodConditions: [
    'temperature=15..28',
    'windSpeed<10',
    'gust<=10',
    'waveHeight<0.3',
    'cloudCover=0-50',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=20..26',
    'windSpeed<5',
    'gust<5',
    'waveHeight<0.1',
    'cloudCover=10-30',
    'visibility>10'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise balance & core strength, or research local waterways'
},
{
  id: 'sea_swimming',
  name: 'Sea Swimming',
  category: 'Outdoor Activities',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'nature', 'leisure', 'wellness', 'adventure', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'waterTemperature<10',           // risk of cold shock for casual swimmers
    'airTemperature<8',             // uncomfortable after
    'windSpeed>20',                 // chilling & unpleasant
    'waveHeight>1',                 // unsafe in sea
    'precipitation>10',             // heavy rain, poor visibility
    'visibility<2'                  // fog, unsafe
  ],
  fairConditions: [
    'waterTemperature=10..14',       // fresh but manageable for some
    'airTemperature=10..15',         // chilly but not extreme
    'windSpeed=12..18',              // breezy, may deter some
    'waveHeight=0.5..0.8',           // manageable for stronger swimmers
    'visibility=2..5'
  ],
  goodConditions: [
    'waterTemperature=14..24',
    'airTemperature=15..28',
    'windSpeed<12',
    'waveHeight<0.5',
    'cloudCover=10-80',
    'visibility>5'
  ],
  perfectConditions: [
    'waterTemperature=18..22',
    'airTemperature=20..26',
    'windSpeed<6',
    'waveHeight<0.2',
    'cloudCover=20-50',
    'visibility>10'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Visit a pool or practise breathing & cold exposure techniques at home'
},
{
  id: 'wild_swimming',
  name: 'Wild Swimming',
  category: 'Outdoor Activities',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'nature', 'leisure', 'wellness', 'adventure', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    // 'waterTemperature<10',           // risk of cold shock for casual swimmers
    'airTemperature<8',             // uncomfortable after
    'windSpeed>20',                 // chilling & unpleasant
    // 'waveHeight>1',                 // unsafe in sea
    'precipitation>10',             // heavy rain, poor visibility
    'visibility<2'                  // fog, unsafe
  ],
  goodConditions: [
   //  'waterTemperature=14..24',
    'airTemperature=15..28',
    'windSpeed<12',
    // 'waveHeight<0.5',          // marine only – not relevant for lakes/rivers
    'cloudCover=10-80',
    'visibility>5'
  ],
  fairConditions: [
   //  'waterTemperature=10..14',       // marine only – not relevant for lakes/rivers
    'airTemperature=10..15',         // chilly but not extreme
    'windSpeed=12..18',              // breezy, may deter some
    // 'waveHeight=0.5..1',        // marine only – not relevant for lakes/rivers
    'visibility=2..5'
  ],
  perfectConditions: [
    // 'waterTemperature=18..22',    // marine only – not relevant for lakes/rivers
    'airTemperature=20..26',
    'windSpeed<6',
    // 'waveHeight<0.2',          // marine only – not relevant for lakes/rivers
    'cloudCover=20-50',
    'visibility>10'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Visit a pool or practise breathing & cold exposure techniques at home'
},

  {
    id: 'tennis_indoor',
    name: 'Tennis (Indoor)',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'racquet', 'indoor', 'social', 'leisure', 'Wednesday', 'Thursday', 'Saturday', 'Sunday', 'evening'],

  },
    {
    id: 'volleyball_indoor',
    name: 'Volleyball',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'ball', 'indoor', 'social', 'leisure', 'Wednesday', 'Thursday', 'Saturday', 'Sunday', 'evening'],

  },
  {
    id: 'boxing',
    name: 'Boxing',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
    {
    id: 'zumba',
    name: 'Zumba',
    category: 'Fitness & Wellness',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'dance', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
      {
    id: 'spinning',
    name: 'Spinning',
    category: 'Fitness & Wellness',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'cycling', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
    {
    id: 'gym_workout',
    name: 'Gym',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
  {
    id: 'yoga',
    name: 'Yoga',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['wellness', 'relaxation', 'mindfulness', 'self-care', 'Sunday', 'Monday', 'Wednesday', 'evening'],
  },
  {
    id: 'pilates',
    name: 'Pilates',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['wellness', 'relaxation', 'mindfulness', 'self-care', 'Sunday', 'Monday', 'Wednesday', 'evening'],
  },
  {
    id: 'indoor_climbing',
    name: 'Indoor Climbing',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Indoor Recreation',
    weatherSensitive: false,
    tags: ['fun', 'adventure', 'social', 'evening', 'leisure', 'Tuesday', 'Wednesday', 'Saturday'],
  },
  {
    id: 'squash',
    name: 'Squash',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'social', 'active', 'evening', 'Tuesday', 'Wednesday', 'leisure'],
  },
  {
    id: 'badminton',
    name: 'Badminton',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'social', 'active', 'evening', 'Tuesday', 'Wednesday', 'Thursday', 'leisure'],
  },
  {
    id: 'table_tennis',
    name: 'Table Tennis',
    category: 'Active Sports',
    secondaryCategory: 'Indoor Recreation',
    weatherSensitive: false,
    tags: ['sport', 'social', 'fun', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'leisure'],
  },
  {
    id: 'indoor_swimming',
    name: 'Indoor Swimming',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Water Sports',
    weatherSensitive: false,
    tags: ['fitness', 'relaxation', 'family', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'water', 'leisure']
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
  id: 'urban_exploring',
  name: 'Go for a Walk',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['wellbeing', 'leisure', 'fitness', 'outdoors', 'urban', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature<-5',                // freezing & icy
    'temperature>35',               // heat exhaustion risk
    'windSpeed>40',                 // strong gales
    'precipitation>15',             // torrential rain
    'visibility<2'                  // fog, unsafe
  ],
  fairConditions: [
    'temperature=-5..5',            // cold but tolerable
    'temperature=25..30',           // warm for brisk walking
    'windSpeed=15..30',             // breezy but manageable
    'precipitation=3..10',          // light to moderate rain
    'visibility=2..5'               // reduced visibility but acceptable
  ],
  goodConditions: [
    'temperature=6..25',
    'windSpeed<15',
    'cloudCover=0-90',
    'precipitation=0..2',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=12..20',
    'windSpeed<8',
    'cloudCover=20-60',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  indoorAlternative: 'Stretch, do light yoga, or walk laps indoors at a mall or gym'
},
 {
  id: 'mushroom_hunting',
  name: 'Mushroom Hunting',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['nature', 'food', 'forest', 'seasonal', 'quiet', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature<0',                // frost kills fungi
    'temperature>25',              // ground dries out
    'windSpeed>20',                // uncomfortable & risky
    'precipitation>15',            // flooded ground, unpleasant
    'visibility<2'                 // fog, unsafe
  ],
  fairConditions: [
    'temperature=0..8',             // cool but possible
    'temperature=18..22',           // a bit warm, but shaded forests may be fine
    'windSpeed=10..20',             // breezy but manageable
   //  'recentPrecipitation=2..5',     // not ideal but damp enough
    'visibility=2..5'               // dim light may still be safe
  ],
  goodConditions: [
    'temperature=8..18',
    'windSpeed<10',
    'cloudCover=10-90',
   //  'recentPrecipitation=5..20',   // fungi need dampness
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=10..15',
    'windSpeed<5',
    'cloudCover=20-60',
   //  'recentPrecipitation=10..15',
    'visibility>10'
  ],
  seasonalMonths: [9, 10, 11],
  indoorAlternative: 'Study a field guide, clean and cook previous finds, or dry mushrooms for storage'
},
{
  id: 'snowboarding',
  name: 'Snowboarding',
  category: 'Winter Sports',
  secondaryCategory: 'Snow Sports',
  weatherSensitive: true,
  tags: ['winter', 'snow', 'freestyle', 'powder', 'adventure', 'Friday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature>2',                // snow too soft/slushy
    'temperature<-20',             // extreme cold
    'windSpeed>30',                // lifts may close
    'precipitation>10',            // whiteout
    'visibility<2',                // fog, dangerous
    // 'snow_surface=icy',         // specialist: icy surface
    // 'fresh_snow<2'              // specialist: no fresh snow
  ],
  fairConditions: [
    'temperature=-18..-13',        // very cold but possible
    'windSpeed=20..30',            // breezy but not closed
    'cloudCover=80-100',
    'visibility=2..5'
    // 'fresh_snow=1..5',          // light dusting
    // 'snow_surface=variable'     // mix of groomed and hardpack
  ],
  goodConditions: [
    'temperature=-12..0',
    'windSpeed<20',
    'cloudCover=10-90',
    'visibility>5',
    // 'snow_depth>50',            // specialist: base depth
    // 'fresh_snow=2..20',         // specialist: fresh layer
    // 'snow_surface=soft'         // specialist: groomed/soft
  ],
  perfectConditions: [
    'temperature=-8..-2',
    'windSpeed<10',
    'cloudCover=20-60',
    'visibility>10',
    // 'fresh_snow=10..30',        // specialist: deep powder
    // 'snow_surface=powder'       // specialist: ideal surface
  ],
  seasonalMonths: [12, 1, 2, 3],
  indoorAlternative: 'Practise balance, ride a balance board, or hit an indoor snow centre'
},
  {
  id: 'ice_fishing',
  name: 'Ice Fishing',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['winter', 'fishing', 'ice', 'outdoors', 'patience', 'quiet', 'tradition', 'social', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature>-2',                // ice melts, unsafe
    'temperature<-25',              // extreme cold
    'windSpeed>30',                 // harsh wind chill
    'precipitation>10',             // heavy snow
    'visibility<2',                 // fog, whiteout
    // 'ice_thickness<10'           // specialist: unsafe ice
  ],
  fairConditions: [
    'temperature=-20..-16',         // very cold, tough conditions
    'windSpeed=15..25',             // breezy, layered gear needed
    'cloudCover=90-100',
    'visibility=2..5'
    // 'ice_thickness=10..14'       // walkable but solo only
  ],
  goodConditions: [
    'temperature=-15..-5',
    'windSpeed<15',
    'cloudCover=10-90',
    'visibility>5',
    // 'ice_thickness>=15'          // specialist: safe for group
  ],
  perfectConditions: [
    'temperature=-8..-3',
    'windSpeed<8',
    'cloudCover=20-50',
    'visibility>10',
    // 'ice_thickness>=20'          // specialist: very solid
  ],
  seasonalMonths: [12, 1, 2],
  indoorAlternative: 'Tie rigs, maintain gear, or cook up last season’s catch'
},
  {
  id: 'photography',
  name: 'Photography',
  category: 'Creative & Arts',
  secondaryCategory: 'Visual Arts',
  weatherSensitive: true,
  tags: ['creative', 'outdoors', 'observational', 'nature', 'urban', 'light', 'weather', 'patience', 'Saturday', 'Sunday', 'golden_hour', 'seasonal'],
  poorConditions: [
    'temperature<-10',               // extreme cold, uncomfortable
    'temperature>35',               // oppressive heat
    'windSpeed>30',                 // camera shake, unpleasant
    'precipitation>20',             // soaking rain, unsafe for gear
    'visibility<2'                  // fog/whiteout
  ],
  fairConditions: [
    'temperature=-5..0',            // chilly but manageable
    'windSpeed=20..30',             // tricky but creative options
    'cloudCover=90-100',            // very overcast, moodier tones
    'precipitation=5..20',          // light to steady rain/snow
    'visibility=2..5'               // fog/mist can be atmospheric
  ],
  goodConditions: [
    'temperature=0..25',
    'windSpeed<20',
    'cloudCover=20-90',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=8..18',
    'windSpeed<10',
    'cloudCover=40-70',             // soft light, good contrast
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  indoorAlternative: 'Organise and edit your photos, research new locations, or experiment with indoor lighting and composition'
},
{
  id: 'beekeeping',
  name: 'Beekeeping',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['hobby', 'nature', 'craft', 'stewardship', 'agriculture', 'Saturday', 'Sunday', 'Wednesday'],
  poorConditions: [
    'temperature<12',                // bees stay clustered
    'temperature>32',                // stressful for bees & beekeeper
    'precipitation>2',              // bees stay inside
    'windSpeed>15',                 // bees irritable & hard to control
    'cloudCover>80',                // bees defensive under dark skies
    'humidity>85'                   // damp, sticky, bees agitated
  ],
  fairConditions: [
    'temperature=12..15',           // cooler, bees less active
    'windSpeed=10..15',             // light breeze, not ideal
    'cloudCover=60-80',             // duller conditions
    'humidity=75..85',              // borderline sticky
    'precipitation=0..2'            // light drizzle
  ],
  goodConditions: [
    'temperature=15..28',
    'windSpeed<10',
    'cloudCover=10-60',
    'humidity<75'
  ],
  perfectConditions: [
    'temperature=18..24',
    'windSpeed<5',
    'cloudCover=10-30',
    'humidity=50-65',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Inspect and repair equipment, assemble frames, render wax, or read up on hive management'
},

{
  id: 'camping',
  name: 'Camping',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['nature', 'leisure', 'adventure', 'outdoors', 'social', 'holiday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature<5',                // freezing nights
    'temperature>30',              // uncomfortable heat
    'windSpeed>25',                // tents unsafe
    'precipitation>10',            // heavy rain
    'visibility<2'                 // fog & disorienting
  ],
  fairConditions: [
    'temperature=5..10',           // chilly mornings
    'temperature=25..30',          // hot but manageable
    'windSpeed=12..18',            // breezy but fine with guy lines
    'precipitation=2..10',         // showers, muddy but okay
    'humidity=80..90',             // muggy
    'visibility=2..5'              // misty but still campable
  ],
  goodConditions: [
    'temperature=10..25',
    'windSpeed<12',
    'cloudCover=10-70',
    'precipitation=0..2',
    'humidity<80',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=15..20',
    'windSpeed<8',
    'cloudCover=20-50',
    'precipitation=0',
    'humidity=40-60',
    'visibility>10'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9],
  indoorAlternative: 'Plan your next trip, check and pack gear, or camp in your garden for fun'
},
  {
    id: 'knitting',
    name: 'Knitting',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['relaxation', 'hobby', 'home', 'craft', 'Wednesday', 'Thursday', 'Sunday', 'evening', 'solo'],
  },
  {
    id: 'tai_chi',
    name: 'Tai Chi',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['relaxation', 'wellness', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care']
  },
  {
    id: 'martial_arts',
    name: 'Martial Arts',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
     tags: ['relaxation', 'discipline', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  {
    id: 'meditation',
    name: 'Meditation',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['relaxation', 'wellness', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  {
    id: 'reading',
    name: 'Reading',
    category: 'Creative & Arts',
    secondaryCategory: 'Literature',
    weatherSensitive: false,
    tags: ['relaxation', 'learning', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  {
    id: 'going_to_pub',
    name: 'Going to the Pub',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'leisure', 'relaxation', 'group', 'Sunday', 'Thursday', 'Friday', 'Saturday', 'evening'],
  },
    {
    id: 'playing_cards',
    name: 'Playing Cards',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'fun', 'leisure', 'relaxation', 'group', 'Sunday', 'evening', 'Thursday', 'Friday', 'Saturday'],
  },
{
  id: 'watch_a_movie',
  name: 'Watch TV',
  category: 'Indoor Recreation',
  secondaryCategory: 'Social Activities',
  weatherSensitive: false,
  tags: ['home','leisure','Tuesday','Wednesday','Thursday','cultural']
},
{
  id: 'gaming',
  name: 'Gaming',
  category: 'Indoor Recreation',
  secondaryCategory: 'Social Activities',
  weatherSensitive: false,
  tags: ['home','leisure','Tuesday','Wednesday','Thursday','cultural']
},
  {
    id: 'painting',
    name: 'Painting',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: false,
    tags: ['art', 'creativity', 'relaxation', 'Sunday', 'Saturday', 'evening', 'home', 'solo']
  },
  {
    id: 'diy',
    name: 'DIY',
    category: 'Indoor Recreation',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['craft', 'home', 'practical', 'Saturday', 'Sunday', 'evening', 'creative']
  },
  {
    id: 'crafts',
    name: 'Crafts',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
   tags: ['relaxation', 'hobby', 'home', 'craft', 'Wednesday', 'Thursday', 'Sunday', 'evening', 'solo']
  },
  {
    id: 'playing_records',
    name: 'Playing Records',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['music', 'relaxation', 'leisure', 'solo', 'evening', 'Saturday', 'Friday', 'Sunday', 'home']
  },
    {
    id: 'make_music',
    name: 'Making Music',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['music', 'creativity', 'relaxation', 'leisure', 'Saturday', 'Sunday', 'evening', 'home'],
  },
  {
  id: 'outdoor_music',
  name: 'Playing Music Outdoors',
  category: 'Creative & Arts',
  secondaryCategory: 'Music & Performance',
  weatherSensitive: true,
  tags: ['music', 'performance', 'practice', 'social', 'creative', 'Friday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature<8',                // cold fingers, detuning
    'temperature>30',              // heat discomfort, glue softens
    'windSpeed>20',                // disruptive
    'precipitation>1',             // even drizzle can ruin wood
    'humidity>85',                 // too damp
    'visibility<2'                 // fog, unsafe
  ],
  fairConditions: [
    'temperature=8..12',           // chilly but playable in a coat
    'temperature=25..30',          // hot, shady spot needed
    'windSpeed=12..18',            // breezy, might need to anchor music
    'cloudCover=70-90',            // grey skies, less vibrant
    'humidity=70..85',             // damp but manageable
    'visibility=2..5'              // misty but atmospheric
  ],
  goodConditions: [
    'temperature=12..25',
    'windSpeed<12',
    'cloudCover=10-70',
    'precipitation=0',
    'humidity=40-70',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<5',
    'cloudCover=20-50',
    'precipitation=0',
    'humidity=50-65',
    'visibility>10'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise at home, compose, or maintain instruments'
},
 {
  id: 'outdoor_chess',
  name: 'Park Chess',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['leisure', 'strategy', 'outdoor', 'social', 'Saturday', 'Sunday'],
  poorConditions: [
    'precipitation>0',             // rain ruins the board
    'windSpeed>20',                // blows pieces away
    'temperature<2',               // fingers too cold to move pieces
    'temperature>30',              // overheated and uncomfortable
    'visibility<2'                 // can't see the board
  ],
  fairConditions: [
    'temperature=2..10',           // brisk, but playable with gloves
    'temperature=26..30',          // warm but tolerable in shade
    'windSpeed=12..18',            // breezy, may need to hold the board
    'cloudCover=80-100',           // grey skies, low contrast
    'visibility=2..5'              // misty but moody
  ],
  goodConditions: [
    'temperature=10..26',
    'windSpeed<12',
    'cloudCover=0-80',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<6',
    'cloudCover=20-50',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Play online, at a café, or solve puzzles at home'
},

{
  id: 'windsurfing',
  name: 'Windsurfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'skill', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed<6',                   // not enough power
    'windSpeed>30',                  // dangerous, too strong
    'gust>20',                       // sudden bursts too difficult
    'precipitation>5',               // reduced visibility, unpleasant
    'temperature<12',                // cold, uncomfortable
    'waterTemperature<14',           // risk of cold shock
    'waveHeight>2'                   // hard to control board
  ],
  fairConditions: [
    'windSpeed=6..10',               // light breeze, OK for learning
    'gust=15..20',                   // gusty but manageable
    'temperature=12..16',            // cool but manageable
    'waterTemperature=14..15',       // brisk, but wetsuit helps
    'waveHeight=1.5..2',             // choppy but surfable
    'precipitation=1..3'             // drizzle or light rain
  ],
  goodConditions: [
    'windSpeed=10..22',
    'gust<=15',
    'temperature=16..26',
    'waterTemperature=15..22',
    'waveHeight<1.5',
    'precipitation<=2'
  ],
  perfectConditions: [
    'windSpeed=14..18',
    'gust<10',
    'temperature=18..24',
    'waterTemperature>=16',
    'waveHeight=0.5..1',
    'precipitation=0'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise balance, study technique videos, or maintain your gear'
},
{
  id: 'sailing',
  name: 'Sailing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'skill', 'weekend', 'holiday'],
  poorConditions: [
    'windSpeed<8',              // Too little wind to sail effectively or for beginners
    'windSpeed>25',             // Too strong, risky especially for small boats
    'gust>15',                  // Excessive gusts make handling difficult
    'precipitation>5',          // Heavy rain reduces visibility and comfort
    'temperature<10',           // Cold air temp may reduce comfort
    'waveHeight>1'              // High waves can be unsafe for small boats
  ],
  fairConditions: [
    'windSpeed=8..10',          // Light winds, okay for relaxed outings
    'gust=10..15',              // Gusty but manageable
    'temperature=10..14',       // Cool but tolerable with layers
    'waveHeight=0.8..1',        // Some chop, manageable with caution
    'precipitation=1..5'        // Showers or light rain
  ],
  goodConditions: [
    'windSpeed=10..18',         // Moderate steady winds, ideal range
    'gust<=10',                 // Low to moderate gusts for control
    'temperature=14..26',       // Comfortable air temp range
    'waveHeight<0.8',           // Calm to slight chop preferred
    'precipitation<=5'          // Light or no rain
  ],
  perfectConditions: [
    'windSpeed=12..16',         // Steady moderate breeze ideal for ease and enjoyment
    'gust<5',                   // Very steady wind, minimal gusts
    'temperature=16..24',       // Pleasant warm temps
    'waveHeight<0.5',           // Glassy or very calm waters favoured
    'precipitation=0'           // No rain or storms
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Work on sailing theory, practise rope handling, or maintain your boat gear'
},

{
  id: 'kitesurfing',
  name: 'Kitesurfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'extreme', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed<6',                // Too light to stay up
    'windSpeed>15',               // Gusty/dangerous for beginners
    'gust>20',                    // Sudden gusts add danger
    'precipitation>3',            // Reduces visibility, unpleasant
    'temperature<14',             // Cold & uncomfortable
    'waterTemperature<15',        // Risk of cold shock
    'waveHeight>2'                // Too rough for learning
  ],
  fairConditions: [
    'windSpeed=6..7',             // Just enough for light riders or larger kites
    'gust=10..15',                // Manageable for confident riders
    'temperature=14..16',         // Slightly chilly
    'waterTemperature=15..16',    // Borderline comfort
    'waveHeight=1.5..2',          // Rougher than ideal
    'precipitation=1..3'          // Light rain possible
  ],
  goodConditions: [
    'windSpeed=7..12',            // Steady & safe
    'gust<12',
    'temperature=16..28',
    'waterTemperature=16..22',
    'waveHeight<1.5'
  ],
  perfectConditions: [
    'windSpeed=8..11',            // “Goldilocks” for control
    'gust<8',
    'temperature=20..26',
    'waterTemperature>=17',
    'waveHeight=0.5..1.2',
    'precipitation=0'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise balance, review safety procedures, or watch instructional videos'
},
{
  id: 'scuba_diving',
  name: 'Scuba Diving',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'exploration', 'adventure', 'underwater', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'waterTemperature<15',       // Too cold without drysuit
    'airTemperature<12',
    'waveHeight>1.2',            // Rough entry/exit, more risk
    'precipitation>6',           // Heavy rain — surface/boat visibility
    'windSpeed>13',              // Difficult entries and safety risk
    'visibility<4'               // Low underwater visibility
    // 'current>strong'           // Add if you have current data
  ],
  fairConditions: [
    'waterTemperature=15..17',
    'airTemperature=12..16',
    'waveHeight=0.9..1.2',
    'windSpeed=10..13',
    'visibility=4..6',
    'precipitation=1..6'
  ],
  goodConditions: [
    'waterTemperature=17..22',
    'airTemperature=16..28',
    'waveHeight<0.9',
    'windSpeed<10',
    'visibility=6..15'
  ],
  perfectConditions: [
    'waterTemperature>=18',
    'airTemperature=20..26',
    'waveHeight<0.6',
    'windSpeed<7',
    'visibility>=10',
    'precipitation=0'
    // 'cloudCover<=25'           // Optional: sunny dive days
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise buoyancy in a pool, clean gear, or review dive logs and plan your next trip'
},
{
  id: 'jetskiing',
  name: 'Jetskiing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'motor', 'adventure', 'power', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed>15',             // Too rough, choppy, or risky for control (~30+ km/h)
    'windSpeed<2',              // Calm may indicate fog, poor awareness
    'waveHeight>2',             // Large waves are dangerous
    'waterTemperature<13',      // Cold water increases risk
    'precipitation>6',          // Heavy rain → poor visibility, safety risk
    'temperature<12',           // Air too cold for comfort, hypothermia risk
    'gust>10'              // Sharp gusts make handling erratic
  ],
  fairConditions: [
    'windSpeed=10..15',         // Stronger breeze, bumpy for novices
    'temperature=14..16',       // Cooler but tolerable
    'waveHeight=1.2..1.8',      // Mild chop
    'waterTemperature=13..14',  // Cold but manageable in short bursts
    'precipitation=3..6',
    'gust=6..10'           // Occasional gusts may impact balance
  ],
  goodConditions: [
    'windSpeed=2..10',          // Light to moderate breeze
    'temperature=16..30',
    'waveHeight=0.2..1.2',      // Small chop is fun, doesn’t throw off balance
    'waterTemperature=14..24',
    'precipitation=0..3',
    'gust=2..6'            // Low gust, manageable
  ],
  perfectConditions: [
    'windSpeed=3..7',           // Just enough breeze for cooling, not choppy
    'temperature=18..28',
    'waveHeight=0.2..0.8',      // Light chop or flat, stable riding
    'waterTemperature>=16',
    'precipitation=0',
    'gust<2'               // Very steady air, easy control
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Watch safety briefings, service your jetski, or plan your next route using maps and tide charts'
},

{
  id: 'cricket',
  name: 'Cricket',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'bat-and-ball', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'precipitation>1',       // light drizzle tolerated
    'windSpeed>25',          // too gusty
    'temperature<8',         // uncomfortably cold
    'temperature>35',        // oppressive heat
    'visibility<2'           // bad light
  ],

  fairConditions: [
    'temperature=8..12',      // brisk morning matches
    'temperature=30..32',     // hot but tolerable with breaks
    'windSpeed=20..25',       // slightly gusty but playable
    'precipitation=0.5..1',   // occasional drizzle
    'visibility=2..5'         // hazy light but not unsafe
  ],

  goodConditions: [
    'temperature=12..30',     // broad comfortable range
    'windSpeed<20',
    'precipitation=0..2',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=20..25',
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [5, 6, 7, 8, 9],

  indoorAlternative: 'Watch match highlights, practise batting drills, or read cricket biographies'
},
  {
  id: 'rugby',
  name: 'Rugby',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'contact', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'precipitation>15',     // waterlogged pitch
    'windSpeed>30',         // dangerously gusty
    'temperature<0',        // freezing, icy
    'temperature>35',       // oppressive heat
    'visibility<2'          // fog, unsafe
  ],

  fairConditions: [
    'temperature=0..5',       // cold but common in winter leagues
    'temperature=28..30',     // hot, with breaks/hydration
    'windSpeed=20..30',       // gusty but playable
    'precipitation=5..15',    // moderate rain, slippery pitch
    'visibility=2..5'         // hazy or low light
  ],

  goodConditions: [
    'temperature=5..28',      // tolerable range for most
    'windSpeed<20',
    'precipitation=0..5',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=12..18',
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [9, 10, 11, 12, 1, 2, 3],

  indoorAlternative: 'Hit the gym, practise drills indoors, or watch match footage'
},
  {
  id: 'stargazing',
  name: 'Stargazing',
  category: 'Outdoor Activities',
  secondaryCategory: 'Nature Activities',
  weatherSensitive: true,
  tags: ['night', 'sky', 'astronomy', 'Friday', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'clouds>50',          // too much cloud cover
    'precipitation>0',    // rain blocks view
    'windSpeed>20',       // hard to stay comfortable
    'temperature<-5'      // extreme cold
  ],

  fairConditions: [
    'temperature=-5..5',    // chilly but manageable
    'clouds=20..50',        // patchy, some gaps
    'windSpeed=10..20'      // breezy, may reduce comfort
  ],

  goodConditions: [
    'temperature=5..15',     // crisp but pleasant
    'clouds<=20',            // mostly clear
    'windSpeed<10'           // calm or gentle breeze
  ],

  perfectConditions: [
    'temperature=8..12',     // just right
    'clouds=0',              // clear skies
    'windSpeed<5'            // still night
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
},
  {
  id: 'basketball_outdoor',
  name: 'Basketball (Outdoor)',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['exercise', 'sport', 'team', 'outdoor', 'social', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'precipitation>0',      // slippery & unsafe
    'windSpeed>20',         // disruptive to play
    'temperature<5',        // too cold for comfort
    'temperature>35',       // risk of heat stress
    'visibility<2'          // fog/darkness
  ],

  fairConditions: [
    'temperature=5..12 or temperature=28..32',  // cool or hot but tolerable
    'windSpeed=18..20',                         // breezy but still playable
    'visibility=2..5',                          // hazy or low light conditions
    'cloudCover=70-100'                         // overcast but dry
  ],

  goodConditions: [
    'temperature=12..28',   // comfortable for most
    'windSpeed<18',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..22',   // mild & comfortable
    'windSpeed<10',
    'visibility>10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Play at an indoor gym or practise shooting drills at home'
},
{
  id: 'skateboarding',
  name: 'Skateboarding',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['exercise', 'outdoor', 'leisure', 'lifestyle', 'creative', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'temperature<5',               // too cold, stiff joints
    'temperature>32',              // oppressive heat
    'windSpeed>20',                // gusty, unstable
    'precipitation>0',             // wet surface, unsafe
    'visibility<2'                 // fog, unsafe
  ],

  fairConditions: [
    'temperature=5..12 or temperature=28..32', // cool or hot but tolerable
    'windSpeed=18..20',                        // breezy but manageable
    'cloudCover=90-100',                       // overcast, not ideal
    'visibility=2..5'                          // dim or hazy
  ],

  goodConditions: [
    'temperature=12..28',         // broad range
    'windSpeed<18',
    'cloudCover=0-90',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..24',         // comfortable
    'windSpeed<10',               // calm
    'cloudCover=10-50',
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Find a covered spot under a bridge, in a garage, or at an indoor skatepark'
},
 {
  id: 'frisbee',
  name: 'Frisbee',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['leisure', 'outdoor', 'social', 'fun', 'light_exercise', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'temperature<5',              // too cold to enjoy
    'temperature>32',             // too hot & uncomfortable
    'windSpeed>20',               // frisbee control very poor
    'precipitation>2',            // wet & slippery
    'visibility<2'                // foggy, unsafe
  ],

  fairConditions: [
    'temperature=5..10 or temperature=28..32', // chilly or hot but playable
    'windSpeed=15..20',                        // breezy, throws go wild
    'cloudCover=80-100',                       // overcast or grey skies
    'precipitation=0.5..2',                    // light drizzle possible
    'visibility=2..5'                          // a bit murky
  ],

  goodConditions: [
    'temperature=10..28',        // comfortable for most
    'windSpeed<15',              // still playable
    'cloudCover=0-80',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..24',        // ideal comfort
    'windSpeed<8',               // calm & easy control
    'cloudCover=20-50',
    'visibility>10'
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise throws indoors or play a tabletop game with friends'
},
{
  id: 'outdoor_yoga',
  name: 'Yoga in the Park',
  category: 'Fitness & Wellness',
  secondaryCategory: 'Mindfulness',
  weatherSensitive: true,
  tags: [
    'exercise',
    'outdoor',
    'mindfulness',
    'relaxation',
    'wellbeing',
    'social',
    'nature',
    'fresh_air',
    'Saturday',
    'Sunday',
    'holiday'
  ],

  poorConditions: [
    'precipitation>0',            // rain makes it wet and unsafe
    'windSpeed>20',               // gusts make balance difficult
    'temperature<8',              // too cold for comfort
    'temperature>30',             // oppressive heat
    'humidity>85',                // muggy & sticky
    'visibility<2'                // foggy, gloomy
  ],

  fairConditions: [
    'temperature=8..12 or temperature=26..30', // slightly chilly or warm but manageable
    'windSpeed=12..18',                        // breezy but tolerable
    'humidity=75..85',                         // sticky but still possible
    'cloudCover=70-100',                       // dull or overcast
    'visibility=2..5'                          // hazy conditions
  ],

  goodConditions: [
    'temperature=12..26',
    'windSpeed<12',
    'cloudCover=0-70',
    'humidity<75',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..22',
    'windSpeed<8',
    'cloudCover=20-50',
    'humidity=50-65',
    'visibility>10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise at home with a video, visit a studio, or do a short meditation session'
},
 {
  id: 'outdoor_gym',
  name: 'Outdoor Gym',
  category: 'Fitness & Wellness',
  secondaryCategory: 'Strength & Gym',
  weatherSensitive: true,
  tags: ['exercise', 'outdoor', 'fitness', 'social', 'accessible', 'Saturday', 'Sunday', 'holiday'],

  poorConditions: [
    'precipitation>5',           // heavy rain makes it unpleasant
    'windSpeed>25',              // strong wind, especially risky for elderly
    'temperature<2',             // too cold, risk of stiffness or slips
    'temperature>35',            // excessive heat, unsafe for older users
    'visibility<2'               // foggy, unsafe
  ],

  fairConditions: [
    'temperature=2..8 or temperature=28..32', // cool or warm but manageable
    'windSpeed=15..20',                       // breezy but not unsafe
    'cloudCover=80-100',                      // overcast or dull light
    'humidity=80..90',                        // muggy but tolerable
    'visibility=2..5'                         // hazy conditions
  ],

  goodConditions: [
    'temperature=8..28',         // broad acceptable range
    'windSpeed<15',
    'cloudCover=0-80',
    'humidity<80',
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=15..22',        // mild & comfortable
    'windSpeed<8',
    'cloudCover=20-50',
    'humidity=40-65',
    'visibility>10'
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Head to an indoor gym or do a bodyweight workout at home'
},
  {
  id: 'rollerblading',
  name: 'Rollerblading',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['exercise', 'outdoor', 'fitness', 'fun', 'leisure', 'Saturday', 'Sunday', 'holiday'],

  // Unsafe or unpleasant conditions
  poorConditions: [
    'temperature<5',               // cold, stiff joints
    'temperature>32',              // heat stress
    'windSpeed>20',                // gusty, unstable
    'precipitation>0',             // wet surface, dangerous
    'visibility<2'                 // fog, unsafe
  ],

  // Manageable but not ideal — may require caution
  fairConditions: [
    'temperature=5..10 or 28..30', // brisk or slightly hot
    'windSpeed=15..20',            // breezy, may affect balance
    'cloudCover=80-100',           // overcast skies
    'visibility=2..5'              // misty or hazy
  ],

  // Comfortable and safe conditions
  goodConditions: [
    'temperature=10..28',          // wide comfort range
    'windSpeed<15',
    'cloudCover=0-80',
    'visibility>5'
  ],

  // Optimal, enjoyable weather
  perfectConditions: [
    'temperature=18..24',          // mild and comfortable
    'windSpeed<8',                 // stable and safe
    'cloudCover=10-50',
    'visibility>10'
  ],

  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],

  indoorAlternative: 'Visit an indoor roller rink or practise strength & balance exercises at home'
},
{
  id: 'outdoor_painting',
  name: 'Painting Outdoors',
  category: 'Creative & Arts',
  secondaryCategory: 'Visual Arts',
  weatherSensitive: true,
  tags: ['art', 'outdoor', 'relaxation', 'mindfulness', 'hobby', 'Saturday', 'Sunday', 'holiday'],

  // Unsafe, uncomfortable, or impractical for painting
  poorConditions: [
    'precipitation>0',            // rain spoils paper, canvas, paint
    'windSpeed>20',               // blows over easel & supplies
    'temperature<5',              // too cold for hands & comfort
    'temperature>30',             // uncomfortable & damaging to paints
    'humidity>85',                // damp & sticky, paper curls
    'visibility<2'                // fog or very poor light
  ],

  // Conditions that require adaptation (wind blocks, sun shelter, etc.)
  fairConditions: [
    'temperature=5..12 or 26..30', // chilly or quite warm
    'windSpeed=12..18',            // breezy, may disturb paper
    'humidity=75..85',             // sticky, paint drying issues
    'cloudCover=80-100',           // gloomy light
    'visibility=2..5'              // hazy or diffuse light
  ],

  // Comfortable and pleasant painting conditions
  goodConditions: [
    'temperature=12..26',          // pleasant range
    'windSpeed<12',                // calm to light breeze
    'cloudCover=10-80',            // even overcast is fine
    'humidity<75',                 // workable
    'visibility>5'                 // decent light
  ],

  // Ideal weather for outdoor painting
  perfectConditions: [
    'temperature=18..22',          // ideal comfort
    'windSpeed<6',                 // very calm
    'cloudCover=20-50',            // some sun for highlights
    'humidity=50-65',              // comfortable
    'visibility>10'                // clear & bright
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

  indoorAlternative: 'Work on studio pieces, practise techniques, or plan your next plein air session'
},
  {
  id: 'dog_walking',
  name: 'Walking the Dog',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: [
    'leisure', 'outdoor', 'animal', 'pet', 'exercise', 'social',
    'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ],

  // Avoid these unless you're both wearing a raincoat and have strong motivation
  poorConditions: [
    'precipitation>5',               // heavy rain
    'windSpeed>30',                  // gales are no fun with a leash
    'temperature<-2 or temperature>32' // icy paws or heatstroke risk
  ],

  // Chilly, warm, or damp — not ideal, but you go anyway
  fairConditions: [
    'temperature=-2..5 or 30..32',   // cold or hot but brief walks doable
    'windSpeed=20..30',              // windy but manageable
    'precipitation=1..5',            // drizzle or showery
    'visibility=2..5'                // hazy but not unsafe
  ],

  // The usual “it’ll do” kind of weather
  goodConditions: [
    'temperature=5..30',             // tolerable range even if not ideal
    'windSpeed<20',                  // manageable for leash control
    'precipitation=0..1',            // light or no rain
    'visibility>2'                   // safe to see surroundings
  ],

  // Your dog stops every five steps to sniff the flowers — it’s that nice
  perfectConditions: [
    'temperature=16..22',
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], // Every month is a dog month

  indoorAlternative: 'Play tug or hide-and-seek indoors, or practise new tricks'
},
  {
  id: 'outdoor_reading',
  name: 'Reading in the Park',
  category: 'Outdoor Activities',
  secondaryCategory: 'Literature',
  weatherSensitive: true,
  tags: [
    'leisure', 'outdoor', 'relaxation', 'mindfulness', 'quiet',
    'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ],

  poorConditions: [
    'precipitation>0',            // rain ruins book & comfort
    'windSpeed>20',               // pages blow, unpleasant
    'temperature<8',              // too chilly to sit still
    'temperature>30',             // too hot for comfort
    'humidity>85',                // muggy & sticky
    'visibility<2'                // gloomy or foggy
  ],

  fairConditions: [
    'temperature=8..12 or 26..30',  // a little cool or warm, tolerable
    'windSpeed=12..18',             // breezy but doable if sheltered
    'humidity=75..85',              // slightly muggy
    'cloudCover=80-100',            // heavy overcast
    'visibility=2..5'               // dull light but readable
  ],

  goodConditions: [
    'temperature=12..26',           // comfortable range
    'windSpeed<12',                 // light breeze ok
    'cloudCover=10-80',             // even overcast is fine
    'humidity<75',                  // not too muggy
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..22',           // ideal comfort
    'windSpeed<6',                  // very calm
    'cloudCover=20-50',             // some sun for light
    'humidity=50-65',               // pleasant
    'visibility>10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

  indoorAlternative: 'Curl up with your book at home or in a cosy café'
},
 {
  id: 'outdoor_meditation',
  name: 'Outdoor Meditation',
  category: 'Fitness & Wellness',
  secondaryCategory: 'Mindfulness',
  weatherSensitive: true,
  tags: [
    'outdoor', 'mindfulness', 'relaxation', 'wellbeing', 'nature',
    'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ],

  poorConditions: [
    'precipitation>0',         // wet conditions ruin stillness
    'windSpeed>20',            // gusty wind distracts and chills
    'temperature<5',           // too cold to sit still comfortably
    'temperature>30'           // heat stress and discomfort
  ],

  fairConditions: [
    'temperature=5..10 or 25..30',  // cooler or hotter but tolerable
    'windSpeed=15..20',             // steady breeze may distract
    'cloudCover=80-100',            // dull, but not oppressive
    'humidity=70..85',              // sticky but manageable
    'visibility=2..5'               // hazy or misty, calming to some
  ],

  goodConditions: [
    'temperature=15..25',           // pleasant range
    'windSpeed<15'
  ],

  perfectConditions: [
    'temperature=18..22',           // ideal balance
    'windSpeed<10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
},
  {
  id: 'outdoor_playground',
  name: 'Playground Time',
  category: 'Outdoor Activities',
  secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: [
    'leisure', 'outdoor', 'family',
    'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
  ],

  poorConditions: [
    'precipitation>0',      // slippery equipment, unsafe
    'windSpeed>20',         // strong gusts are unpleasant/dangerous
    'temperature<5',        // too cold for comfort
    'temperature>30'        // risk of overheating
  ],

  fairConditions: [
    'temperature=5..10 or 25..30',   // chilly mornings or warm afternoons
    'windSpeed=15..20',              // breezy but manageable
    'cloudCover=70-100',             // grey skies, but not unpleasant
    'humidity=70..85',               // sticky but tolerable
    'visibility=2..5'                // light haze or mist
  ],

  goodConditions: [
    'temperature=15..25',            // comfortable for outdoor play
    'windSpeed<15'
  ],

  perfectConditions: [
    'temperature=18..22',            // ideal weather for children and carers
    'windSpeed<10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
},
  // --- Add these objects to your activityTypes array ---

{
  id: 'american_football',
  name: 'American Football',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'football', 'outdoors', 'autumn', 'Saturday', 'Sunday', 'holiday', 'Friday'],

  poorConditions: [
    'precipitation>15',       // very heavy rain, waterlogged
    'windSpeed>30',           // gusty, dangerous
    'temperature<0',          // freezing
    'temperature>30'          // oppressive heat
  ],

  fairConditions: [
    'temperature=0..5 or 25..30',     // cold warmups or heat-adapted sessions
    'windSpeed=20..30',               // strong winds affect play
    'precipitation=5..15',            // wet but not yet unplayable
    'visibility=2..5'                 // hazy, dusk or foggy
  ],

  goodConditions: [
    'temperature=5..25',              // acceptable for most
    'windSpeed<20',
    'precipitation=0..5'
  ],

  perfectConditions: [
    'temperature=12..18',             // mild & comfortable
    'windSpeed<10',
    'precipitation=0'
  ],

  seasonalMonths: [8, 9, 10, 11, 12],

  indoorAlternative: 'Watch a game on TV, review playbooks, or practise drills at an indoor gym'
},

{
  id: 'baseball',
  name: 'Baseball',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'bat-and-ball', 'outdoors', 'social', 'Saturday', 'Sunday', 'holiday', 'Friday'],

  poorConditions: [
    'precipitation>10',      // heavy rain cancels play
    'windSpeed>30',          // gusty, dangerous for fly balls
    'temperature<5',         // freezing & unpleasant
    'temperature>35'         // oppressive heat
  ],

  fairConditions: [
    'temperature=5..10 or 30..35',   // chilly or hot, not ideal
    'windSpeed=20..30',              // breezy affects ball flight
    'precipitation=5..10',           // showers or on/off rain
    'visibility=2..5'                // dusk, fog, or haze
  ],

  goodConditions: [
    'temperature=10..30',            // wide range tolerated
    'windSpeed<20',
    'precipitation=0..5',            // light drizzle tolerated
    'visibility>5'
  ],

  perfectConditions: [
    'temperature=18..24',            // ideal comfort
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],

  seasonalMonths: [4, 5, 6, 7, 8, 9],

  indoorAlternative: 'Practise batting at an indoor cage, watch game film, or work on fitness'
},

{
  id: 'ice_hockey',
  name: 'Ice Hockey (Outdoor)',
  category: 'Winter Sports',
  secondaryCategory: 'Ice Sports',
  weatherSensitive: true,
  tags: ['winter', 'sport', 'ice', 'outdoors', 'tradition', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature>2',            // ice melts, slushy
    'temperature<-20',         // extreme cold, unsafe
    'precipitation>2',         // snow or freezing rain ruins ice
    'windSpeed>20',            // uncomfortable, unsafe
    'visibility<2'             // fog, unsafe
  ],
  fairConditions: [
    'temperature=-20..-15',     // very cold but possible with good gear
    'windSpeed=15..20',         // blustery but tolerable
    'precipitation=1..2',       // light snow still playable
    'visibility=2..5'           // reduced but manageable
  ],
  goodConditions: [
    'temperature=-15..0',       // acceptable range
    'windSpeed<15',
    'precipitation=0',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=-5..-1',       // ideal surface & comfort
    'windSpeed<8',
    'visibility>10'
  ],
  seasonalMonths: [12, 1, 2],
  indoorAlternative: 'Play at a local indoor rink or practise stickhandling drills at home'
},

{
  id: 'ice_hockey_indoor',
  name: 'Ice Hockey (Indoor)',
  category: 'Winter Sports',
  secondaryCategory: 'Ice Sports',
  weatherSensitive: false,
  tags: ['winter', 'sport', 'ice', 'team', 'indoor', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [],
  goodConditions: [],
  perfectConditions: [],
  seasonalMonths: [9, 10, 11, 12, 1, 2, 3, 4],
  indoorAlternative: ''
},

{
  id: 'hurling_camogie',
  name: 'Hurling & Camogie',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'irish', 'cultural', 'heritage', 'community', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>15',           // heavy rain, waterlogged pitch
    'windSpeed>30',               // dangerously gusty
    'temperature<2',              // freezing, hard ground
    'visibility<2'                // fog, unsafe
  ],
  fairConditions: [
    'temperature=2..7',           // chilly but playable
    'windSpeed=20..30',           // blustery, requires skill
    'precipitation=5..15',        // moderate rain, still playable in tradition
    'visibility=2..5'             // hazy but manageable
  ],
  goodConditions: [
    'temperature=7..20',          // broad acceptable range
    'windSpeed<20',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=12..18',         // mild & ideal
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
  indoorAlternative: 'Practise drills indoors, watch match videos, or work on fitness'
},

{
  id: 'gaelic_football',
  name: 'Gaelic Football',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'irish', 'cultural', 'heritage', 'community', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>15',           // heavy rain, waterlogged pitch
    'windSpeed>30',               // dangerously gusty
    'temperature<2',              // freezing, hard ground
    'visibility<2'                // fog, unsafe
  ],
  fairConditions: [
    'temperature=2..7',           // chilly but playable
    'windSpeed=20..30',           // gusty, but games often proceed
    'precipitation=5..15',        // steady rain, less pleasant but traditional
    'visibility=2..5'             // misty or foggy, but usually tolerated
  ],
  goodConditions: [
    'temperature=7..20',          // broad acceptable range
    'windSpeed<20',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=12..18',         // mild & ideal
    'windSpeed<10',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
  indoorAlternative: 'Practise drills indoors, watch match videos, or work on fitness'
},

{
  id: 'hockey',
  name: 'Field Hockey',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'field', 'outdoor', 'social', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>8',             // heavy rain makes surface unplayable
    'windSpeed>25',                // gusty, uncomfortable
    'temperature<2',               // freezing, unsafe
    'temperature>32',              // oppressive heat
    'visibility<2'                 // fog or poor light
  ],
  fairConditions: [
    'temperature=2..8 or 28..32',  // chilly or hot but tolerable
    'windSpeed=15..25',            // breezy, not ideal
    'precipitation=3..8',          // showers likely but manageable
    'visibility=2..5'              // reduced visibility, still playable
  ],
  goodConditions: [
    'temperature=8..28',           // broad range tolerated
    'windSpeed<15',
    'precipitation=0..3',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=15..20',          // mild & comfortable
    'windSpeed<8',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise skills at an indoor hall or watch match replays'
},

{
  id: 'padel',
  name: 'Padel',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'racquet', 'social', 'outdoors', 'leisure', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>2',            // heavy drizzle or more makes court slippery
    'windSpeed>25',               // strong gusts disrupt play
    'temperature<8',              // uncomfortably cold
    'temperature>32'              // heat exhaustion risk
  ],
  fairConditions: [
    'temperature=8..10 or 28..32', // cooler or hotter than ideal, still doable
    'windSpeed=20..25',            // gusty, affects shots
    'precipitation=1..2'           // light rain, some may continue
  ],
  goodConditions: [
    'temperature=10..28',          // broad playable range
    'windSpeed<20',
    'precipitation=0..2'           // light drizzle tolerated
  ],
  perfectConditions: [
    'temperature=18..22',          // mild & comfortable
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  // Many enthusiasts prefer evenings under floodlights, especially in summer
  indoorAlternative: 'Play on an indoor padel court or practise drills at home'
},

{
  id: 'pickleball',
  name: 'Pickleball',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'racquet', 'social', 'outdoors', 'leisure', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>0',            // wet courts are unplayable
    'windSpeed>15',               // ball too light for control
    'temperature<8',              // uncomfortably cold
    'temperature>32'              // heat exhaustion risk
  ],
  fairConditions: [
    'temperature=8..10 or 28..32', // cooler or hotter than ideal but still manageable
    'windSpeed=12..15'             // breezy, ball may drift
  ],
  goodConditions: [
    'temperature=10..28',          // broad acceptable range
    'windSpeed<12',
    'precipitation=0'              // dry court
  ],
  perfectConditions: [
    'temperature=18..22',          // mild & pleasant
    'windSpeed<8',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Book an indoor court, practise drills at home, or watch strategy videos'
},

{
  id: 'netball',
  name: 'Netball',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'outdoors', 'social', 'fitness', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>5',           // slippery court, unsafe
    'windSpeed>20',              // disruptive to passing
    'temperature<5',             // uncomfortably cold
    'temperature>30',            // heat stress risk
    'visibility<2'               // fog or very poor light
  ],
  fairConditions: [
    'temperature=5..10 or 28..30', // chilly or hot but tolerable
    'windSpeed=15..20',            // breezy but playable
    'precipitation=2..5',          // damp but possible with caution
    'visibility=2..5'              // dull light, still visible
  ],
  goodConditions: [
    'temperature=10..28',          // broad acceptable range
    'windSpeed<15',
    'precipitation=0..2',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..22',          // mild & comfortable
    'windSpeed<8',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Book an indoor court, practise drills, or join a local league training session'
},
  {
    id: 'cooking',
    name: 'Cooking',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['creativity', 'relaxation', 'home', 'family', 'Saturday', 'Sunday', 'evening']
  },
    {
    id: 'cinema',
    name: 'Cinema',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'leisure', 'Friday', 'Saturday', 'Sunday', 'evening', 'social']
  },
      {
    id: 'bowling',
    name: 'Bowling',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'leisure', 'Friday', 'Saturday', 'Sunday', 'evening', 'social']
  },
    {
    id: 'shopping',
    name: 'Shopping',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['leisure', 'social', 'Sunday', 'family', 'Saturday', 'Friday',]
  },
      {
    id: 'museum',
    name: 'Museum',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'Saturday', 'Sunday', 'evening']
  },
        {
    id: 'gallery',
    name: 'Gallery',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'Saturday', 'Sunday', 'evening']
  },
        {
    id: 'cafe',
    name: 'Visiting a Café',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'relaxation', 'leisure', 'home', 'Saturday', 'Sunday', 'evening', 'family']
  },
];