import type { ActivityType } from './types';

/**
 * ─── Checked against the governing bodies, 2026-09 ───────────────────────
 *
 * The watersports ladders were held against the RYA, British Canoeing and the
 * Met Office; this is the same pass for cycling. Cycling has less to work with
 * — British Cycling publishes no wind or temperature thresholds at all, and it
 * is worth knowing that before someone goes looking for them again.
 *
 * WHAT DOES EXIST:
 *
 *   UCI — Extreme Weather Protocol (2015, extended to heat in 2024). Names six
 *   extreme conditions (freezing rain, snow on the road, strong wind, extreme
 *   temperature, poor visibility, pollution) but sets NO numeric wind or rain
 *   threshold: they are triggers for a meeting, not limits. Heat is the
 *   exception and is measured in WBGT, not air temperature — red zone above
 *   28 °C WBGT, which can mean neutralising or cancelling. WBGT is not
 *   comparable to the air temperature these models score, so it cannot be
 *   copied across; it is recorded here so nobody tries.
 *
 *   AusCycling — Extreme Weather Policy, Aug 2025. A national federation, and
 *   the only one with an actual table. Wind, by forecast mean: 20-38 km/h
 *   review participants' ability; 39-61 km/h "should the forecast be for winds
 *   likely to exceed 40 km/h" officials are notified and BMX is cancelled;
 *   62-88 km/h (gale) cancels all silver and bronze junior and open racing,
 *   and all track, BMX and MTB. Heat, by air temperature: caution from 30 °C,
 *   endurance events may be cancelled 35-40 °C, all competition postponed
 *   above 40 °C. Cold: "under 5 degrees" — and the action is caution, warmer
 *   clothing, and scheduling for the warmer part of the day. NOT cancellation.
 *
 * ─── What moved ──────────────────────────────────────────────────────────
 *
 * `road_cycling` vetoed below 5 °C. That number is AusCycling's, but it is
 * their CAUTION threshold, and this file was using it as a stop — so a dry,
 * calm 4 °C January morning, which is an ordinary British club-run day, read
 * 14: "not today". The veto is now below 2 °C, where the hazard stops being
 * cold and starts being ice, and 2-5 °C reads "workable" instead. See also
 * `cycling` in wellness.ts, which was worse: it vetoed below 8 °C.
 *
 * ─── Checked and left ────────────────────────────────────────────────────
 *
 *   mean wind veto >13 m/s = 29 mph = 47 km/h, inside AusCycling's "exceed
 *   40 km/h" notification band and well below their 62 km/h cancellation.
 *   Conservative for a rider with no commissaire, which is the right way round.
 *
 *   heat veto >32 °C, between AusCycling's "may be cancelled" (35-40) and
 *   their caution (30+). Conservative, and not touched, because the honest
 *   comparator is WBGT and we do not compute it.
 *
 *   `mountain_biking` keeps a higher wind veto (15 m/s) than road, on the
 *   ground that its trails are in trees. Note this cuts both ways: AusCycling's
 *   MTB column is the one that says "remove any low hanging branches or dead
 *   wood on course trail pre event", so wind in woodland is a deadfall hazard
 *   rather than a handling one. Left as it is, flagged as the weakest number
 *   in this file.
 */

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
      'precipitation=0..1',
      'visibility>5'
    ],
    fairConditions: [
      'temperature=2..10 or 28..32',
      'windSpeed=9..13',           // Force 6 — a genuinely hard ride
      'gust=13..17',
      /* 75..90, not 80..90: the old pair left 75-80 in neither band, and
         British afternoons sit in that window constantly, so the gap cost a
         score on a very ordinary day. */
      'humidity=75..90',
      'precipitation=1..3',
      'visibility=2..5'
    ],
    poorConditions: [
      'temperature<2 or temperature>32',   // ice, not cold: below 5 °C is a caution in AusCycling's policy, not a stop
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
      'precipitation=0..2',
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
      'precipitation=0..1',
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
