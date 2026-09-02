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
     * ─── Wind, and which birding this model is ───────────────────────────
     *
     * Tightened from GOOD-to-Force-6 to GOOD-to-Force-4: a scope on a tripod is
     * unusable well before a walker is uncomfortable, and passerines sit tight
     * in a blow.
     *
     * That is right for the birding this model describes — watching, counting,
     * photographing — and wrong for the other kind, which wants a gale. Rather
     * than average the two into a model that suits neither, the second is now
     * its own activity: see `birdwatching_passage` below.
     *
     * ─── Cold is not bad birding ─────────────────────────────────────────
     *
     * The old bands called 0-5 °C merely fair and anything below freezing poor,
     * which reads the thermometer as though the observer were the subject. A
     * hard frost is some of the best inland birding of the year: it ices the
     * shallow waters and concentrates everything onto the deep ones, and cold
     * weather on the continent pushes wildfowl west onto exactly these
     * reservoirs. Good now runs down to -1 °C and poor starts at -5 °C.
     *
     * ─── soilMoisture removed ────────────────────────────────────────────
     *
     * It was in all four bands, was never supplied, and was therefore dropped
     * every time — which is the right outcome for the wrong reason. This is an
     * activity done standing still in a hide or on a made path, and how soft the
     * ground is has no bearing on it.
     *
     * The variable that genuinely limits reservoir birding is visibility: you
     * cannot scan three thousand acres through fog, and it is far more often the
     * reason to stay at home than wind is. It is still not carried inland, and
     * is declared in the endpoint's neutralCriteria rather than guessed at.
     */
    perfectConditions: [
      'temperature=12..18',
      'windSpeed<4',
      'gust<7',
      'cloudCover=30..60',
      'visibility>10',
      'precipitation=0'
    ],

    goodConditions: [
      'temperature=-1..24',
      'windSpeed<8',
      'gust<12',
      'cloudCover=20..80',
      'visibility>5',
      'precipitation=0'
    ],

    fairConditions: [
      'temperature=-5..-1 or 24..28',
      'windSpeed=8..12',
      'gust=12..16',
      'cloudCover=0..20 or 80..100',
      'precipitation=0..2',
      'visibility=2..5'
    ],

    poorConditions: [
      'temperature<-5 or temperature>28',
      'windSpeed>12',
      'gust>16',
      'precipitation>2',
      'visibility<2',
      'snowfallRateMmH>1',
      'snowDepthCm>2'
    ],

    indoorAlternative: 'Review your field guide and update your sightings log'
  },
  {
    /**
     * ─── The other kind of birding, added 2026-09 ────────────────────────
     *
     * A large inland reservoir has two birding modes that want opposite
     * weather, and one model cannot hold both.
     *
     * The ordinary kind — counting wildfowl, watching ospreys, photography —
     * wants a still, bright, comfortable day, and `birdwatching` above is that
     * model. This is the other kind. A deep Atlantic low with a sustained
     * westerly forces seabirds inland, and Rutland and Grafham are where they
     * come down: kittiwake, little gull, black tern, skuas, once in a while a
     * Leach's petrel. Those are the days birders take off work, and they are
     * days the ordinary model scores as poor — correctly, for the ordinary
     * kind, which is exactly why this is a separate activity and not a
     * compromise between the two.
     *
     * The Anglian demo makes an argument out of precisely this: on one
     * afternoon at one reservoir, "Birdwatching — Tough" beside "Storm birds —
     * Peak", off the same forecast. That is the whole product in one row, and
     * it is not a contrivance — it is how the people who go there behave.
     *
     * ─── Direction is the whole thing ────────────────────────────────────
     *
     * A Force 7 from the east is a cold day with nothing in it. A Force 7 from
     * the west has come off the Atlantic and carries birds with it. Same speed,
     * different day — and until `wind_direction_10m_dominant` was threaded
     * through the inland pipeline for this, the engine could not tell them
     * apart at all. `windDirection` had existed on the weather object since the
     * coastal models were written and no inland source had ever filled it.
     *
     * 200-310 degrees is SSW through WNW, the arc a tracking depression
     * delivers. Bounded on both sides deliberately: a northerly is a different
     * event again, good for skuas on the coast and largely empty inland.
     *
     * ─── Why the wind floor is so high ───────────────────────────────────
     *
     * Below about a Force 5 nothing is displaced, and the ordinary model
     * already scores that day better than this one ever could. So the bottom of
     * this ladder is deliberately poor rather than neutral — not because a calm
     * day is bad, but because on a calm day this is the wrong question. Note
     * that a low wind here fires a SHORTFALL, not a hazard, so the scorer will
     * not call a still morning "unsafe" (see SHORTFALL_NOT_HAZARD).
     *
     * ─── What this model still cannot see ────────────────────────────────
     *
     * Two things, and both matter more than anything it can.
     *
     * Reservoir DRAWDOWN is the biggest single driver of autumn wader interest
     * — the water drops after summer and the exposed mud is the habitat. There
     * is no level in this engine and no obvious place to put one.
     *
     * And VISIBILITY, which is the usual reason to stay at home: three thousand
     * acres cannot be scanned through murk, and a westerly gale arrives with
     * plenty of it. It is not carried inland, and is declared in the endpoint's
     * neutralCriteria rather than assumed away.
     */
    id: 'birdwatching_passage',
    name: 'Watch for Storm-Driven Birds',
    category: 'Outdoor Activities',
    secondaryCategory: 'Nature Activities',
    weatherSensitive: true,
    tags: ['nature', 'wildlife', 'observation', 'patience', 'reservoir', 'autumn', 'Saturday', 'Sunday'],

    perfectConditions: [
      'windSpeed=13..20',            // Force 6-8. The real thing.
      'windDirection=200..310',      // SSW through WNW, off the Atlantic
      'gust>17',
      'precipitation=1..8',          // rain in the wind is what brings them down
      'temperature=4..16'
    ],

    goodConditions: [
      'windSpeed=10..22',            // Force 5 and up
      'windDirection=180..330',
      'gust>13',
      'precipitation=0..12',
      'temperature=2..18'
    ],

    fairConditions: [
      'windSpeed=8..10',             // Force 5: a chance rather than an event
      'windDirection=160..350',
      'temperature=0..20'
    ],

    poorConditions: [
      'windSpeed<8',
      'temperature<-2 or temperature>22',
      'visibility<0.5',              // the one thing that genuinely stops it
      'snowfallRateMmH>2'
    ],

    seasonalMonths: [4, 5, 9, 10, 11],
    indoorAlternative: 'Read the county bird news, or look up what a westerly usually brings in'
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
      'soilMoisture=18..35',
      'precipitation=0',
      'visibility>10',
      'gust<8.8'],
    goodConditions: [
      'airTemperature=12..27',
      'windSpeed<8',
      'cloudCover=50..100',
      'precipitation=0..2',
      'humidity<80',
      'soilMoisture=15..45',
      'visibility>5',
      'gust<12.8'],
    fairConditions: [
      'airTemperature=5..12 or 27..32',
      'windSpeed=8..12',
      'cloudCover=20..50',
      'precipitation=2..5',
      'humidity=80..90',
      'soilMoisture=45..50',
      'visibility=2..5',
      'gust=12.8..16'],
    poorConditions: [
      'airTemperature<5 or airTemperature>32',
      'windSpeed>12',
      'precipitation>5',
      'humidity>90',
      'soilMoisture>50',
      'visibility<2',
      'snowfallRateMmH>1',
      'snowDepthCm>2',
      'gust>16'],
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
      'soilMoisture>50', // barren or waterlogged forest floor
      'snowfallRateMmH>1',           // snow buries mushrooms & trails
      'snowDepthCm>3',                // snowpack hides logs and holes
      'gust>16'
    ],
    fairConditions: [
      'temperature=0..8',             // cool but possible
      'temperature=18..22',           // a bit warm, but shaded forests may be fine
      'windSpeed=8..12',             // breezy but manageable
      'precipitation=2..10',           // not ideal but damp enough
      'visibility=2..5',              // dim light may still be safe
      'soilMoisture=45..50',
      'gust=12.8..16'
    ],
    goodConditions: [
      'precipitation=0..2',

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
      'soilMoisture=18..35',
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
      'soilMoisture>50', // icy-hard or boggy ground
      'snowfallRateMmH>1',           // heavy snow hides markers
      'snowDepthCm>3',                // deep snow disrupts footing
      'gust>17'
    ],
    fairConditions: [
      'temperature=0..5 or 22..30',            // cold but safe
      'temperature=22..26',          // warmer but manageable
      'windSpeed=9..13',            // breezy but doable
      'precipitation=5..15',         // steady rain, still played
      'visibility=2..5',             // reduced, but passable
      'soilMoisture=45..50',
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=5..22',
      'windSpeed<9',
      'cloudCover=10..80',
      'precipitation=0..5',
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
      'soilMoisture=18..35',
      'gust<9.4'
    ],
    indoorAlternative: 'Practise map reading & route planning or train on a treadmill'
  },
];

export default natureActivities;
