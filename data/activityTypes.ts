// All condition keys are normalised: temp → temperature, wind_speed → windSpeed, rain → precipitation

export interface ActivityType {
  id: string;
  name: string;
  category: string;
  secondaryCategory?: string;
  weatherSensitive: boolean;
  tags: string[];
  poorConditions?: string[];
  goodConditions?: string[];
  perfectConditions?: string[];
  indoorAlternative?: string;
  /**
   * In which months this activity is considered 'in season' (1 = January, ..., 12 = December)
   */
  seasonalMonths?: number[];
}

export const activityTypes: ActivityType[] = [
  {
    id: 'running',
    name: 'Running',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport', 'cardio', 'exercise', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<0',
      'temperature>28',
      'windSpeed>25',
      'precipitation>4',
      'humidity>90',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=5..25',
      'windSpeed<18',
      'clouds=0-100',
      'humidity<80',
      'visibility>2',
    ],
    perfectConditions: [
      'temperature=10..16',
      'windSpeed<8',
      'clouds=20-60',
      'humidity=45-55',
      'visibility>10',
      'precipitation=0'
    ],
  },
{
    id: 'trail_running',
    name: 'Trail Running',
    category: 'Active Sports',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport', 'trail', 'nature', 'outdoors', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<2',
      'temperature>28',
      'windSpeed>25',
      'precipitation>4',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=2..22',
      'windSpeed<15',
      'clouds=0-80',
      'humidity<80',
      'visibility>2',
      // 'trail_passable',
    ],
    perfectConditions: [
      'temperature=8..14',
      'windSpeed<8',
      'clouds=10-50',
      'visibility>10',
      'humidity=40-55',
      'precipitation=0',
      // 'firm_trail',
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
    poorConditions: [
      'temperature<0',
      'temperature>32',
      'windSpeed>25',
      'precipitation>3',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=5..28',
      'windSpeed<15',
      'clouds=0-80',
      'humidity<80',
      'visibility>5',
    ],
    perfectConditions: [
      'temperature=16..22',
      'windSpeed<8',
      'clouds=10-50',
      'humidity=40-55',
      'precipitation=0',
      'visibility>10',
    ],
},
{
    id: 'cycling',
    name: 'Cycling',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'cardio', 'group', 'solo', 'Saturday', 'Sunday', 'Wednesday'],
    poorConditions: [
      'temperature<0',
      'temperature>32',
      'windSpeed>25',
      'precipitation>3',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=5..28',
      'windSpeed<15',
      'clouds=0-80',
      'humidity<80',
      'visibility>5',
    ],
    perfectConditions: [
      'temperature=16..22',
      'windSpeed<8',
      'clouds=10-50',
      'humidity=40-55',
      'precipitation=0',
      'visibility>10',
    ],
},
{
    id: 'mountain_biking',
    name: 'Mountain Biking',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'trail', 'nature', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<0',
      'temperature>30',
      'windSpeed>30',
      'precipitation>5',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=5..25',
      'windSpeed<20',
      'clouds=0-90',
      'humidity<85',
      'visibility>5',
    ],
    perfectConditions: [
      'temperature=10..18',
      'windSpeed<10',
      'clouds=10-50',
      'humidity=50-65',
      'precipitation=0',
      'visibility>10',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
},
  {
    id: 'gravel_biking',
    name: 'Gravel Biking',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'mixed_surface', 'adventure'],
    poorConditions: [
      'temperature<0',
      'temperature>30',
      'windSpeed>25',
      'precipitation>4',
      'visibility<2',
    ],
    goodConditions: [
      'temperature=5..24',
      'windSpeed<15',
      'clouds=0-75',
      'humidity<75',
      'visibility>5',
    ],
    perfectConditions: [
      'temperature=10..18',
      'windSpeed<8',
      'clouds=20-50',
      'humidity=45-55',
      'precipitation=0',
      'visibility>10',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
},
{
    id: 'fly_fishing_freshwater',
    name: 'Fly Fishing (Freshwater)',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater', 'technique', 'quiet', 'outdoors', 'patience', 'nature', 'Saturday', 'Sunday', 'Friday'],
    poorConditions: [
      'temperature<0',
      'temperature>28',
      'windSpeed>20',
      'precipitation>5',
      'visibility<2'
    ],
    goodConditions: [
      'temperature=8..22',
      'windSpeed<12',
      'clouds=50-100',
      'precipitation=0..2',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<8',
      'clouds=70-100',
      'precipitation=0',
      'visibility>10'
    ],
    indoorAlternative: 'Tie some flies',
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
},
{
    id: 'outdoor_gardening',
    name: 'Gardening',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['hobby', 'relaxation', 'nature', 'creative', 'Saturday', 'Sunday'],
    poorConditions: [
      'airTemperature<0',            // freezing, uncomfortable
      'airTemperature>35',           // too hot
      'windSpeed>20',                // uncomfortable & damaging
      'precipitation>10',            // heavy rain
      'soilMoisture>80',             // soil waterlogged
      'soilMoisture<10',             // soil too dry/dusty
      'visibility<2'                 // fog/poor light
    ],
    goodConditions: [
      'airTemperature=12..27',       // comfortable range
      'windSpeed<12',                // calm to light breeze
      'cloudCover=50-100',           // overcast is fine
      'precipitation=0..2',          // light drizzle acceptable
      'humidity<80',                 // tolerable mugginess
      'soilMoisture=20..60',         // workable soil
      'visibility>5'
    ],
    perfectConditions: [
      'airTemperature=18..24',       // ideal for comfort & growth
      'windSpeed<5',                 // still
      'cloudCover=50-90',            // light overcast reduces glare
      'humidity=50-70',              // comfortable
      'soilMoisture=30-50',          // moist, easy to work
      'precipitation=0',             // dry
      'visibility>10'
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
    poorConditions: [
      'waterTemperature<10',           // very cold, unpleasant for most
      'airTemperature<5',              // very cold
      'waveHeight<0.3',                // too flat
      'waveHeight>2.5',                // too big for most
      'windSpeed>20',                  // messy, unsafe
      'windDirection=onshore',        // blows waves flat
      'visibility<2',                  // foggy, unsafe
      'precipitation>10'               // stormy
    ],
    goodConditions: [
      'waterTemperature=14..20',       // wetsuit comfortable
      'airTemperature=12..25',         // pleasant air
      'waveHeight=0.5..1.8',           // manageable
      'swellPeriod=8..12',             // clean, spaced swell
      'windSpeed=5..15',               // light to moderate breeze
      'windDirection=offshore',        // holds waves up
      'visibility>5'
    ],
    perfectConditions: [
      'waterTemperature=16..20',       // mild water
      'airTemperature=18..24',         // ideal air temp
      'waveHeight=0.8..1.5',           // shoulder-high waves
      'swellPeriod=10..12',            // classic clean swell
      'windSpeed=5..10',               // light offshore
      'windDirection=offshore',        // perfect wave shape
      'visibility>10'
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
    poorConditions: [
      'temperature<0',
      'temperature>35',
      'windSpeed>25',
      'precipitation>10',
      'visibility<1'
    ],
    goodConditions: [
      'temperature=8..24',
      'windSpeed<15',
      'clouds=20-80',
      'humidity<75',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..18',
      'windSpeed<10',
      'clouds=20-50',
      'humidity=40-60',
      'visibility>10'
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
    poorConditions: [
      'temperature>2',                // snow melts
      'temperature<-20',             // too cold
      'windSpeed>30',                // high winds, lifts close
      'precipitation>2',             // heavy snowstorm/blizzard
      'visibility<1',                // whiteout
      // 'snowDepth<20',             // not enough base (Meteomatics)
      // 'iceConditions=true'        // icy slopes (Meteomatics)
    ],
    goodConditions: [
      'temperature=-12..0',          // comfortable cold
      'windSpeed<20',
      'clouds=25-75',                // some sun, some contrast
      'visibility>2',
      // 'snowDepth=50..150',        // good base depth (Meteomatics)
      // 'freshSnow>5'              // recent powder (Meteomatics)
    ],
    perfectConditions: [
      'temperature=-6..-2',          // ideal snow/comfort balance
      'windSpeed<10',
      'clouds=10-50',                // bluebird or partly cloudy
      'visibility>5',
      // 'snowDepth=100..200',      // excellent coverage (Meteomatics)
      // 'freshSnow=10..20'         // fresh powder overnight (Meteomatics)
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
    poorConditions: [
      'temperature<0',
      'temperature>30',
      'windSpeed>15',
      'precipitation>5',
      'visibility<2'
    ],
    goodConditions: [
      'temperature=5..24',
      'windSpeed<12',
      'cloudCover=20-80',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<5',
      'cloudCover=30-60',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 9, 10, 11],
    indoorAlternative: 'Review your field guide and update your sightings log'
},
  {
    id: 'coarse_fishing',
    name: 'Coarse and Carp Fishing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater', 'quiet', 'patience', 'outdoors', 'nature', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<5',                // fish sluggish, angler uncomfortable
      'temperature>30',              // hot, fish stressed
      'windSpeed>20',                // casting & bite detection hard
      'precipitation>15',            // very wet
      'visibility<2'                 // foggy & unsafe
    ],
    goodConditions: [
      'temperature=10..24',
      'windSpeed=0..12',
      'cloudCover=50-100',
      'visibility>5'
      // 'stable_pressure'
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed=3..8',
      'cloudCover=70-90',
      'visibility>10'
      // 'falling_pressure'
      // 'light_precipitation<2'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    indoorAlternative: 'Tie rigs, sort your tackle box, or plan your next session'
},
  {
    id: 'soccer',
    name: 'Soccer',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'outdoors', 'football', 'Saturday', 'Sunday', 'Wednesday'],
    poorConditions: [
      'temperature<0',                // freezing & icy pitch
      'temperature>32',              // heat stroke risk
      'windSpeed>30',                // hard to play
      'precipitation>15',            // flooded pitch
      'visibility<2'                 // unsafe
    ],
    goodConditions: [
      'temperature=5..25',
      'windSpeed<20',
      'cloudCover=20-90',
      'precipitation=0..5',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<10',
      'cloudCover=40-70',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [2, 3, 4, 5, 8, 9, 10, 11],
    indoorAlternative: 'Hit the gym for drills, or play futsal indoors'
},
{
    id: 'kayaking',
    name: 'Kayaking',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport', 'water', 'outdoors', 'adventure', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'temperature<5',                // cold, hypothermia risk
      'temperature>30',              // heat stress
      'windSpeed>25',                // unsafe, hard to control
      'waveHeight>1.2',              // too rough
      'visibility<2',                // navigation risk
      'precipitation>10'             // heavy rain, visibility & comfort
    ],
    goodConditions: [
      'temperature=10..24',
      'windSpeed<15',
      'waveHeight<0.8',
      'visibility>5',
      'precipitation=0..2'
    ],
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<8',
      'waveHeight<0.3',
      'visibility>10',
      'precipitation=0'
    ],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Check your gear, practise strokes on a paddle machine, or plan your next trip'
},
{
    id: 'rock_climbing',
    name: 'Rock Climbing',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'outdoors', 'adventure', 'technical', 'Saturday', 'Sunday', 'Friday'],
    poorConditions: [
      'temperature<5',                // too cold for comfort & friction
      'temperature>30',              // hot, sweaty, dangerous
      'windSpeed>25',                // gusts & chill
      'precipitation>2',             // wet rock, dangerous
      'humidity>80',                 // greasy holds
      'visibility<2'                 // unsafe navigation
    ],
    goodConditions: [
      'temperature=10..22',
      'windSpeed<15',
      'humidity<60',
      'cloudCover=20-50',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<8',
      'humidity=30-50',
      'cloudCover=20-40',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 6, 9, 10],
    indoorAlternative: 'Train at an indoor climbing gym or work on finger strength at home'
},
  {
    id: 'golf',
    name: 'Golf',
    category: 'Outdoor Activities',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],
    poorConditions: [
      'temperature<5',                // cold, uncomfortable, frost
      'temperature>30',              // heat stroke risk
      'windSpeed>30',                // very strong winds
      'precipitation>10',            // heavy rain
      'visibility<2',                // fog, unsafe
      // 'thunderstorm'              // danger from lightning
    ],
    goodConditions: [
      'temperature=10..25',
      'windSpeed<20',
      'cloudCover=20-90',
      'precipitation=0..3',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..21',
      'windSpeed<10',
      'cloudCover=30-60',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Practise your swing at the driving range or putting indoors with a mat'
},
  {
    id: 'tennis',
    name: 'Outdoor Tennis',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],
    poorConditions: [
      'temperature<5',                // freezing, icy courts
      'temperature>32',              // risk of heat exhaustion
      'windSpeed>25',                // too gusty for play
      'precipitation>5',             // wet, unsafe surface
      'visibility<2'                 // fog
    ],
    goodConditions: [
      'temperature=10..25',
      'windSpeed<15',
      'cloudCover=20-80',
      'precipitation=0..1',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..21',
      'windSpeed<8',
      'cloudCover=30-60',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Book a court at an indoor tennis centre or work on fitness at the gym'
},
{
    id: 'beach_volleyball',
    name: 'Beach Volleyball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'social', 'beach', 'outdoors', 'Saturday', 'Sunday', 'Friday'],
    poorConditions: [
      'temperature<12',               // too cold for bare feet & sand
      'temperature>35',              // risk of heat exhaustion
      'windSpeed>25',                // gusts blow ball away
      'precipitation>5',             // rain spoils sand & play
      'visibility<2'                 // fog
    ],
    goodConditions: [
      'temperature=18..30',
      'windSpeed<15',
      'cloudCover=0-60',
      'precipitation=0',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=22..28',
      'windSpeed<8',
      'cloudCover=10-30',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [5, 6, 7, 8, 9],
    indoorAlternative: 'Play indoor volleyball at a sports hall or practise drills at home'
},
{
    id: 'horse_riding',
    name: 'Horse Riding',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'animal', 'leisure', 'outdoors', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<5',
      'temperature>30',
      'windSpeed>25',
      'precipitation>10',
      'visibility<2'
    ],
    goodConditions: [
      'temperature=8..27',
      'windSpeed<15',
      'cloudCover=10-80',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..20',
      'windSpeed<10',
      'cloudCover=20-50',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Ride in the indoor school, groom your horse, or clean tack'
},
  {
    id: 'ice_skating',
    name: 'Outdoor Ice Skating',
    category: 'Winter Sports',
    secondaryCategory: 'Ice Sports',
    weatherSensitive: true,
    tags: ['winter', 'sport', 'leisure', 'social', 'Saturday', 'Sunday', 'Friday', 'evening'],
    poorConditions: [
      'temperature>2',               // ice too soft
      'temperature<-20',            // too cold for comfort
      'precipitation>2',            // snow/rain
      'windSpeed>20'                // uncomfortable & unsafe
    ],
    goodConditions: [
      'temperature=-15..0',
      'windSpeed<15',
      'cloudCover=0-80',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=-5..-1',
      'windSpeed<10',
      'cloudCover=10-50',
      'visibility>10'
      // 'fresh_ice'
    ],
    seasonalMonths: [12, 1, 2],
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
    poorConditions: [
      'temperature>2',               // slushy, wet snow
      'temperature<-20',            // extreme cold
      'windSpeed>30',               // uncomfortable & unsafe
      'precipitation>5',            // heavy snowfall
      'visibility<2',               // whiteout
      'ice_conditions=true'         // refrozen snow, slippery
    ],
    goodConditions: [
      'temperature=-15..-1',
      'windSpeed<15',
      'cloudCover=10-80',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=-8..-3',
      'windSpeed<8',
      'cloudCover=20-50',
      'visibility>10'
    ],
    seasonalMonths: [12, 1, 2, 3],
    indoorAlternative: 'Train on a ski erg or rollerskis, or focus on strength & flexibility exercises'
},
  {
    id: 'canoeing',
    name: 'Canoeing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport', 'water', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'temperature<8',                // chilly & unpleasant
      'temperature>30',              // heat stress
      'windSpeed>20',                // open canoes catch wind easily
      'waveHeight>0.6',              // too rough for flatwater
      'precipitation>10',            // heavy rain, miserable
      'visibility<2'                 // fog, unsafe
    ],
    goodConditions: [
      'temperature=12..25',
      'windSpeed<12',
      'waveHeight<0.4',
      'cloudCover=10-80',
      'precipitation=0..2',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=16..22',
      'windSpeed<8',
      'waveHeight<0.2',
      'cloudCover=20-50',
      'precipitation=0',
      'visibility>10'
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
    poorConditions: [
      'temperature<10',                // too chilly to sit comfortably
      'temperature>30',               // too hot & unpleasant
      'windSpeed>20',                 // blows everything around
      'precipitation>1',              // rain ruins picnic
      'humidity>85',                  // sticky & unpleasant
      'visibility<2'                  // foggy, damp
    ],
    goodConditions: [
      'temperature=15..26',
      'windSpeed<12',
      'cloudCover=10-70',
      'humidity<75',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=18..23',
      'windSpeed<8',
      'cloudCover=20-50',
      'humidity=40-60',
      'visibility>10'
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
    poorConditions: [
      'temperature<12',                // too cold for comfort
      'temperature>35',              // oppressive heat
      'windSpeed>25',                // hard to keep grill lit & unpleasant
      'precipitation>10',            // heavy rain makes it miserable
      'visibility<2'                 // foggy, damp
    ],
    goodConditions: [
      'temperature=14..30',
      'windSpeed<20',
      'cloudCover=0-80',
      'humidity<85',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=20..26',
      'windSpeed<10',
      'cloudCover=10-50',
      'humidity=40-65',
      'visibility>10'
    ],
    seasonalMonths: [4, 5, 6, 7, 8, 9],
    indoorAlternative: 'Grill indoors or host a casual dinner party with BBQ flavours'
},
{
    id: 'beach',
    name: 'Go To The Beach',
    category: 'Outdoor Leisure',
    secondaryCategory: 'Social Activities',
    weatherSensitive: true,
    tags: ['leisure', 'social', 'outdoors', 'food', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'temperature<15',                // too cold for comfort
      'temperature>39',              // oppressive heat
      'windSpeed>18',                // hard to keep grill lit & unpleasant
      'cloudCover>60',               // too cloudy for sunbathing
      'precipitation>1',            // heavy rain makes it miserable
      'visibility<2'                 // foggy, damp
      
    ],
    goodConditions: [
      'temperature=16..30',
      'windSpeed<12',
      'cloudCover=10-40',
      'humidity<85',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=20..26',
      'windSpeed<10',
      'cloudCover=0-10',
      'humidity=40-65',
      'visibility>10'
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
    tags: ['outdoors', 'adventure', 'hiking', 'game', 'social', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'temperature<0',                // freezing, uncomfortable
      'temperature>32',              // heat exhaustion risk
      'windSpeed>30',                // unsafe in wooded areas
      'precipitation>10',            // heavy rain
      'visibility<2'                 // fog, unsafe
    ],
    goodConditions: [
      'temperature=8..26',
      'windSpeed<20',
      'cloudCover=0-80',
      'precipitation=0..2',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<10',
      'cloudCover=10-50',
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
      'temperature<0',                // freezing, unpleasant
      'temperature>30',              // uncomfortable, heat stress
      'windSpeed>40',                // gales, unsafe
      'precipitation>15',            // heavy rain
      'visibility<2'                 // foggy, risky
    ],
    goodConditions: [
      'temperature=5..20',
      'windSpeed=10..25',
      'cloudCover=50-100',
      'precipitation=0..5',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=8..15',
      'windSpeed=12..20',
      'cloudCover=70-90',
      'precipitation=0..2',
      'visibility>10'
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
      'temperature<0',                // freezing, hypothermia risk
      'temperature>30',              // heat & sunstroke
      'windSpeed>30',                // unsafe seas
      'waveHeight>2',                // too rough
      'precipitation>10',            // soaking & slippery
      'visibility<2'                 // fog
    ],
    goodConditions: [
      'temperature=8..22',
      'windSpeed<20',
      'waveHeight<1',
      'cloudCover=50-100',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<12',
      'waveHeight<0.5',
      'cloudCover=60-80',
      'visibility>10'
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
    tags: ['nature', 'food', 'outdoors', 'walking', 'seasonal', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<0',                // frost & snow limit plants
      'temperature>30',              // heat stress & dry plants
      'windSpeed>20',                // risky & unpleasant
      'precipitation>10',            // soaking rain
      'visibility<2'                 // foggy, hard to find & unsafe
    ],
    goodConditions: [
      'temperature=8..22',
      'windSpeed<12',
      'cloudCover=10-90',
      'precipitation=0..2',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<8',
      'cloudCover=30-70',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    indoorAlternative: 'Study a foraging book, dry or preserve your finds, or plan your next seasonal outing'
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
      'temperature>30',              // heat exhaustion, sweaty grip
      'windSpeed>20',                // throws arrows off target
      'precipitation>5',             // soaking rain
      'visibility<2'                 // fog, unsafe
    ],
    goodConditions: [
      'temperature=10..25',
      'windSpeed<12',
      'cloudCover=0-80',
      'precipitation=0..2',
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<5',
      'cloudCover=20-50',
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
    goodConditions: [
      'temperature=10..22',
      'windSpeed<10',
      'cloudCover=10-60',
      'visibility>5'
      // 'low_tide'
    ],
    perfectConditions: [
      'temperature=15..20',
      'windSpeed<5',
      'cloudCover=20-50',
      'visibility>10'
      // 'low_tide & dry_rocks'
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
    'waterTemperature>30',          // stifling, algae risk
    'windSpeed>20',                 // choppy & unsafe
    'waveHeight>1',                 // hard to breathe & see
    'precipitation>10',             // poor visibility, unpleasant
    'visibility<2'                  // foggy, unsafe
  ],
  goodConditions: [
    'waterTemperature=18..28',
    'windSpeed<12',
    'waveHeight<0.5',
    'cloudCover=0-60',
    'visibility>5'
  ],
  perfectConditions: [
    'waterTemperature=22..26',
    'windSpeed<6',
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
    'temperature>32',              // heat stress
    'windSpeed>20',                // very hard to control
    'waveHeight>1',                // unstable
    'precipitation>10',            // heavy rain, poor visibility
    'visibility<2'                 // fog, unsafe
  ],
  goodConditions: [
    'temperature=15..28',
    'windSpeed<10',
    'waveHeight<0.3',
    'cloudCover=0-50',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=20..26',
    'windSpeed<5',
    'waveHeight<0.1',
    'cloudCover=10-30',
    'visibility>10'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise balance & core strength, or research local waterways'
},
{
  id: 'wild_swimming',
  name: 'Wild Swimming',
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
    id: 'tennis_indoor',
    name: 'Tennis (Indoor)',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'racquet', 'indoor', 'social', 'leisure', 'Wednesday', 'Thursday', 'Saturday', 'Sunday', 'evening'],

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
    'windSpeed>30',                 // unpleasant
    'precipitation>10',             // soaking rain
    'visibility<2'                  // fog, unsafe
  ],
  goodConditions: [
    'temperature=5..25',
    'windSpeed<15',
    'cloudCover=0-90',
    'precipitation=0..3',
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
  goodConditions: [
    'temperature=8..18',
    'windSpeed<10',
    'cloudCover=10-90',
    'recentPrecipitation=5..20',   // fungi need dampness
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=10..15',
    'windSpeed<5',
    'cloudCover=20-60',
    'recentPrecipitation=10..15',
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
  tags: ['winter', 'snow', 'freestyle', 'powder', 'adventure','Friday', 'Saturday', 'Sunday'],
  poorConditions: [
    'temperature>2',                // snow too soft/slushy
    'temperature<-20',             // extreme cold
    'windSpeed>30',                // lifts may close
    'precipitation>10',            // whiteout
    'visibility<2',                // fog, dangerous
    // 'snow_surface=icy',         // specialist: icy surface
    // 'fresh_snow<2'              // specialist: no fresh snow
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
    'cloudCover=40-70',
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
    'temperature>32',               // stressful for bees & beekeeper
    'precipitation>2',             // bees stay inside
    'windSpeed>15',                // bees irritable & hard to control
    'cloudCover>80',               // bees defensive under dark skies
    'humidity>85'                  // damp, sticky, bees agitated
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
    id: 'trail_hunting',
    name: 'Trail Hunting',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
  weatherSensitive: true,
  tags: ['hunting', 'equestrian', 'tradition', 'social', 'nature', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'temperature<2',                // risk of ice, hard ground
    'temperature>25',              // too hot for horses & hounds
    'windSpeed>25',                // uncomfortable & dangerous
    'precipitation>10',           // heavy rain ruins ground
    'humidity>85',                // sticky & stressful
    'visibility<2'                // fog & poor sightlines
  ],
  goodConditions: [
    'temperature=7..20',
    'windSpeed<15',
    'cloudCover=20-80',
    'precipitation=0..2',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=10..16',
    'windSpeed<8',
    'cloudCover=30-60',
    'precipitation=0',
    'visibility>10'
  ],
  seasonalMonths: [10, 11, 12, 1, 2, 3],
  indoorAlternative: 'Clean and repair tack, exercise horses in arena, or plan routes and social events'
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
    'precipitation>10',           // heavy rain
    'visibility<2'                 // fog & disorienting
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
  name: 'Watch a Movie',
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
    name: 'Make Music',
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
    'precipitation>1',            // even drizzle can ruin wood
    'humidity>85',                // too damp
    'visibility<2'                 // fog, unsafe
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
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<2', 'temperature>30', 'visibility<2'],
    goodConditions: ['temperature=10..26', 'windSpeed<12', 'cloudCover=0-80', 'visibility>5'],
    perfectConditions: ['temperature=18..22', 'windSpeed<6', 'cloudCover=20-50', 'visibility>10'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Play online, at a café, or solve puzzles at home'
  },
{
  id: 'sailing',
  name: 'Sailing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'leisure', 'relaxation', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed<5',              // not enough wind to sail
    'windSpeed>25',             // too rough
    'precipitation>5',          // rain spoils enjoyment
    'temperature<12',           // chilly and uncomfortable
    'visibility<2'              // fog, unsafe
  ],
  goodConditions: [
    'windSpeed=8..20',          // steady wind
    'temperature=16..26',       // pleasant
    'visibility>5'              // safe visibility
  ],
  perfectConditions: [
    'windSpeed=10..15',         // comfortable & easy
    'temperature=18..24',       // perfect day
    'precipitation=0',          // dry
    'visibility>10'             // clear views
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Study charts, maintain gear, or plan your next trip'
},
{
  id: 'windsurfing',
  name: 'Windsurfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'skill', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed<6',
    'windSpeed>30',
    'precipitation>5',
    'temperature<12',
    'waterTemperature<14',
    'waveHeight>2'
  ],
  goodConditions: [
    'windSpeed=10..22',
    'temperature=16..26',
    'waterTemperature=15..22',
    'waveHeight<1.5'
  ],
  perfectConditions: [
    'windSpeed=14..18',
    'temperature=18..24',
    'waterTemperature>=16',
    'waveHeight=0.5..1',
    'precipitation=0'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  indoorAlternative: 'Practise balance, study technique videos, or maintain your gear'
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
    'precipitation>3',            // Reduces visibility, unpleasant
    'temperature<14',             // Cold & uncomfortable
    'waterTemperature<15',        // Risk of cold shock
    'waveHeight>2'                // Too rough for learning
  ],
  goodConditions: [
    'windSpeed=7..12',            // Steady & safe
    'temperature=16..28',
    'waterTemperature=16..22',
    'waveHeight<1.5'
  ],
  perfectConditions: [
    'windSpeed=8..11',            // “Goldilocks” for control
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
    // Add 'current>strong' if you have current strength in data
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
    // Optionally: add 'clouds<=25' for sunny days, if you want!
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10] // Late spring to early autumn in temperate zones
},
{
  id: 'jetskiing',
  name: 'Jetskiing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'motor', 'adventure', 'power', 'Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'windSpeed>15',             // Too rough, choppy, or risky for control (above ~29 knots)
    'windSpeed<2',              // No wind can mean fog/calm but usually safe
    'waveHeight>2',             // Large waves are dangerous
    'waterTemperature<13',      // Cold water increases risk
    'precipitation>6',          // Heavy rain -> poor visibility, safety risk
    'temperature<12',           // Air too cold for comfort (hypothermia risk if splashed)
    // Optionally add gustiness or very low tide/obstruction logic if you track those
  ],
  goodConditions: [
    'windSpeed=2..10',          // Light to moderate breeze
    'temperature=16..30',
    'waveHeight=0.2..1.2',      // Small chop is fun, doesn't throw off balance
    'waterTemperature=14..24',
    'precipitation=0..3'
  ],
  perfectConditions: [
    'windSpeed=3..7',           // Just enough breeze for cooling, not choppy (~6–13 knots)
    'temperature=18..28',
    'waveHeight=0.2..0.8',      // Light chop or flat, stable riding
    'waterTemperature>=16',
    'precipitation=0'           // No rain
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10], // Late spring to early autumn
},

{
  id: 'cricket',
  name: 'Cricket',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'bat-and-ball','Saturday', 'Sunday', 'holiday'],
  poorConditions: [
    'precipitation>1',       // light drizzle tolerated
    'windSpeed>25',          // too gusty
    'temperature<8',         // uncomfortably cold
    'temperature>35',        // oppressive heat
    'visibility<2'           // bad light
  ],
  goodConditions: [
    'temperature=12..30',    // broader than perfect
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
  seasonalMonths: [5, 6, 7, 8, 9]
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
    goodConditions: [
      'temperature=5..28',    // tolerable range for most
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
    poorConditions: ['clouds>50', 'precipitation>0', 'windSpeed>20', 'temperature<-5'],
    goodConditions: ['temperature=5..15', 'clouds<=20', 'windSpeed<10'],
    perfectConditions: ['temperature=8..12', 'clouds=0', 'windSpeed<5'],
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
    'temperature>32',             // oppressive heat
    'windSpeed>20',               // gusty, unstable
    'precipitation>0',            // wet surface, unsafe
    'visibility<2'                // fog, unsafe
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
      'temperature>32',            // too hot & uncomfortable
      'windSpeed>20',              // frisbee control very poor
      'precipitation>2',           // wet & slippery
      'visibility<2'               // foggy, unsafe
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
  indoorAlternative: 'Practise throws indoors or play a tabletop game with friends',
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
    'windSpeed>20',              // gusts make balance difficult
    'temperature<8',             // too cold for comfort
    'temperature>30',            // oppressive heat
    'humidity>85',               // muggy & sticky
    'visibility<2'               // foggy, gloomy
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
    'windSpeed>25',              // strong wind
    'temperature<2',             // too cold
    'temperature>35',            // too hot
    'visibility<2'               // foggy, unsafe
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
  poorConditions: [
    'temperature<5',               // cold, stiff joints
    'temperature>32',             // heat stress
    'windSpeed>20',               // gusty, unstable
    'precipitation>0',            // wet surface, dangerous
    'visibility<2'                // fog, unsafe
  ],
  goodConditions: [
    'temperature=10..28',         // comfortable
    'windSpeed<15',
    'cloudCover=0-80',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..24',         // ideal comfort
    'windSpeed<8',
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
  poorConditions: [
    'precipitation>0',            // rain spoils paper, canvas, paint
    'windSpeed>20',              // blows over easel & supplies
    'temperature<5',             // too cold for hands & comfort
    'temperature>30',            // uncomfortable & damaging to paints
    'humidity>85',               // damp & sticky, paper curls
    'visibility<2'               // fog or very poor light
  ],
  goodConditions: [
    'temperature=12..26',        // pleasant range
    'windSpeed<12',              // calm to light breeze
    'cloudCover=10-80',          // even overcast is fine
    'humidity<75',               // workable
    'visibility>5'               // decent light
  ],
  perfectConditions: [
    'temperature=18..22',        // ideal comfort
    'windSpeed<6',               // very calm
    'cloudCover=20-50',          // some sun for highlights
    'humidity=50-65',            // comfortable
    'visibility>10'              // clear & bright
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
    tags: ['leisure', 'outdoor', 'animal', 'pet', 'exercise', 'social', 'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    // Dog owners walk in all but the worst weather — goodConditions reflect what is acceptable, not just pleasant.
    goodConditions: [
      'temperature=0..30',             // tolerable range even if not ideal
      'windSpeed<20',                  // manageable for leash control
      'precipitation=0..5',            // light rain acceptable
      'visibility>2'                   // safe to see surroundings
    ],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11]
  },
  {
    id: 'outdoor_reading',
    name: 'Reading in the Park',
    category: 'Outdoor Activities',
    secondaryCategory: 'Literature',
    weatherSensitive: true,
       tags: ['leisure', 'outdoor', 'relaxation', 'mindfulness', 'quiet', 'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    poorConditions: [
      'precipitation>0',            // rain ruins book & comfort
      'windSpeed>20',              // pages blow, unpleasant
      'temperature<8',             // too chilly to sit still
      'temperature>30',            // too hot for comfort
      'humidity>85',               // muggy & sticky
      'visibility<2'               // gloomy or foggy
    ],
    goodConditions: [
      'temperature=12..26',        // comfortable range
      'windSpeed<12',              // light breeze ok
      'cloudCover=10-80',          // even overcast is fine
      'humidity<75',               // not too muggy
      'visibility>5'
    ],
    perfectConditions: [
      'temperature=18..22',        // ideal comfort
      'windSpeed<6',               // very calm
      'cloudCover=20-50',          // some sun for light
      'humidity=50-65',            // pleasant
      'visibility>10'
    ],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Curl up with your book at home or in a cosy café',
  },
  {
    id: 'outdoor_meditation',
    name: 'Outdoor Meditation',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: true,
    tags: ['outdoor', 'mindfulness', 'relaxation', 'wellbeing', 'nature', 'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'outdoor_playground',
    name: 'Playground Time',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'outdoor', 'family', 'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
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
  goodConditions: [
    'temperature=5..25',      // acceptable for most
    'windSpeed<20',
    'precipitation=0..5'
  ],
  perfectConditions: [
    'temperature=12..18',     // mild & comfortable
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
  goodConditions: [
    'temperature=10..30',    // wide range tolerated
    'windSpeed<20',
    'precipitation=0..5',    // light drizzle tolerated
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..24',    // ideal comfort
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
    'windSpeed>30',              // dangerously gusty
    'temperature<2',             // freezing, hard ground
    'visibility<2'               // fog, unsafe
  ],
  goodConditions: [
    'temperature=7..20',         // broad acceptable range
    'windSpeed<20',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=12..18',        // mild & ideal
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
    'windSpeed>30',              // dangerously gusty
    'temperature<2',             // freezing, hard ground
    'visibility<2'               // fog, unsafe
  ],
  goodConditions: [
    'temperature=7..20',         // broad acceptable range
    'windSpeed<20',
    'precipitation=0..5',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=12..18',        // mild & ideal
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
    'windSpeed>25',              // strong gusts disrupt play
    'temperature<8',             // uncomfortably cold
    'temperature>32'             // heat exhaustion risk
  ],
  goodConditions: [
    'temperature=10..28',        // broad playable range
    'windSpeed<20',
    'precipitation=0..2'         // light drizzle tolerated
  ],
  perfectConditions: [
    'temperature=18..22',        // mild & comfortable
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
    'windSpeed>15',              // ball too light for control
    'temperature<8',             // uncomfortably cold
    'temperature>32'             // heat exhaustion risk
  ],
  goodConditions: [
    'temperature=10..28',        // broad acceptable range
    'windSpeed<12',
    'precipitation=0'            // dry court
  ],
  perfectConditions: [
    'temperature=18..22',        // mild & pleasant
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
    'windSpeed>20',             // disruptive to passing
    'temperature<5',            // uncomfortably cold
    'temperature>30',           // heat stress risk
    'visibility<2'              // fog or very poor light
  ],
  goodConditions: [
    'temperature=10..28',       // broad acceptable range
    'windSpeed<15',
    'precipitation=0..2',
    'visibility>5'
  ],
  perfectConditions: [
    'temperature=18..22',       // mild & comfortable
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
    id: 'cafe',
    name: 'Visiting a Café',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'relaxation', 'leisure', 'home', 'Saturday', 'Sunday', 'evening', 'family']
  },
];