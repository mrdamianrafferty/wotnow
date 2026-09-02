import type { ActivityType } from './types';

export const socialActivities: ActivityType[] = [
  {
    id: 'picnicking',
    name: 'Have a Picnic',
    category: 'Outdoor Leisure',
    secondaryCategory: 'Social Activities',
    weatherSensitive: true,
    tags: ['leisure', 'social', 'outdoors', 'nature', 'Saturday', 'Sunday', 'holiday'],

    perfectConditions: [
      'temperature=18..25',
      'windSpeed<3',
      'cloudCover=20..50',
      'soilMoisture=18..35',
      'visibility>10',
      'precipitation=0',
      'gust<6.1'],

    goodConditions: [
      'temperature=15..28',
      'windSpeed<5.5',
      'cloudCover=10..70',
      'humidity<75',
      'soilMoisture=15..45',
      'visibility>5',
      'precipitation=0',
      'gust<8.8'],
    fairConditions: [
      'temperature=10..14 or 29..34',
      'windSpeed=5.5..8',
      'cloudCover=70..100',
      'humidity=75..85',
      'soilMoisture=45..50',
      'precipitation=0..1',
      'visibility=2..5',
      'gust=8.8..11'],
    poorConditions: [
      'temperature<10',
      'temperature>34',
      'windSpeed>8',
      'precipitation>1',
      'humidity>85',
      'soilMoisture>50',
      'visibility<2',
      'snowfallRateMmH>0.5',
      'snowDepthCm>1',
      'gust>11'],

    indoorAlternative: 'Prepare a picnic-style meal indoors or plan your next outdoor gathering'
  },
  {
    id: 'bbq',
    name: 'Have a Barbecue',
    category: 'Outdoor Leisure',
    secondaryCategory: 'Social Activities',
    weatherSensitive: true,
    tags: ['leisure', 'social', 'outdoors', 'food', 'Saturday', 'Sunday', 'holiday'],

    perfectConditions: [
      'temperature=20..26',
      'windSpeed<3',
      'cloudCover=10..50',
      'visibility>10',
      'precipitation=0',
      'gust<6.1'
    ],

    goodConditions: [
      'temperature=16..30',
      'windSpeed<5.5',
      'cloudCover=0..80',
      'humidity<80',
      'visibility>5',
      'precipitation=0',
      'gust<8.8'
    ],
    fairConditions: [
      'temperature=12..15 or 31..34',
      'windSpeed=5.5..8',
      'cloudCover=80..100',
      'humidity=80..90',
      'precipitation=0..1',
      'visibility=2..5',
      'gust=8.8..11'
    ],
    poorConditions: [
      'temperature<12',
      'temperature>34',
      'windSpeed>8',
      'precipitation>1',
      'visibility<2',
      'snowfallRateMmH>0.5',
      'snowDepthCm>1',
      'gust>11'
    ],

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
      'airTemperature=22..28',
      'waterTemperature=18..24',
      'windSpeed=0..4',
      'waveHeight=0..0.5',
      'cloudCover=0..10',
      'visibility>10',
      'precipitation=0',
      'gust<6'
    ],

    goodConditions: [
      'airTemperature=20..32',
      'waterTemperature=16..26',
      'windSpeed=0..8',
      'waveHeight=0..0.8',
      'cloudCover=0..40',
      'humidity<75',
      'visibility>6',
      'precipitation=0..0.1',
      'gust<10'
    ],
    fairConditions: [
      'airTemperature=14..20 or 32..35',
      'waterTemperature=14..28',
      'windSpeed=8..12',
      'waveHeight=0.5..1.2',
      'cloudCover=40..90',
      'humidity<85',
      'visibility=3..6',
      'precipitation=0.1..1',
      'gust=10..16'
    ],
    poorConditions: [
      'airTemperature<14',
      'airTemperature>35',
      'waterTemperature<14',
      'windSpeed>12',
      'waveHeight>1.2',
      'cloudCover>90',
      'precipitation>1',
      'visibility<3',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5',
      'gust>16'
    ],

    indoorAlternative: 'Get that Baywatch box set out and watch some classic beach scenes or plan your next beach trip'
  },
  {
    id: 'cinema',
    name: 'Go to the Cinema',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'leisure', 'Friday', 'Saturday', 'Sunday', 'evening', 'social']
  },
  {
    id: 'bowling',
    name: 'Go Bowling',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'leisure', 'Friday', 'Saturday', 'Sunday', 'evening', 'social']
  },
  {
    id: 'shopping',
    name: 'Go Shopping',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['leisure', 'social', 'Sunday', 'family', 'Saturday', 'Friday']
  },
  {
    id: 'museum',
    name: 'Visit a Museum',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'Saturday', 'Sunday', 'evening']
  },
  {
    id: 'gallery',
    name: 'Visit a Gallery',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['cultural', 'family', 'relaxation', 'Saturday', 'Sunday', 'evening']
  },
  {
    id: 'cafe',
    name: 'Visit a Café',
    category: 'Indoor Recreation',
    secondaryCategory: 'Social Activities',
    weatherSensitive: false,
    tags: ['social', 'relaxation', 'leisure', 'home', 'Saturday', 'Sunday', 'evening', 'family']
  }
];

export default socialActivities;
