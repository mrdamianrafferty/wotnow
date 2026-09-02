import type { ActivityType } from './types';

export const natureActivities: ActivityType[] = [
  {
    id: 'birdwatching',
    name: 'Go Birdwatching',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'wildlife', 'observation', 'leisure', 'patience', 'Saturday', 'Sunday'],

    /**
     * ─── Three silent failures and a season that had to go, 2026-09 ──────
     *
     * `cloudCover=30-60` used a hyphen where the parser needs `..`, so it parsed
     * as `cloudCover=30` with a ±3 tolerance and then matched a key the weather
     * object did not carry at all (`clouds`). Both halves silently dropped, on
     * every band. Add the never-supplied `soilMoisture` and a visibility figure
     * that was being fabricated upstream, and this model's six-criterion perfect
     * band was really three — which is why it measured 62 to 82 across five
     * Beaufort forces without meaningfully moving. The key is now aliased
     * upstream and the ranges are written in the syntax the parser reads.
     *
     * ─── seasonalMonths removed, deliberately ────────────────────────────
     *
     * It said [3,4,5,9,10,11] — spring and autumn passage. That is a statement
     * about when birding is BEST, not about when it is possible, and it was
     * harmless only for as long as `outOfSeason` was computed and thrown away.
     * Now that season actually caps the score, leaving it would cap Rutland and
     * Grafham through December, January and February — the months those two
     * reservoirs matter most, holding internationally important numbers of
     * wintering wildfowl. Birding is a year-round activity and the field is for
     * activities with a closed season, so it is gone rather than rewritten.
     *
     * ─── Wind, and what this model still cannot say ──────────────────────
     *
     * Tightened from GOOD-to-Force-6 to GOOD-to-Force-4: a scope on a tripod is
     * unusable well before a walker is uncomfortable, and passerines sit tight
     * in a blow.
     *
     * But "more wind is worse" is only half true here, and this is the one model
     * in the set where the simplification bites. A hard westerly behind a
     * depression is what puts storm-driven passage onto an inland reservoir —
     * the best days of the autumn at Rutland and Grafham are days this model
     * scores as poor. Fixing that properly needs a second mode (counting versus
     * passage) and a wind DIRECTION the engine does not currently read, so it is
     * recorded here rather than faked.
     */
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<4',
      'gust<7',
      'cloudCover=30..60',
      'visibility>10',
      'precipitation=0',
      'soilMoisture=20..35'
    ],

    goodConditions: [
      'temperature=5..24',
      'windSpeed<8',
      'gust<12',
      'cloudCover=20..80',
      'visibility>5',
      'precipitation=0',
      'soilMoisture=15..45'
    ],

    fairConditions: [
      'temperature=0..5 or 24..28',
      'windSpeed=8..12',
      'gust=12..16',
      'cloudCover=0..20 or 80..100',
      'precipitation=0..2',
      'visibility=2..5',
      'soilMoisture=10..15 or soilMoisture=45..60'
    ],

    poorConditions: [
      'temperature<0 or temperature>28',
      'windSpeed>12',
      'gust>16',
      'precipitation>2',
      'visibility<2',
      'soilMoisture<10 or soilMoisture>60',
      'snowfallRateMmH>1',
      'snowDepthCm>2'
    ],

    indoorAlternative: 'Review your field guide and update your sightings log'
  },
  {
    id: 'outdoor_gardening',
    name: 'Do Some Gardening',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['hobby', 'relaxation', 'nature', 'creative', 'Saturday', 'Sunday'],
    perfectConditions: [
      'airTemperature=18..24',
      'windSpeed<4',
      'cloudCover=50..90',
      'humidity=50..70',
      'soilMoisture=30..50',
      'precipitation=0',
      'visibility>10',
      'gust<8.8'],
    goodConditions: [
      'airTemperature=12..27',
      'windSpeed<8',
      'cloudCover=50..100',
      'precipitation=0',
      'humidity<80',
      'soilMoisture=20..60',
      'visibility>5',
      'gust<12.8'],
    fairConditions: [
      'airTemperature=5..12 or 27..32',
      'windSpeed=8..12',
      'cloudCover=20..50',
      'precipitation=2..5',
      'humidity=80..90',
      'soilMoisture=10..20 or 60..70',
      'visibility=2..5',
      'gust=12.8..16'],
    poorConditions: [
      'airTemperature<5 or airTemperature>32',
      'windSpeed>12',
      'precipitation>5',
      'humidity>90',
      'soilMoisture<10 or soilMoisture>70',
      'visibility<2',
      'snowfallRateMmH>1',
      'snowDepthCm>2',
      'gust>16'],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    indoorAlternative: 'Plan garden layout or start seedlings indoors'
  },
   {
    id: 'mushroom_hunting',
    name: 'Go Mushroom Hunting',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'food', 'forest', 'seasonal', 'quiet', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<0',                // frost kills fungi
      'temperature>25',              // ground dries out
      'windSpeed>12',                // uncomfortable & risky
  'precipitation>10',            // flooded ground, unpleasant
      'visibility<2',                // fog, unsafe
      'soilMoisture<10 or soilMoisture>60', // barren or waterlogged forest floor
      'snowfallRateMmH>1',           // snow buries mushrooms & trails
      'snowDepthCm>3',                // snowpack hides logs and holes
      'gust>16'
    ],
    fairConditions: [
      'temperature=0..8',             // cool but possible
      'temperature=18..22',           // a bit warm, but shaded forests may be fine
      'windSpeed=8..12',             // breezy but manageable
      'precipitation=2..5',           // not ideal but damp enough
      'visibility=2..5',              // dim light may still be safe
      'soilMoisture=10..15 or soilMoisture=45..60',
      'gust=12.8..16'
    ],
    goodConditions: [
      'temperature=8..18',
      'windSpeed<8',
      'cloudCover=10..90',
      'visibility>5',
      'soilMoisture=15..45',
      'gust<12.8'
    ],
    perfectConditions: [
      'temperature=10..15',
      'windSpeed<4',
      'cloudCover=20..60',
      'visibility>10',
      'soilMoisture=20..35',
      'gust<8.8'
    ],
    seasonalMonths: [9, 10, 11],
    indoorAlternative: 'Study a field guide, clean and cook previous finds, or dry mushrooms for storage'
  },
  {
    id: 'orienteering',
    name: 'Go Orienteering',
    category: 'Active Sports',
    secondaryCategory: 'Outdoor Recreation',
    weatherSensitive: true,
    tags: ['sport', 'navigation', 'outdoors', 'running', 'adventure', 'Saturday', 'Sunday'],
    poorConditions: [
      'temperature<0',                // icy & unsafe footing
      'temperature>30',              // heat exhaustion risk
      'windSpeed>13',                // unsafe in forested areas
      'precipitation>15',            // heavy rain, slippery
      'visibility<2',                // foggy, disorienting
      'soilMoisture<10 or soilMoisture>60', // icy-hard or boggy ground
      'snowfallRateMmH>1',           // heavy snow hides markers
      'snowDepthCm>3',                // deep snow disrupts footing
      'gust>17'
    ],
    fairConditions: [
      'temperature=0..5',            // cold but safe
      'temperature=22..26',          // warmer but manageable
      'windSpeed=9..13',            // breezy but doable
      'precipitation=5..10',         // light showers
      'visibility=2..5',             // reduced, but passable
      'soilMoisture=10..15 or soilMoisture=45..60',
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=5..22',
      'windSpeed<9',
      'cloudCover=10..80',
      'precipitation=0',
      'visibility>5',
      'soilMoisture=15..45',
      'gust<13.6'
    ],
    perfectConditions: [
      'temperature=10..16',
      'windSpeed<5',
      'cloudCover=30..60',
      'precipitation=0',
      'visibility>10',
      'soilMoisture=20..35',
      'gust<9.4'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Practise map reading & route planning or train on a treadmill'
  },
];

export default natureActivities;
