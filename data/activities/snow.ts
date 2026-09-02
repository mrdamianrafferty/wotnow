import type { ActivityType } from './types';

export const snowSports: ActivityType[] = [
  {
    id: 'skiing',
    name: 'Go Skiing',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'snow', 'mountain', 'sport', 'Saturday', 'Sunday', 'Friday'],
    perfectConditions: [
      'temperature=-6..-2',
      'windSpeed<6',
      'clouds=10..50',
      'visibility>5',
      'snowDepthCm=60..200',
      'gust<11'],
    goodConditions: [
      'temperature=-12..0',
      'windSpeed<11',
      'clouds=25..75',
      'visibility>2',
      'snowDepthCm=30..200',
      'gust<16'],
    fairConditions: [
      'temperature=0..2 or temperature=-20..-12',
      'windSpeed=11..15',
      'clouds=0..25 or 75..100',
      'visibility=1..2',
      'gust=16.0..20'],
    poorConditions: [
      'temperature>2 or temperature<-20',
      'windSpeed>15',
      'precipitation>2',
      'visibility<1',
      'snowDepthCm<20',
      'snowfallRateMmH>4',
      'gust>20'],
    seasonalMonths: [11, 12, 1, 2, 3],
    indoorAlternative: 'Tune your skis, check avalanche reports, or hit the gym for leg day'
  },
  {
    id: 'snowboarding',
    name: 'Go Snowboarding',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'snow', 'mountain', 'sport', 'Saturday', 'Sunday', 'Friday'],
    perfectConditions: [
      'temperature=-8..-2',
      'windSpeed<6',
      'visibility>5',
      'snowDepthCm=50..200',
      'gust<11'
    ],
    goodConditions: [
      'temperature=-15..0',
      'windSpeed<11',
      'visibility>2',
      'snowDepthCm=30..200',
      'gust<16'
    ],
    fairConditions: [
      'temperature=0..2 or temperature=-20..-15',
      'windSpeed=11..15',
      'visibility=1..2',
      'gust=16..20'
    ],
    poorConditions: [
      'temperature>2 or temperature<-20',
      'windSpeed>15',
      'precipitation>2',
      'visibility<1',
      'snowDepthCm<20',
      'snowfallRateMmH>4',
      'gust>20'
    ],
    seasonalMonths: [11, 12, 1, 2, 3],
    indoorAlternative: 'Tune your board, wax edges, or hit the gym for core & balance'
  },
  {
    id: 'cross_country_skiing',
    name: 'Go Cross-country Skiing',
    category: 'Winter Sports',
    secondaryCategory: 'Snow Sports',
    weatherSensitive: true,
    tags: ['winter', 'snow', 'endurance', 'sport', 'Saturday', 'Sunday'],
    perfectConditions: [
      'temperature=-10..-3',
      'windSpeed<6',
      'visibility>5',
      'snowDepthCm=30..120',
      'gust<11'
    ],
    goodConditions: [
      'temperature=-15..0',
      'windSpeed<11',
      'visibility>2',
      'snowDepthCm=15..120',
      'gust<16'
    ],
    fairConditions: [
      'temperature=0..2 or temperature=-20..-15',
      'windSpeed=11..15',
      'visibility=1..2',
      'gust=16..20'
    ],
    poorConditions: [
      'temperature>2 or temperature<-20',
      'windSpeed>15',
      'precipitation>2',
      'visibility<1',
      'snowDepthCm<10',
      'snowfallRateMmH>4',
      'gust>20'
    ],
    seasonalMonths: [11, 12, 1, 2, 3],
    indoorAlternative: 'Roller-ski session or endurance training indoors'
  }
];

export default snowSports;
