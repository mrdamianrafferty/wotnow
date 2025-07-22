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
    tags: ['sport', 'cardio', 'exercise'],
    poorConditions: [
      'temperature<0',
      'temperature>30',
      'windSpeed>15',
      'precipitation>2',
      'humidity>85',
    ],
    goodConditions: [
      'temperature=10..20',
      'windSpeed<8',
      'clouds=20-80',
      'humidity<65',
    ],
    perfectConditions: [
      'temperature=10..15',
      'windSpeed<5',
      'clouds=20-100',
      'humidity=45-55',
      'visibility>10',
      'precipitation=0'
    ],
  },
  {
    id: 'trail_running',
    name: 'Trail Running',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Cardio & Running',
    weatherSensitive: true,
    tags: ['sport', 'trail', 'nature'],
    poorConditions: [
      'temperature<0',
      'temperature>25',
      'windSpeed>15',
      'precipitation>2',
      'visibility<5',
    ],
    goodConditions: [
      'temperature=7..18',
      'windSpeed<8',
      'clouds=0-50',
      // 'dry_conditions',
    ],
    perfectConditions: [
      'temperature=10..15',
      'windSpeed<5',
      // 'clear_sky',
      'visibility>10',
      'humidity<50',
    ],
  },
  {
    id: 'road_cycling',
    name: 'Road Cycling',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'cardio'],
    poorConditions: [
      'temperature<5',
      'temperature>28',
      'precipitation>1',
      'visibility<5',
    ],
    goodConditions: [
      'temperature=15..27',
      'windSpeed<10',
      'clouds=0-50',
      'humidity<70',
    ],
    perfectConditions: [
      'temperature=18..24',
      'windSpeed<5',
      'clouds=0-50',
      'humidity=40-55',
    ],
  },
  {
    id: 'mountain_biking',
    name: 'Mountain Biking',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'trail'],
    poorConditions: [
      'temperature<0',
      'temperature>30',
      'windSpeed>20',
      'precipitation>3',
      // 'wet_trail',
    ],
    goodConditions: [
      'temperature=13..24',
      'windSpeed<12',
      'clouds=25-75',
      // 'dry_24h_ago',
    ],
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<8',
      // 'partly_cloudy',
      // 'dry_24h_ago',
      'visibility>10',
      'humidity<70',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'fly_fishing_freshwater',
    name: 'Fly Fishing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater', 'technique'],
    poorConditions: [
      // 'water_temp<7',
      // 'water_temp>18',
      'windSpeed>15',
      // 'bright_sun_wind<5',
      // 'thunderstorm',
      'precipitation>5',
    ],
    goodConditions: [
      // 'water_temp=7..18',
      'windSpeed<10',
      // 'overcast',
      // 'light_precipitation<1',
    ],
    perfectConditions: [
      // 'water_temp=12..16',
      'windSpeed<5',
      // 'overcast',
      // 'hatching_conditions',
    ],
    indoorAlternative: 'Tie some flies',
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
  },
  {
    id: 'outdoor_gardening',
    name: 'Gardening',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['hobby', 'relaxation'],
    poorConditions: [
      'temperature<0',
      'temperature>35',
      'windSpeed>20',
      'precipitation>10',
      // 'drought',
    ],
    goodConditions: [
      'temperature=15..27',
      'windSpeed<10',
      // 'light_precipitation',
      // 'overcast',
    ],
    perfectConditions: [
      'temperature=18..24',
      'windSpeed<5',
      // 'light_precipitation_yesterday',
      // 'soil_moist',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  },
  {
    id: 'surfing',
    name: 'Surfing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['water', 'waves'],
    poorConditions: [
      // 'water_temp<10',
      'windSpeed>20',
      'precipitation>10',
      // 'thunderstorm',
    ],
    goodConditions: [
      // 'water_temp>16',
      'windSpeed=5..15',
      // 'swell_height=1-2',
    ],
perfectConditions: [
  'waterTemperature>18',
  'waveHeight=0.7..2.0',
  'swellPeriod=10..18',
  'windSpeed=7..14',
],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'hiking',
    name: 'Hiking',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['nature', 'walking'],
    poorConditions: [
      'temperature<-5',
      'temperature>35',
      'windSpeed>25',
      'precipitation>10',
      'visibility<1',
    ],
    goodConditions: [
      'temperature=10..21',
      'windSpeed<15',
      'clouds=50-75',
      'humidity<70',
    ],
    perfectConditions: [
      'temperature=15..18',
      'windSpeed<10',
      // 'overcast',
      'humidity=40-60',
      'visibility>10',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'skiing',
    name: 'Skiing',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'snow'],
    poorConditions: [
      'temperature>2',
      'windSpeed>30',
      'precipitation>0',
      // 'poor_visibility<100',
      // 'ice_conditions',
    ],
    goodConditions: [
      'temperature=-7..2',
      'windSpeed<20',
      // 'fresh_snow',
      'clouds=25-75',
    ],
    perfectConditions: [
      'temperature=-4..0',
      'windSpeed<15',
      // 'powder_snow',
      // 'partly_cloudy',
      'visibility>5',
    ],
    seasonalMonths: [12, 1, 2],
  },
  {
    id: 'birdwatching',
    name: 'Birdwatching',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'wildlife', 'observation'],
    poorConditions: [
      'windSpeed>15',
      'precipitation>5',
      // 'thunderstorm',
      'visibility<5',
      'temperature<-10',
    ],
    goodConditions: [
      'temperature=7..24',
      'windSpeed<10',
      // 'clear_weather',
      // 'early_morning',
    ],
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<5',
      // 'clear_sky',
      // 'dawn_time',
      // 'post_storm_clearing',
    ],
  },
  {
    id: 'coarse_fishing',
    name: 'Coarse and Carp Fishing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['fishing', 'freshwater'],
    poorConditions: [
      'temperature<0',
      'temperature>35',
      'windSpeed>20',
      'precipitation>15',
      // 'thunderstorm',
    ],
    goodConditions: [
      'temperature=15..25',
      'windSpeed=5..15',
      // 'overcast',
      // 'stable_pressure',
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed=8..12',
      // 'overcast',
      // 'light_precipitation<2',
      // 'falling_pressure',
    ],
  },
  {
    id: 'football_soccer',
    name: 'Football (Soccer)',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team'],
    poorConditions: [
      'temperature<0',
      'temperature>35',
      'windSpeed>20',
      'precipitation>8',
      // 'pitch_waterlogged',
    ],
    goodConditions: [
      'temperature=18..24',
      'windSpeed<15',
      'clouds=50-75',
      // 'light_precipitation<2',
    ],
    perfectConditions: [
      'temperature=20..22',
      'windSpeed<10',
      // 'overcast',
      'humidity=50-60',
      // 'dry_pitch',
    ],
  },
{
  id: 'kayaking',
  name: 'Kayaking',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'paddling', 'adventure'],
  poorConditions: [
    'windSpeed>20',
    'waveHeight>1.5',     // New!
    'precipitation>10'
  ],
  goodConditions: [
    'windSpeed=0..15',
    'waveHeight<1.0',
    'waterTemperature=15..25'
  ],
  perfectConditions: [
    'windSpeed<8',
    'waveHeight<0.7',
    'waterTemperature=17..23'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
},
  {
    id: 'rock_climbing',
    name: 'Rock Climbing',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'adventure', 'strength'],
    poorConditions: [
      'precipitation>0',
      // 'wet_rocks',
      'temperature<5',
      'windSpeed>15',
    ],
    goodConditions: [
      'temperature=10..20',
      'windSpeed<10',
      'clouds=25-50',
    ],
    perfectConditions: [
      'temperature=15..18',
      'windSpeed<5',
      // 'clear_sky',
      // 'dry_rocks',
    ],
    indoorAlternative: 'Indoor Climbing',
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'golf',
    name: 'Golf',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'leisure'],
    poorConditions: [
      'precipitation>5',
      'windSpeed>20',
      'temperature<5',
      'temperature>30',
    ],
    goodConditions: [
      'temperature=15..25',
      'windSpeed<15',
      'clouds=10-50',
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed<10',
      // 'clear_sky',
      // 'dry_ground',
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'tennis',
    name: 'Tennis',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'racquet'],
    poorConditions: [
      'precipitation>0',
      'windSpeed>15',
      'temperature<10',
      'temperature>35',
    ],
    goodConditions: [
      'temperature=15..28',
      'windSpeed<10',
      'clouds=20-60',
    ],
    perfectConditions: [
      'temperature=20..25',
      'windSpeed<5',
      // 'clear_sky',
    ],
    indoorAlternative: 'Tennis (Indoor)',
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'beach_volleyball',
    name: 'Beach Volleyball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'beach'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<18', 'temperature>35'],
    goodConditions: ['temperature=20..30', 'windSpeed<15', /* 'clouds=10-50' */],
    perfectConditions: ['temperature=24..28', 'windSpeed<8', /* 'clear_sky' */],
    seasonalMonths: [6, 7, 8, 9],
  },
  {
    id: 'horse_riding',
    name: 'Horse Riding',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'animal', 'leisure'],
    poorConditions: ['precipitation>10', 'windSpeed>25', 'temperature<5'],
    goodConditions: ['temperature=10..25', 'windSpeed<15', /* 'clouds=20-60' */],
    perfectConditions: ['temperature=15..20', 'windSpeed<10', /* 'clear_sky' */],
  },
  {
    id: 'ice_skating',
    name: 'Ice Skating',
    category: 'Winter Sports',
    secondaryCategory: 'Ice Sports',
    weatherSensitive: true,
    tags: ['winter', 'sport'],
    poorConditions: ['temperature>2', 'precipitation>0', 'windSpeed>20'],
    goodConditions: ['temperature=-10..0', 'windSpeed<15', /* 'clear_sky' */],
    perfectConditions: ['temperature=-5..-1', 'windSpeed<10', /* 'clear_sky', */ /* 'fresh_ice' */],
    seasonalMonths: [12, 1, 2],
  },
    {
    id: 'curling',
    name: 'Curling',
    category: 'Winter Sports',
    secondaryCategory: 'Ice Sports',
    weatherSensitive: true,
    tags: ['winter', 'sport'],
    poorConditions: ['temperature>2', 'precipitation>0', 'windSpeed>20'],
    goodConditions: ['temperature=-10..0', 'windSpeed<15', /* 'clear_sky' */],
    perfectConditions: ['temperature=-5..-1', 'windSpeed<10', /* 'clear_sky', */ /* 'fresh_ice' */],
    seasonalMonths: [12, 1, 2],
  },
  {
    id: 'cross_country_skiing',
    name: 'Cross-Country Skiing',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'sport', 'endurance'],
    poorConditions: ['temperature>2', 'precipitation>0', 'windSpeed>25'],
    goodConditions: ['temperature=-10..0', 'windSpeed<20', /* 'fresh_snow' */],
    perfectConditions: ['temperature=-7..-2', 'windSpeed<10', /* 'powder_snow', */ /* 'clear_sky' */],
    seasonalMonths: [12, 1, 2],
  },
  {
    id: 'canoeing',
    name: 'Canoeing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['water', 'paddling', 'adventure'],
    poorConditions: ['windSpeed>20', 'precipitation>10', 'thunderstorm', /* 'high_waves' */],
    goodConditions: ['windSpeed<15', 'temperature=12..25', /* 'clouds=20-60' */],
    perfectConditions: ['windSpeed<10', 'temperature=18..22', /* 'clear_sky', */ /* 'calm_waters' */],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'picnicking',
    name: 'Picnicking',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'family', 'relaxation'],
    poorConditions: ['precipitation>0', 'windSpeed>15', 'temperature<10'],
    goodConditions: ['temperature=15..25', 'windSpeed<10', /* 'clouds=10-50' */],
    perfectConditions: ['temperature=18..22', 'windSpeed<5', /* 'clear_sky' */],
    seasonalMonths: [5, 6, 7, 8, 9],
  },
  {
    id: 'bbq',
    name: 'BBQ',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'family', 'relaxation'],
    poorConditions: ['precipitation>0', 'windSpeed>15', 'temperature<10'],
    goodConditions: ['temperature=15..25', 'windSpeed<10', /* 'clouds=10-50' */],
    perfectConditions: ['temperature=18..22', 'windSpeed<5', /* 'clear_sky' */],
    seasonalMonths: [5, 6, 7, 8, 9],
  },
  {
    id: 'geocaching',
    name: 'Geocaching',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['adventure', 'technology', 'walking'],
    poorConditions: ['precipitation>5', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..25', 'windSpeed<15', /* 'clouds=20-60' */],
    perfectConditions: ['temperature=15..20', 'windSpeed<10', /* 'clear_sky' */],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
{
  id: 'sea_fishing_shore',
  name: 'Shore Fishing',
  category: 'Outdoor Activities',
  secondaryCategory: 'Fishing',
  weatherSensitive: true,
  tags: ['fishing', 'sea', 'leisure'],
  poorConditions: [
    'windSpeed>25',
    'precipitation>15',
    'waveHeight>2.5'
  ],
  goodConditions: [
    'windSpeed=5..20',
    'waveHeight=0.3..1.5',
    'waterTemperature=13..20'
  ],
  perfectConditions: [
    'windSpeed<12',
    'waveHeight=0.5..1.0',
    'waterTemperature=15..19'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
},
  {
    id: 'sea_fishing_boat',
    name: 'Boat Fishing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['fishing', 'sea', 'leisure', 'boat'],
    poorConditions: ['windSpeed>15', 'precipitation>10', 'thunderstorm'],
    goodConditions: ['windSpeed=5..12', 'temperature=12..22'],
    perfectConditions: ['windSpeed<8', 'temperature=15..20'],
    seasonalMonths: [5, 6, 7, 8, 9],
  },
  {
    id: 'foraging',
    name: 'Foraging',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'food', 'hobby'],
    poorConditions: ['precipitation>10', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..20', 'windSpeed<15', /* 'clouds=20-60' */],
    perfectConditions: ['temperature=15..18', 'windSpeed<10', /* 'clear_sky', */ /* 'dry_ground' */],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'archery',
    name: 'Archery',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'precision'],
    poorConditions: ['windSpeed>15', 'precipitation>0', 'temperature<5'],
    goodConditions: ['temperature=15..25', 'windSpeed<10', /* 'clouds=10-50' */],
    perfectConditions: ['temperature=18..22', 'windSpeed<5', /* 'clear_sky' */],
  },
  {
    id: 'orienteering',
    name: 'Orienteering',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'navigation', 'adventure'],
    poorConditions: ['precipitation>10', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..20', 'windSpeed<15', /* 'clouds=20-60' */],
    perfectConditions: ['temperature=15..18', 'windSpeed<10', /* 'clear_sky' */],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'rock_hopping',
    name: 'Rock Hopping',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['adventure', 'walking', 'nature'],
    poorConditions: ['precipitation>0', /* 'wet_rocks', */ 'windSpeed>15'],
    goodConditions: ['temperature=10..22', 'windSpeed<10', /* 'clouds=20-60' */],
    perfectConditions: ['temperature=15..20', 'windSpeed<5', /* 'clear_sky', */ /* 'dry_rocks' */],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
{
  id: 'snorkeling',
  name: 'Snorkeling',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'swimming', 'adventure'],
  poorConditions: [
    'waterTemperature<17',
    'windSpeed>15',
    'waveHeight>1',
    'precipitation>5'
  ],
  goodConditions: [
    'waterTemperature=18..22',
    'windSpeed<10',
    'waveHeight<0.5'
  ],
  perfectConditions: [
    'waterTemperature=20..24',
    'windSpeed<6',
    'waveHeight<0.3'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
},

{
  id: 'stand_up_paddleboarding',
  name: 'Paddleboarding',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'paddling', 'balance'],
  poorConditions: [
    'windSpeed>15',
    'waveHeight>1.2',
    'precipitation>5'
  ],
  goodConditions: [
    'windSpeed<10',
    'waveHeight<0.6',
    'waterTemperature=18..25'
  ],
  perfectConditions: [
    'windSpeed<5',
    'waveHeight<0.3',
    'waterTemperature=20..24'
  ],
  seasonalMonths: [5, 6, 7, 8, 9, 10],
},
{
  id: 'swimming',
  name: 'Wild Swimming',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'exercise'],
  poorConditions: [
    'waterTemperature<16',   // Now enabled!
    'precipitation>5',
    'windSpeed>15'
  ],
  goodConditions: [
    'waterTemperature=17..22',
    'windSpeed<10'
  ],
  perfectConditions: [
    'waterTemperature=19..23',
    'windSpeed<5'
  ],
  indoorAlternative: 'Indoor Swimming',
  seasonalMonths: [5, 6, 7, 8, 9, 10],
},

  {
    id: 'tennis_indoor',
    name: 'Tennis (Indoor)',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport', 'racquet'],

  },
  {
    id: 'gym_workout',
    name: 'Gym Workout',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: false,
    tags: ['fitness', 'personal', 'health', 'evening', 'Monday', 'Wednesday', 'self-care'],
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
    tags: ['adventure', 'walking', 'culture'],
    poorConditions: ['precipitation>10', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..20', 'windSpeed<15', 'clouds=20-60'],
    perfectConditions: ['temperature=15..18', 'windSpeed<10', 'clear_sky'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'mushroom_hunting',
    name: 'Mushroom Hunting',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'food', 'hobby'],
    poorConditions: ['temperature<5', 'precipitation>15', 'windSpeed>20'],
    goodConditions: ['temperature=10..18', 'windSpeed<15', 'clouds=20-60'],
    perfectConditions: ['temperature=12..16', 'windSpeed<10', 'light_precipitation_yesterday', 'overcast'],
    seasonalMonths: [9, 10, 11],
  },
  {
    id: 'snowboarding',
    name: 'Snowboarding',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'sport', 'snow'],
    poorConditions: ['temperature>2', 'windSpeed>30', 'precipitation>0', 'poor_visibility<100', 'ice_conditions'],
    goodConditions: ['temperature=-7..2', 'windSpeed<20', 'fresh_snow', 'clouds=25-75'],
    perfectConditions: ['temperature=-4..0', 'windSpeed<15', 'powder_snow', 'partly_cloudy', 'visibility>5'],
    seasonalMonths: [12, 1, 2, 3],
  },
  {
    id: 'ice_fishing',
    name: 'Ice Fishing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Fishing',
    weatherSensitive: true,
    tags: ['winter', 'fishing', 'ice'],
    poorConditions: ['temperature>0', 'windSpeed>20', 'precipitation>0'],
    goodConditions: ['temperature=-10..0', 'windSpeed<15', 'stable_ice'],
    perfectConditions: ['temperature=-5..-2', 'windSpeed<10', 'clear_sky', 'fresh_ice'],
    seasonalMonths: [12, 1, 2],
  },
  {
    id: 'photography',
    name: 'Photography',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: true,
    tags: ['art', 'nature', 'hobby'],
    poorConditions: ['precipitation>10', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..20', 'windSpeed<15', 'clouds=20-60'],
    perfectConditions: ['temperature=15..18', 'windSpeed<10', 'golden_hour', 'clear_sky'],
    indoorAlternative: 'Photography (Indoor Studio)',
  },
  {
    id: 'beekeeping',
    name: 'Beekeeping',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['hobby', 'nature', 'agriculture'],
    poorConditions: ['temperature<10', 'precipitation>5', 'windSpeed>15'],
    goodConditions: ['temperature=15..30', 'windSpeed<10', 'clouds=10-50'],
    perfectConditions: ['temperature=18..25', 'windSpeed<5', 'clear_sky'],
    indoorAlternative: 'Beekeeping Workshop or Reading',
    seasonalMonths: [4, 5, 6, 7, 8, 9],
  },
  {
    id: 'trail_hunting',
    name: 'Trail Hunting',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['hunting', 'nature', 'adventure'],
    poorConditions: ['precipitation>10', 'windSpeed>20', 'temperature<5'],
    goodConditions: ['temperature=10..20', 'windSpeed<15', 'clouds=20-60'],
    perfectConditions: ['temperature=15..18', 'windSpeed<10', 'clear_sky'],
  },
  {
    id: 'camping',
    name: 'Camping',
    category: 'Outdoor Activities',
    secondaryCategory: 'N',
    weatherSensitive: true,
    tags: ['leisure', 'nature', 'adventure'],
    poorConditions: ['precipitation>20', 'windSpeed>25', 'temperature<5'],
    goodConditions: ['temperature=10..25', 'windSpeed<15', 'clouds=10-50'],
    perfectConditions: ['temperature=15..20', 'windSpeed<10', 'clear_sky', 'dry_ground'],
    seasonalMonths: [6, 7, 8, 9],
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
    tags: ['relaxation', 'family', 'home', 'leisure', 'Tuesday', 'Wednesday', 'Thursday', 'evening', 'cultural']
  },
  {
    id: 'painting',
    name: 'Painting',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: false,
    tags: ['art', 'creativity', 'relaxation', 'Sunday', 'Saturday', 'evening', 'home', 'solo'],
  },
  {
    id: 'diy',
    name: 'DIY',
    category: 'Indoor Recreation',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['craft', 'home', 'practical', 'Saturday', 'Sunday', 'evening', 'creative'],
  },
  {
    id: 'crafts',
    name: 'Crafts',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
   tags: ['relaxation', 'hobby', 'home', 'craft', 'Wednesday', 'Thursday', 'Sunday', 'evening', 'solo'],
  },
  {
    id: 'playing_records',
    name: 'Playing Records',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: false,
    tags: ['music', 'relaxation', 'leisure', 'solo', 'evening', 'Saturday', 'Friday', 'Sunday', 'home'],
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
    name: 'Busking',
    category: 'Creative & Arts',
    secondaryCategory: 'Music & Performance',
    weatherSensitive: true,
    tags: ['music', 'performance', 'outdoor'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<10'],
    goodConditions: ['temperature=15..25', 'windSpeed<10'],
    perfectConditions: ['temperature=18..22', 'windSpeed<5'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'outdoor_chess',
    name: 'Park Chess',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'strategy', 'outdoor'],
    poorConditions: ['precipitation>0', 'windSpeed>15', 'temperature<5'],
    goodConditions: ['temperature=15..25', 'windSpeed<10'],
    perfectConditions: ['temperature=18..22', 'windSpeed<5'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
  {
    id: 'sailing',
    name: 'Sailing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['water', 'wind', 'adventure'],
    poorConditions: ['windSpeed<5', 'windSpeed>25', 'precipitation>5', 'temperature<10'],
    goodConditions: ['windSpeed=10..20', 'temperature=15..25'],
    perfectConditions: ['windSpeed=12..18', 'temperature=18..22', 'precipitation=0'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
  },
{
  id: 'windsurfing',
  name: 'Windsurfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure'],
  poorConditions: [
    'windSpeed<8',              // Not enough wind
    'windSpeed>30',             // Too strong, dangerous
    'precipitation>5',          // Heavy rain, unpleasant
    'temperature<12',           // Too cold for comfort/safety
    'waveHeight>2',             // Dangerous for intermediates
    'waterTemperature<14'       // Risk of cold shock/hypothermia
  ],
  goodConditions: [
    'windSpeed=12..22',         // Planing and fun for most
    'temperature=16..26',
    'waterTemperature=15..22',
    'waveHeight<1.5'
  ],
  perfectConditions: [
    'windSpeed=15..20',         // Ideal power for most
    'temperature=18..24',
    'waterTemperature>=16',
    'waveHeight<1',             // Light to moderate safe chop
    'precipitation=0'
    // Optionally: add windDirection if available (e.g., side-shore)
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9, 10]   // Typical spring to autumn season
},

{
  id: 'kitesurfing',
  name: 'Kitesurfing',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'wind', 'adventure', 'extreme'],
  poorConditions: [
    'windSpeed<6',             // Not enough power for most kites/safety
    'windSpeed>15',            // (if in m/s; 15 m/s = ~29 knots, above safe limit for most)
    'precipitation>3',
    'temperature<12',
    'waterTemperature<14',     // Risk of cold shock/hypothermia
    'waveHeight>3'             // Dangerous, especially for less advanced kiters
    // Optionally: add gustiness/variability keys if available
  ],
  goodConditions: [
    'windSpeed=7..13',         // Steady, suitable for intermediate riders
    'temperature=16..28',
    'waterTemperature=16..22',
    'waveHeight<2'
  ],
  perfectConditions: [
    'windSpeed=8..12',         // “Goldilocks” for most kiters (in m/s: 16–24 knots)
    'temperature=20..26',
    'waterTemperature>=16',
    'waveHeight=0.5..1.5',
    'precipitation=0'
    // Add windDirection: side-shore or side-onshore, if modeled in your data
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10] // Spring to autumn/warm months
},
{
  id: 'scuba_diving',
  name: 'Scuba Diving',
  category: 'Active Sports',
  secondaryCategory: 'Water Sports',
  weatherSensitive: true,
  tags: ['water', 'exploration', 'adventure', 'underwater'],
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
  tags: ['water', 'motor', 'adventure', 'power'],
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
    tags: ['sport', 'team', 'bat-and-ball'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<10', 'temperature>35'],
    goodConditions: ['temperature=18..28', 'windSpeed<15'],
    perfectConditions: ['temperature=20..25', 'windSpeed<10'],
    seasonalMonths: [5, 6, 7, 8, 9]
  },
  {
    id: 'rugby',
    name: 'Rugby',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'contact'],
    poorConditions: ['precipitation>15', 'windSpeed>25', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=10..20', 'windSpeed<15'],
    perfectConditions: ['temperature=12..18', 'windSpeed<10'],
    seasonalMonths: [9, 10, 11, 12, 1, 2, 3]
  },
  {
    id: 'stargazing',
    name: 'Stargazing',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['night', 'sky', 'astronomy'],
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
    tags: ['exercise', 'sport', 'team', 'outdoor'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'skateboarding',
    name: 'Skateboarding',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['exercise', 'outdoor', 'leisure'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'frisbee',
    name: 'Frisbee',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'outdoor', 'exercise'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'outdoor_yoga',
    name: 'Yoga in the Park',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: true,
    tags: ['exercise', 'outdoor', 'mindfulness'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'outdoor_gym',
    name: 'Outdoor Gym',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Strength & Gym',
    weatherSensitive: true,
    tags: ['exercise', 'outdoor', 'fitness'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'rollerblading',
    name: 'Rollerblading',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['exercise', 'outdoor', 'leisure'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'outdoor_painting',
    name: 'Painting Outdoors',
    category: 'Creative & Arts',
    secondaryCategory: 'Visual Arts',
    weatherSensitive: true,
    tags: ['art', 'outdoor', 'relaxation'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'dog_walking',
    name: 'Walking the Dog',
    category: 'Outdoor Activities',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['leisure', 'outdoor', 'animal'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11]
  },
  {
    id: 'outdoor_reading',
    name: 'Reading in the Park',
    category: 'Outdoor Activities',
    secondaryCategory: 'Literature',
    weatherSensitive: true,
    tags: ['leisure', 'outdoor', 'relaxation'],
    poorConditions: ['precipitation>0', 'windSpeed>20', 'temperature<5', 'temperature>30'],
    goodConditions: ['temperature=15..25', 'windSpeed<15'],
    perfectConditions: ['temperature=18..22', 'windSpeed<10'],
    seasonalMonths: [4, 5, 6, 7, 8, 9, 10]
  },
  {
    id: 'outdoor_meditation',
    name: 'Outdoor Meditation',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Mindfulness',
    weatherSensitive: true,
    tags: ['outdoor', 'mindfulness', 'relaxation'],
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
    tags: ['leisure', 'outdoor', 'family'],
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
  tags: ['sport', 'team', 'football'],
  poorConditions: [
    'precipitation>10',
    'windSpeed>25',
    'temperature<0'
  ],
  goodConditions: [
    'temperature=10..20',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=15..18',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [8, 9, 10, 11, 12]
},

{
  id: 'baseball',
  name: 'Baseball',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'bat-and-ball'],
  poorConditions: [
    'precipitation>5',
    'windSpeed>20',
    'temperature<5'
  ],
  goodConditions: [
    'temperature=15..25',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [4, 5, 6, 7, 8, 9]
},

{
  id: 'ice_hockey_us',
  name: 'Ice Hockey (US)',
  category: 'Winter Sports',
  secondaryCategory: 'Ice Sports',
  weatherSensitive: true,
  tags: ['winter', 'sport', 'ice'],
  poorConditions: [
    'temperature>2',
    'precipitation>0',
    'windSpeed>20'
  ],
  goodConditions: [
    'temperature=-10..0',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=-5..-1',
    'windSpeed<10'
  ],
  seasonalMonths: [10, 11, 12, 1, 2, 3]
},

{
  id: 'hurling_camogie',
  name: 'Hurling & Camogie',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'irish'],
  poorConditions: [
    'precipitation>10',
    'windSpeed>25',
    'temperature<5'
  ],
  goodConditions: [
    'temperature=10..20',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=15..18',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9]
},

{
  id: 'gaelic_football',
  name: 'Gaelic Football',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'irish'],
  poorConditions: [
    'precipitation>10',
    'windSpeed>25',
    'temperature<5'
  ],
  goodConditions: [
    'temperature=10..20',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=15..18',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9]
},

{
  id: 'hockey',
  name: 'Hockey',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team', 'field'],
  poorConditions: [
    'precipitation>10',
    'windSpeed>25',
    'temperature<0'
  ],
  goodConditions: [
    'temperature=10..20',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=15..18',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [9, 10, 11, 12, 1, 2, 3]
},

{
  id: 'padel',
  name: 'Padel',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'racquet'],
  poorConditions: [
    'precipitation>0',
    'windSpeed>20',
    'temperature<10'
  ],
  goodConditions: [
    'temperature=15..25',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},

{
  id: 'pickleball',
  name: 'Pickleball',
  category: 'Active Sports',
  secondaryCategory: 'Individual Sports',
  weatherSensitive: true,
  tags: ['sport', 'racquet'],
  poorConditions: [
    'precipitation>0',
    'windSpeed>20',
    'temperature<10'
  ],
  goodConditions: [
    'temperature=15..25',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},

{
  id: 'netball',
  name: 'Netball',
  category: 'Active Sports',
  secondaryCategory: 'Team Sports',
  weatherSensitive: true,
  tags: ['sport', 'team'],
  poorConditions: [
    'precipitation>5',
    'windSpeed>20',
    'temperature<5'
  ],
  goodConditions: [
    'temperature=15..25',
    'windSpeed<15'
  ],
  perfectConditions: [
    'temperature=18..22',
    'windSpeed<10',
    'precipitation=0'
  ],
  seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10]
},
  {
    id: 'cooking',
    name: 'Cooking',
    category: 'Creative & Arts',
    secondaryCategory: 'Home Activities',
    weatherSensitive: false,
    tags: ['creativity', 'relaxation', 'home', 'family', 'Saturday', 'Sunday', 'evening'],
  },
    {
    id: 'cinema',
    name: 'Cinema',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'leisure', 'Friday', 'Saturday', 'Sunday', 'evening', 'social'],
  },
    {
    id: 'shopping',
    name: 'Shopping',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['leisure', 'social', 'Sunday', 'family', 'Saturday', 'Friday',],
  },
      {
    id: 'museum',
    name: 'Museum',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'Saturday', 'Sunday', 'evening'],
  },
        {
    id: 'cafe',
    name: 'Visiting a Café',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'relaxation', 'leisure', 'home', 'Saturday', 'Sunday', 'evening', 'family'],
  },
];