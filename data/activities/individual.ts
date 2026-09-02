import type { ActivityType } from './types';

export const individualSports: ActivityType[] = [
  {
    id: 'golf',
    name: 'Play Golf',
    category: 'Outdoor Activities',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],

    perfectConditions: [
      'temperature=15..21',
      'windSpeed<3',
      'cloudCover=30..60',
      'precipitation=0',
      'soilMoisture=18..35',
      'visibility>10',
      'gust<6.1'],

    goodConditions: [
      'temperature=10..25',
      'windSpeed<5.5',
      'cloudCover=20..90',
      'precipitation=0..3',
      'soilMoisture=15..45',
      'visibility>5',
      'gust<8.8'],
    fairConditions: [
      'temperature=5..10 or 25..32',
      'windSpeed=5.5..8',
      'precipitation=3..10',
      'cloudCover=90..100',
      'visibility=2..5',
      'soilMoisture=45..50',
      'gust=8.8..11'],
    poorConditions: [
      'temperature<5 or temperature>32',
      'windSpeed>8',
      'precipitation>10',
      'visibility<2',
      'soilMoisture>50',
      'snowfallRateMmH>1',
      'snowDepthCm>1',
      'gust>11'],

    indoorAlternative: 'Practise your swing at the driving range or putting indoors with a mat'
  },
  {
    id: 'tennis',
    name: 'Play Tennis',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'leisure', 'outdoors', 'social', 'Saturday', 'Sunday', 'Wednesday'],

    perfectConditions: [
      'temperature=15..21',
      'windSpeed<3',
      'cloudCover=30..60',
      'precipitation=0',
      'visibility>10',
      'gust<6.1'
    ],

    goodConditions: [
      'temperature=10..25',
      'windSpeed<5.5',
      'cloudCover=20..80',
      'precipitation=0..1',
      'visibility>5',
      'gust<8.8'
    ],
    fairConditions: [
      'temperature=5..10 or 25..32',
      'windSpeed=5.5..8',
      'cloudCover=80..100',
      'precipitation=1..5',
      'visibility=2..5',
      'gust=8.8..11'
    ],
    poorConditions: [
      'temperature<5 or temperature>32',
      'windSpeed>8',
      'precipitation>5',
      'visibility<2',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5',
      'gust>11'
    ],

    indoorAlternative: 'Book a court at an indoor tennis centre or work on fitness at the gym'
  },
  {
    id: 'archery',
    name: 'Do Archery',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'outdoors', 'precision', 'focus', 'social', 'Saturday', 'Sunday', 'Wednesday'],
    poorConditions: [
      'temperature<5',
      'temperature>32',
      'windSpeed>8',
      'precipitation>5',
      'visibility<2',
      'soilMoisture>50',
      'snowfallRateMmH>0.5',
      'snowDepthCm>1',
      'gust>11'
    ],
    fairConditions: [
      'temperature=5..10',
      'temperature=26..30',
      'windSpeed=5.5..8',
      'precipitation=1..5',
      'visibility=3..5',
      'soilMoisture=45..50',
      'gust=8.8..11'
    ],
    goodConditions: [
      'temperature=10..25',
      'windSpeed<5.5',
      'cloudCover=0..80',
      'precipitation=0..1',
      'visibility>5',
      'soilMoisture=15..45',
      'gust<8.8'
    ],
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<3',
      'cloudCover=20..50',
      'precipitation=0',
      'visibility>10',
      'soilMoisture=18..35',
      'gust<6.1'
    ],
    indoorAlternative: 'Practise at an indoor range, tune your bow, or work on strength & focus exercises'
  },
  {
    id: 'padel',
    name: 'Play Padel',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'racquet', 'social', 'outdoors', 'leisure', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>2',
      'windSpeed>8',
      'temperature<8',
      'temperature>32',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5',
      'gust>11'
    ],
    fairConditions: [
      'temperature=8..10 or 28..32',
      'windSpeed=5.5..8',
      'precipitation=0..2',
      'gust=8.8..11'
    ],
    goodConditions: [
      'temperature=10..28',
      'windSpeed<5.5',
      'precipitation=0',
      'gust<8.8'
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed<3',
      'precipitation=0',
      'gust<6.1'
    ],
    indoorAlternative: 'Book an indoor court, practise drills at home, or watch strategy videos'
  },
  {
    id: 'pickleball',
    name: 'Play Pickleball',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: true,
    tags: ['sport', 'racquet', 'social', 'outdoors', 'leisure', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>1',
      'windSpeed>8',
      'temperature<8',
      'temperature>32',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5',
      'gust>11'
    ],
    fairConditions: [
      'precipitation=0.1..1',

      'temperature=8..10 or 28..32',
      'windSpeed=5.5..8',
      'gust=8.8..11'
    ],
    goodConditions: [
      'temperature=10..28',
      'windSpeed<5.5',
      'precipitation=0..0.1',
      'gust<8.8'
    ],
    perfectConditions: [
      'temperature=18..22',
      'windSpeed<3',
      'precipitation=0',
      'gust<6.1'
    ],
    indoorAlternative: 'Book an indoor court, practise drills at home, or watch strategy videos'
  },
  {
    id: 'tennis_indoor',
    name: 'Play Tennis (Indoor)',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport','racquet','indoor','Saturday','Sunday','Wednesday']
  },
  {
    id: 'squash',
    name: 'Play Squash',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport','racquet','indoor','Saturday','Sunday','Wednesday']
  },
  {
    id: 'badminton',
    name: 'Play Badminton',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport','racquet','indoor','Saturday','Sunday','Wednesday']
  },
  {
    id: 'table_tennis',
    name: 'Play Table Tennis',
    category: 'Active Sports',
    secondaryCategory: 'Individual Sports',
    weatherSensitive: false,
    tags: ['sport','indoor','Saturday','Sunday','Wednesday']
  },
   {
    id: 'indoor_climbing',
    name: 'Go Climbing (Indoor)',
    category: 'Fitness & Wellness',
    secondaryCategory: 'Indoor Recreation',
    weatherSensitive: false,
    tags: ['fun', 'adventure', 'social', 'evening', 'leisure', 'Tuesday', 'Wednesday', 'Saturday'],
  },
  
];

export default individualSports;
