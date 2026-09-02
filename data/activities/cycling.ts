import type { ActivityType } from './types';

export const cyclingSports: ActivityType[] = [
  {
    id: 'road_cycling',
    name: 'Go Road Cycling',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'cardio', 'group', 'solo', 'Saturday', 'Sunday', 'Wednesday'],
    /**
     * ─── Wind is effort, not danger, 2026-09 ─────────────────────────────
     *
     * The band numbers here were the least wrong in the library (PERFECT under
     * 8 m/s is a reasonable 16 knots), but the separate wind table put UNSAFE at
     * 9 m/s — 32 km/h, a Force 5 — and dropped the score to 10 out of 100 there.
     *
     * That threshold encodes a real risk and the wrong one: being pushed into
     * traffic by a crosswind. On the reservoir circuits this model is being
     * asked about — Rutland's 23 miles, Grafham's 10 — there is no traffic, and
     * a Force 5 is a hard lap rather than a hazard. Scoring it 10 is the finding
     * a cyclist would dismiss the whole board over.
     *
     * The hazard that IS real on those routes is the exposed dam crossings, and
     * it is gust-driven — a steady blow you lean into, a gust puts you off your
     * line. So the mean now carries effort and gusts carry danger, which is the
     * split the data supports now that gusts are actually supplied.
     */
    perfectConditions: [
      'temperature=16..22',
      'windSpeed<5',
      'gust<8',
      'clouds=10..50',
      'precipitation=0',
      'visibility>10'
    ],
    goodConditions: [
      'temperature=10..28',
      'windSpeed<9',               // to about 17 kn — a headwind, not a problem
      'gust<13',
      'clouds=0..80',
      'humidity<75',
      'precipitation=0',
      'visibility>5'
    ],
    fairConditions: [
      'temperature=5..10 or 28..32',
      'windSpeed=9..13',           // Force 6 — a genuinely hard ride
      'gust=13..17',
      'humidity=80..90',
      'precipitation=1..3',
      'visibility=2..5'
    ],
    poorConditions: [
      'temperature<5 or temperature>32',
      'windSpeed>13',
      'gust>17',                   // Force 8 in the gusts — blown off line
      'precipitation>3',
      'humidity>90',
      'visibility<2',
      'snowfallRateMmH>1',
      'snowDepthCm>1'
    ]
  },
  {
    id: 'mountain_biking',
    name: 'Go Mountain Biking',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'trail', 'nature', 'Saturday', 'Sunday'],
    perfectConditions: [
      'temperature=10..18',
      'windSpeed<6',
      'clouds=10..50',
      'soilMoisture=18..35',
      'precipitation=0',
      'visibility>10',
      'gust<11'],
    goodConditions: [
      'temperature=8..24',
      'windSpeed<11',
      'clouds=0..90',
      'humidity<80',
      'soilMoisture=15..45',
      'precipitation=0',
      'visibility>5',
      'gust<16'],
    fairConditions: [
      'temperature=4..8 or 24..28',
      'windSpeed=11..15',
      'humidity=80..90',
      'precipitation=2..5',
      'soilMoisture=45..50',
      'visibility=2..5',
      'gust=16.0..20'],
    poorConditions: [
      'temperature<4 or temperature>28',
      'windSpeed>15',
      'precipitation>5',
      'humidity>90',
      'soilMoisture>50',
      'visibility<2',
      'snowfallRateMmH>2',
      'snowDepthCm>6',
      'gust>20'],
  },
  {
    id: 'gravel_biking',
    name: 'Go Gravel Biking',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'cycling', 'mixed_surface', 'adventure'],
    perfectConditions: [
      'temperature=10..18',
      'windSpeed<5',
      'clouds=20..50',
      'soilMoisture=18..35',
      'precipitation=0',
      'visibility>10',
      'gust<9.4'
    ],
    goodConditions: [
      'temperature=7..24',
      'windSpeed<9',
      'clouds=0..75',
      'humidity<75',
      'soilMoisture=15..45',
      'precipitation=0',
      'visibility>5',
      'gust<13.6'
    ],
    fairConditions: [
      'temperature=2..7 or 24..28',
      'windSpeed=9..13',
      'humidity=75..90',
      'precipitation=1..4',
      'soilMoisture=45..50',
      'visibility=2..5',
      'gust=13.6..17'
    ],
    poorConditions: [
      'temperature<2 or temperature>28',
      'windSpeed>13',
      'precipitation>4',
      'humidity>90',
      'soilMoisture>50',
      'visibility<2',
      'snowfallRateMmH>2',
      'snowDepthCm>6',
      'gust>17'
    ],
  }
];

export default cyclingSports;
