import type { ActivityType } from './types';

export const wellnessSports: ActivityType[] = [
  {
    id: 'running',
    name: 'Go Running',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport','cardio','exercise','Monday','Tuesday','Wednesday','Thursday','Saturday','Sunday'],
    perfectConditions: ['temperature=10..13','windSpeed<5','clouds=20..60','visibility>10','precipitation=0',
      'gust<9.4'],
    goodConditions: ['temperature=5..20','windSpeed<9','clouds=0..100','humidity<80','visibility>2','precipitation=0',
      'gust<13.6'],
    fairConditions: ['temperature=0..5 or 20..25','windSpeed=9..13','humidity<=90','precipitation<=4','visibility>=1',
      'gust=13.6..17'],
    poorConditions: ['temperature<0 or temperature>25','windSpeed>13','precipitation>4','humidity>90','visibility<1','snowfallRateMmH>1','snowDepthCm>3',
      'gust>17']
  },
  
  {
    id: 'cycling',
    name: 'Go Cycling',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport','cycling','cardio','group','solo','Saturday','Sunday','Wednesday'],
    perfectConditions: ['temperature=18..24','windSpeed<5','clouds=10..50','precipitation=0','visibility>10',
      'gust<9.4'],
    goodConditions: ['temperature=14..28','windSpeed<9','clouds=0..80','humidity<75','precipitation=0..1','visibility>5',
      'gust<13.6'],
    fairConditions: ['temperature=8..14 or 28..30','windSpeed=9..13','humidity=75..85','precipitation=1..2','visibility=2..5',
      'gust=13.6..17'],
    poorConditions: ['temperature<8 or temperature>30','windSpeed>13','precipitation>2','humidity>85','visibility<2','snowfallRateMmH>1','snowDepthCm>2',
      'gust>17']
  },
  {
    id: 'boxing',
    name: 'Do Some Boxing',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
  
  {
    id: 'gym_workout',
    name: 'Hit the Gym',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
  {
    id: 'martial_arts',
    name: 'Do Martial Arts',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['relaxation', 'discipline', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  {
    id: 'meditation',
    name: 'Meditate',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['relaxation', 'wellness', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care'],
  },
  {
    id: 'outdoor_gym',
    name: 'Hit the Outdoor Gym',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: true,
    tags: ['exercise', 'outdoor', 'fitness', 'social', 'accessible', 'Saturday', 'Sunday', 'holiday'],

    poorConditions: [
      'precipitation>5',           // heavy rain makes it unpleasant
      'windSpeed>12',              // strong wind, especially risky for elderly
      'temperature<2',             // too cold, risk of stiffness or slips
      'temperature>35',            // excessive heat, unsafe for older users
      'visibility<2',              // foggy, unsafe
      'snowfallRateMmH>0.5',       // snow turns equipment slick
      'snowDepthCm>1',              // settled snow hides trip hazards
      'gust>16'
    ],

    fairConditions: [
      'temperature=2..8 or temperature=28..35', // cool or warm but manageable
      'windSpeed=8..12',                       // breezy but not unsafe
      'cloudCover=80..100',                      // overcast or dull light
      'humidity=80..90',                        // muggy but tolerable
      'visibility=2..5',                         // hazy conditions
      'gust=12.8..16'
    ],

    goodConditions: [
      'temperature=8..28',         // broad acceptable range
      'windSpeed<8',
      'cloudCover=0..80',
      'humidity<80',
      'visibility>5',
      'precipitation=0',
      'gust<12.8'
    ],

    perfectConditions: [
      'temperature=15..22',        // mild & comfortable
      'windSpeed<4',
      'cloudCover=20..50',
      'visibility>10',
      'precipitation=0',
      'gust<8.8'
    ],
    indoorAlternative: 'Head to an indoor gym or do a bodyweight workout at home'
  },
  {
    id: 'outdoor_meditation',
    name: 'Meditate Outdoors',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: true,
    tags: [
      'outdoor', 'mindfulness', 'relaxation', 'wellbeing', 'nature',
      'Saturday', 'Sunday', 'holiday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
    ],

    poorConditions: [
      'precipitation>1',         // wet conditions ruin stillness
      'windSpeed>12',            // increased from 20 - strong gusts are distracting, but moderate wind is fine
      'temperature<2',           // reduced from 5 - mildly cool is manageable with proper clothing
      'temperature>32',          // increased from 30 - hot but not dangerous
      'snowfallRateMmH>0.5',     // active snow breaks focus and soaks mats
      'snowDepthCm>1',            // even shallow snow makes sitting grounds unusable
      'gust>16'
    ],

    fairConditions: [
      'temperature=2..12 or 28..32',   // wider acceptable range
      'windSpeed=8..12',             // moved threshold up
      'cloudCover=80..100',            // dull, but not oppressive
      'humidity=85..95',              // moved humidity threshold up - 84% should be fine
      'visibility=2..5',               // hazy or misty, calming to some
      'precipitation=0.1..1',               // drizzle, not rain
      'gust=12.8..16'
    ],

    goodConditions: [
      'temperature=12..28',           // extended pleasant range
      'windSpeed<8',                 // increased from 15 - light breeze can be pleasant
      'humidity<85',                   // added humidity condition for good weather
      'cloudCover=0..80',              // clear to partly cloudy
      'visibility>5',                 // clear enough to see surroundings
      'precipitation=0..0.1',               // a trace at most
      'gust<12.8'
    ],

    perfectConditions: [
      'temperature=18..24',           // slightly wider ideal balance
      'windSpeed<4',
      'humidity<80',                   // perfect conditions have low humidity
      'cloudCover=20..50',             // some sun for warmth
      'visibility>10',                 // clear and bright
      'precipitation=0',                // no Rain
      'gust<8.8'
    ],
  },
  {
    id: 'outdoor_yoga',
    name: 'Do Yoga in the Park',
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
      'precipitation>1',            // rain makes it wet and unsafe
      'windSpeed>8',               // increased from 20 - strong gusts make balance difficult
      'temperature<5',              // increased tolerance from 8
      'temperature>32',             // increased from 30 - oppressive heat
      'humidity>90',                // increased from 85 - really muggy & sticky
      'visibility<2',               // foggy, gloomy
      'snowfallRateMmH>0.5',        // snow adds slip risk on mats
      'snowDepthCm>1',               // packed snow uneven underfoot
      'gust>11'
    ],

    fairConditions: [
      'precipitation=0.1..1',

      'temperature=5..10 or temperature=28..32', // wider range
      'windSpeed=5.5..8',                        // adjusted range
      'humidity=85..90',                         // narrower range - move 84% to good
      'cloudCover=70..100',                       // dull or overcast
      'visibility=2..5',                          // hazy conditions
      'gust=8.8..11'
    ],

    goodConditions: [
      'temperature=10..28',         // extended range to include 22°C comfortably
      'windSpeed<5.5',              // increased from 12 to include 9km/h comfortably  
      'cloudCover=0..70',
      'humidity<85',               // 84% humidity should now be good!
      'visibility>5',
      'precipitation=0..0.1',
      'gust<8.8'
    ],

    perfectConditions: [
      'temperature=18..22',
      'windSpeed<3',
      'cloudCover=20..50',
      'visibility>10',
      'precipitation=0',
      'gust<6.1'
    ],
    indoorAlternative: 'Practise at home with a video, visit a studio, or do a short meditation session'
  },
  {
    id: 'pilates',
    name: 'Do Pilates',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['wellness', 'relaxation', 'mindfulness', 'self-care', 'Sunday', 'Monday', 'Wednesday', 'evening'],
  },
  {
    id: 'spinning',
    name: 'Do a Spin Class',
    category: 'Fitness & Wellness',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'cycling', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
    {
    id: 'tai_chi',
    name: 'Do Tai Chi',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['relaxation', 'wellness', 'mindfulness', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'self-care']
  },
  {
    id: 'yoga',
    name: 'Do Yoga',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: false,
    tags: ['wellness', 'relaxation', 'mindfulness', 'self-care', 'Sunday', 'Monday', 'Wednesday', 'evening'],
  },
  {
    id: 'zumba',
    name: 'Do Zumba',
    category: 'Fitness & Wellness',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'dance', 'health', 'evening', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'self-care'],
  },
];

export default wellnessSports;
