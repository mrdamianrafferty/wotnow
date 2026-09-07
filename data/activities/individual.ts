import type { ActivityType } from './types';

/**
 * ─── Held against the individual sports' own bodies, 2026-09 ─────────────
 *
 * The same pass the watersports, cycling and team ladders got. The result for
 * this file is mostly a negative one, recorded so it is not searched for twice:
 *
 *   THE LTA SETS NO NUMBER. Affiliated clubs' policies say play goes ahead
 *   "unless persistent heavy rain makes the courts unplayable", and note that
 *   the surface decides — grass is discouraged when damp, astroturf is playable
 *   almost as soon as the rain stops, clay wants to be slightly wet. There is
 *   no millimetre figure to hold `tennis` against, and its ladder is left alone.
 *
 *   ARCHERY, PADEL AND PICKLEBALL likewise. Wind ruins the scoring rather than
 *   the safety, and nobody publishes a limit. They share golf's old 18 mph /
 *   25 mph ladder, which is a copy rather than a finding — a padel court has
 *   glass walls and a pickleball is nearly weightless, so they cannot really
 *   have the same answer. Left as they are, because retuning them on judgement
 *   alone is exactly what this exercise exists to stop.
 *
 * ─── Golf had two numbers that its own rules contradict ──────────────────
 *
 *   COLD. It vetoed below 5 °C. A course closes for FROST, and frost forms when
 *   the air is at 0 °C — or a little above it, because the ground is colder
 *   than the air. That is the whole basis of the frost delay: ice crystals in
 *   the leaf are punctured underfoot and a green carries the footprints for
 *   months. Five degrees is not that; it is an ordinary British winter round.
 *   Now below 2, with 2-10 °C reading as workable.
 *
 *   WIND. It vetoed above 8 m/s — 18 mph, a Force 5 — which is a normal
 *   afternoon on a links and a stricter limit than this library puts on
 *   HIKING. The R&A's actual test has no speed in it: under Rule 5.7b the
 *   Committee should consider suspending "if several balls are moved by wind on
 *   different parts of the course within a relatively short period of time",
 *   which is a question about balls at rest on fast greens and happens around
 *   30 mph. Now 13 m/s mean and 17 m/s gust — 29 and 38 mph — the same pair
 *   `hiking` and `road_cycling` use.
 *
 * ⚠️ Golf's real suspensions are lightning (Rule 5.7b, immediate, one prolonged
 * note) and an unplayable course. Neither is modelled: nothing here scores
 * lightning, and standing water reaches the score only through `soilMoisture`.
 * Do not read the wind and temperature numbers above as covering them.
 */

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
      'temperature=2..10 or 25..32',
      'windSpeed=5.5..13',        // to 29 mph — links golf is played in a Force 6
      'precipitation=3..10',
      'cloudCover=90..100',
      'visibility=2..5',
      'soilMoisture=45..50',
      'gust=8.8..17'],       // to 38 mph
    poorConditions: [
      'temperature<2 or temperature>32',   // frost, not cold: a course closes for frost, which forms at or just above 0 °C
      'windSpeed>13',        // R&A 5.7b suspends when balls will not stay at rest, not at a Force 5
      'precipitation>10',
      'visibility<2',
      'soilMoisture>50',
      'snowfallRateMmH>1',
      'snowDepthCm>1',
      'gust>17'],

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
      'temperature=25..32',
      'windSpeed=5.5..8',
      'precipitation=1..5',
      'visibility=2..5',
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
