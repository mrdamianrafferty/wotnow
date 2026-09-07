/**
 * Heat ceilings, audited against running.
 *
 * `running` vetoes above 25°C. Every other exertion activity in the library was
 * written independently, and they had drifted apart by ten degrees:
 *
 *     cricket           PRIME at 35°C          rugby   PRIME at 34°C
 *     gaelic_football   no upper limit at all  hurling no upper limit at all
 *
 * A ninety-minute full-field game is not less demanding than a run. The
 * ceilings here are now pitched by exertion — contact and sustained-effort
 * sports (rugby, gaelic, hurling, american football) at 28°C, stop-start ones
 * (cricket, hockey, outdoor basketball) at 30°C, and the two where standing in
 * the sun IS the activity (baseball, beach volleyball) at 32°C.
 *
 * WHAT THIS DOES NOT FIX, ONE. `fairConditions` cannot demote a day; only a
 * `poorCondition` can, and it does so by veto. So a ceiling is simultaneously
 * "the temperature this becomes unsafe" and "the last temperature this can
 * still read Prime" — rugby reads Prime at 28°C and drops to 14 at 29°C. The
 * cliff is the scorer's, not the data's: `activitySuitability.ts` has no
 * per-criterion weighting, so there is no way to say "hot enough to matter,
 * not hot enough to cancel". Same limitation recorded on dog_walking in
 * `lifestyle.ts`.
 *
 * WHAT THIS DOES NOT FIX, TWO — and it is the larger one. A veto is not the
 * only ceiling an activity has. `getSuggestionsByDay` disqualifies the good
 * band when its WORST criterion falls below 0.35, and an out-of-range value
 * decays as `0.5 * (1 - overflow/span)`, so the good band dies at
 * `hi + 0.3 * span` whatever the veto says. That hidden ceiling is the binding
 * one for seventeen activities:
 *
 *     foraging         veto >30, dies at 22.4       urban_exploring  >35, dies at 30.7
 *     gaelic_football  veto >28, dies at 23.9       mushroom_hunting >25, dies at 21.0
 *
 * Measured on foraging: `good.mean` holds at 0.86-0.90 from 20°C to 25°C while
 * the score drops 78 -> 39 at 23°C, purely on that floor. Fair cannot catch it,
 * by design — fair lists MARGINAL values, so a pleasant day scores near zero
 * against it (see the comment at the `worst()` floor). Closing it means either
 * widening every good band to `(veto + 0.3*lo)/1.3`, or exempting comfort
 * criteria from the floor the way `DECIDES_SAFETY` already exempts the rest.
 * Neither is in this change.
 */

import type { ActivityType } from './types';

/**
 * ─── What the team sports' governing bodies actually publish, 2026-09 ────
 *
 * The watersports ladders could be held against the RYA, British Canoeing and
 * the Met Office, and cycling against AusCycling. This is the same exercise for
 * the team sports, and the headline is a negative result worth writing down so
 * nobody spends another afternoon looking:
 *
 *   THEY MOSTLY DO NOT PUBLISH NUMBERS. A team sport is called off by a person
 *   standing on the pitch, not by a threshold. The FA's own test for a frozen
 *   pitch is physical — "if you cannot push your thumb into the pitch surface
 *   to a depth of at least 1cm, the ground is too hard to play safely" — and
 *   for waterlogging it is whether surface water drains within 30 minutes.
 *   The RFU, the ECB and England Hockey all put the decision with the match
 *   official. None of them names an air temperature.
 *
 *   WHERE THERE IS A NUMBER, IT IS USUALLY NOT AIR TEMPERATURE. World Rugby's
 *   2025 heat guideline runs on a Heat Stress Index of 0-250 built from air
 *   temperature, humidity, wind and ground radiation, measured on the ground
 *   with EMU devices — postponement above 250. The UCI uses WBGT. Neither is
 *   comparable to the air temperature these models score, and copying the
 *   figure across would be a unit error wearing a citation.
 *
 *   THE EXCEPTION IS COLD, AND IT IS FAR BELOW US. World Rugby's Cold Weather
 *   Guideline postpones "when air temperature falls below -15°C", with a
 *   wind-chill ladder at -1 (raise awareness), -4 (more layers), -9 (shorten
 *   matches) and -18 °C (consider cancelling), and recommends scheduling above
 *   -10 °C with wind below 25 km/h.
 *
 *   Every cold veto in this file is far stricter than that, and deliberately
 *   stays so: the reason a British match is off in January is the STATE OF THE
 *   GROUND, not cold injury to the player. A sub-zero air temperature is our
 *   only proxy for a pitch that will not take a stud. That is a different
 *   hazard from the one World Rugby is legislating for, and the numbers here
 *   should not be relaxed towards theirs on the strength of the citation.
 *
 *   ECB, England Hockey and the FA all defer heat decisions to the Met Office
 *   and UKHSA heat-health alerts rather than setting their own figure.
 *
 * ─── The one number everybody agrees on, which we do not model ───────────
 *
 * Lightning. The ECB's guidance is "30 minutes after the last thunder it
 * should be safe to go out", which is the 30-30 rule every other body also
 * uses. Nothing in this library scores lightning at all, so a thunderstorm
 * reaches a reader only through whatever rain comes with it. That is the
 * largest real gap in the team-sport models and it is a data-source problem,
 * not a threshold one.
 *
 * ─── What this pass actually fixed: seasons, not thresholds ─────────────
 *
 * Checking the call-off guidance turned up three `seasonalMonths` that were
 * simply wrong, which is a bigger user-facing error than any threshold here:
 * an out-of-season activity is penalised into the "not today" bucket whatever
 * the weather is doing. See the comments at each.
 *
 *     hockey    was Mar-Oct, which is very nearly the inverse of the truth
 *     cricket   was May-Sep, missing the whole of April
 *     rugby     was Sep-Mar, cutting off a real month at the end
 */

export const teamSports: ActivityType[] = [
  {
    id: 'football_soccer',
    name: 'Play Football',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'outdoors', 'football', 'Saturday', 'Sunday', 'Wednesday'],

    perfectConditions: [
      'temperature=12..18',         // comfortable running temperature
      'windSpeed<5',               // no ball drift or discomfort
      'clouds=40..70',              // partial cloud helps visibility without glare
      'precipitation=0',            // dry = best ball control and pitch condition
      'soilMoisture=18..35',        // firm turf with good traction
      'visibility>10',               // long-distance visibility ideal for playmaking
      'gust<9.4'],

    goodConditions: [
      'temperature=5..25',          // widely playable for most amateur players
      'windSpeed<9',               // breezy but not disruptive
      'clouds=20..90',              // glare or overcast is manageable
      'precipitation=0..5',            // played through rain; 5 mm is the limit
      'soilMoisture=15..45',        // playable with some softness
      'visibility>5',                // enough to see the game well
      'gust<13.6'],
    fairConditions: [
      'temperature=0..5 or 25..30', // chilly or hot but not dangerous
      'windSpeed=9..13',           // gusty conditions may affect long balls
      'precipitation=5..15',        // moderate rain, some puddles likely
      'soilMoisture=45..50', // hardening or soggy patches
      'visibility=2..5',             // foggy or poor light, may reduce situational awareness
      'gust=13.6..17'],

    poorConditions: [
      'temperature<0 or temperature>30',   // frozen or dangerously hot
      'windSpeed>13',                      // hard to control ball or run
      'precipitation>15',                  // waterlogged pitch, ball unplayable
      'soilMoisture>50', // rock-hard or boggy pitch
      'visibility<2',
      // Snow-aware penalties
      'snowfallRateMmH>1',
      'snowDepthCm>1',
      'gust>17'],

    /*

      No season. A kickabout is not a fixture list.

    

      This carried [2,3,4,5,8,9,10,11] — the English league season with

      December and January cut out of the middle of it, which is Boxing Day

      and the New Year programme, the busiest football of the year. So it was

      wrong even as a fixture list.

    

      But a fixture list is the wrong thing to model. Somebody asking this app

      whether today is any good for football is asking about a park and a ball,

      and a park pitch is not CLOSED in July — which is the test this library

      already applies to seasons. The weather decides, and the weather already

      knows how: below freezing, lying snow, snow falling and waterlogged

      ground are all in the poor band, and they are what actually stops a game.

    */

    indoorAlternative: 'Hit the gym for drills, or play futsal indoors'
  },

  {
    id: 'american_football',
    name: 'Play American Football',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'football', 'outdoors', 'autumn', 'Saturday', 'Sunday', 'holiday', 'Friday'],

    poorConditions: [
      'precipitation>15',       // very heavy rain, waterlogged
      'windSpeed>15',           // gusty, dangerous
      'temperature<0',          // freezing
      'temperature>28',         // oppressive heat
      'soilMoisture>50', // frozen/dusty or boggy turf
      'snowfallRateMmH>1',      // sustained snow makes footing unsafe
      'snowDepthCm>1',           // shallow accumulation already obscures lines
      'gust>20'
    ],

    fairConditions: [
      'temperature=0..5 or 22..28',     // cold warmups or heat-adapted sessions
      'windSpeed=11..15',               // strong winds affect play
      'precipitation=5..15',            // wet but not yet unplayable
      'soilMoisture=45..50', // hard spots or muddy sections
      'visibility=2..5',                 // hazy, dusk or foggy
      'gust=16..20'
    ],

    goodConditions: [
      'temperature=5..22',              // acceptable for most
      'windSpeed<11',
      'precipitation=0..5',
      'soilMoisture=15..45',             // resilient turf
      'gust<16'
    ],

    perfectConditions: [
      'temperature=12..18',             // mild & comfortable
      'windSpeed<6',
      'precipitation=0',
      'soilMoisture=18..35',             // grippy but forgiving surface
      'gust<11'
    ],

    seasonalMonths: [8, 9, 10, 11, 12],

    indoorAlternative: 'Watch a game on TV, review playbooks, or practise drills at an indoor gym'
  },
  {
    id: 'baseball',
    name: 'Play Baseball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'bat-and-ball', 'outdoors', 'social', 'Saturday', 'Sunday', 'holiday', 'Friday'],

    poorConditions: [
      'precipitation>2',      // steady rain cancels play
      'windSpeed>13',          // gusty, dangerous for fly balls
      'temperature<5',         // freezing & unpleasant
      'temperature>32',        // oppressive heat
      'soilMoisture>50', // baked infield or waterlogged outfield
      'snowfallRateMmH>1',     // flurries quickly reduce visibility & grip
      'snowDepthCm>1',          // light settling snow already impacts bases
      'gust>17'
    ],

    fairConditions: [
      'temperature=5..10 or 28..32',   // chilly or hot, not ideal
      'windSpeed=9..13',              // breezy affects ball flight
      'precipitation=0.5..2',           // showers or on/off rain
      'soilMoisture=45..50', // dusty basepaths or muddy turf
      'visibility=2..5',                // dusk, fog, or haze
      'gust=13.6..17'
    ],

    goodConditions: [
      'temperature=10..28',            // wide range tolerated
      'windSpeed<9',
      'precipitation=0..0.5',               // a passing shower at most
      'soilMoisture=15..45',           // playable field conditions
      'visibility>5',
      'gust<13.6'
    ],

    perfectConditions: [
      'temperature=18..24',            // ideal comfort
      'windSpeed<5',
      'precipitation=0',
      'soilMoisture=18..35',           // true bounce, firm footing
      'visibility>10',
      'gust<9.4'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9],

    indoorAlternative: 'Practise batting at an indoor cage, watch game film, or work on fitness'
  },

  {
    id: 'hurling_camogie',
    name: 'Play Hurling',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'irish', 'cultural', 'heritage', 'community', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>15',           // heavy rain, waterlogged pitch
      'windSpeed>13',               // dangerously gusty
      'temperature<2 or temperature>28', // freezing ground, or heat a full-field game cannot carry
      'soilMoisture>50', // baked or boggy surface
      'visibility<2',               // fog, unsafe
      'snowfallRateMmH>1',          // stick-and-ball play suffers in active snow
      'snowDepthCm>1',               // shallow snow hides lines and footing
      'gust>17'
    ],
    fairConditions: [
      'temperature=2..7 or 20..28',           // chilly but playable
      'windSpeed=9..13',           // blustery, requires skill
      'precipitation=5..15',        // moderate rain, still playable in tradition
      'soilMoisture=45..50', // hard patches or soft sod
      'visibility=2..5',             // hazy but manageable
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=7..20',          // broad acceptable range
      'windSpeed<9',
      'precipitation=0..5',
      'soilMoisture=15..45',        // resilient sod
      'visibility>5',
      'gust<13.6'
    ],
    perfectConditions: [
      'temperature=12..18',         // mild & ideal
      'windSpeed<5',
      'precipitation=0',
      'soilMoisture=18..35',        // controllable pitch
      'visibility>10',
      'gust<9.4'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
    indoorAlternative: 'Practise drills indoors, watch match videos, or work on fitness'
  },
  {
    id: 'gaelic_football',
    name: 'Play Gaelic Football',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'irish', 'cultural', 'heritage', 'community', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>15',           // heavy rain, waterlogged pitch
      'windSpeed>13',               // dangerously gusty
      'temperature<2 or temperature>28', // freezing ground, or heat a full-field game cannot carry
      'soilMoisture>50', // baked or waterlogged pitch
      'visibility<2',               // fog, unsafe
      'snowfallRateMmH>1',          // active snowfall makes handling difficult
      'snowDepthCm>1',               // quick accumulation hides markings
      'gust>17'
    ],
    fairConditions: [
      'temperature=2..7 or 20..28',           // chilly but playable
      'windSpeed=9..13',           // gusty, but games often proceed
      'precipitation=5..15',        // steady rain, less pleasant but traditional
      'soilMoisture=45..50', // hard or boggy sections
      'visibility=2..5',             // misty or foggy, but usually tolerated
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=7..20',          // broad acceptable range
      'windSpeed<9',
      'precipitation=0..5',
      'soilMoisture=15..45',        // resilient pitch
      'visibility>5',
      'gust<13.6'
    ],
    perfectConditions: [
      'temperature=12..18',         // mild & ideal
      'windSpeed<5',
      'precipitation=0',
      'soilMoisture=18..35',        // ideal traction
      'visibility>10',
      'gust<9.4'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9],
    indoorAlternative: 'Practise drills indoors, watch match videos, or work on fitness'
  },
  {
    id: 'hockey',
    name: 'Play Hockey',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'field', 'outdoor', 'social', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>8',             // heavy rain makes surface unplayable
      'windSpeed>13',                // gusty, uncomfortable
      'temperature<2',               // freezing, unsafe
      'temperature>30',              // oppressive heat
      'soilMoisture>50', // dusty or saturated pitch
      'visibility<2',                // fog or poor light
      'snowfallRateMmH>1',           // stick-and-ball precision fails in snow
      'snowDepthCm>1',                // carpet of snow ruins turf grip
      'gust>17'
    ],
    fairConditions: [
      'temperature=2..8 or 26..30',  // chilly or hot but tolerable
      'windSpeed=9..13',            // breezy, not ideal
      'precipitation=3..8',          // showers likely but manageable
      'soilMoisture=45..50', // hard spots or soggy turf
      'visibility=2..5',              // reduced visibility, still playable
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=8..26',           // broad range tolerated
      'windSpeed<9',
      'precipitation=0..3',
      'soilMoisture=15..45',         // consistent surface
      'visibility>5',
      'gust<13.6'
    ],
    perfectConditions: [
      'temperature=15..20',          // mild & comfortable
      'windSpeed<5',
      'precipitation=0',
      'soilMoisture=18..35',         // smooth, fast surface
      'visibility>10',
      'gust<9.4'
    ],
    /* England Hockey is a WINTER sport and this was very nearly inverted:
       March-October marked it in season through a summer in which no hockey is
       played, and OUT of season from November to February, which is the middle
       of it. The 2025-26 league season ran 20 September to 29 March; 2026-27
       starts 12 September to finish before Easter. */
    seasonalMonths: [9, 10, 11, 12, 1, 2, 3, 4],
    indoorAlternative: 'Practise skills at an indoor hall or watch match replays'
  },

  {
    id: 'netball',
    name: 'Play Netball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'outdoors', 'social', 'fitness', 'Saturday', 'Sunday', 'holiday'],
    poorConditions: [
      'precipitation>5',           // slippery court, unsafe
      'windSpeed>13',              // disruptive to passing
      'temperature<5',             // uncomfortably cold
      'temperature>30',            // heat stress risk
      'visibility<2',              // fog or very poor light
      'snowfallRateMmH>0.5',       // light snowfall already slicks hardcourts
      'snowDepthCm>0.5',            // thin settled snow makes surfaces treacherous
      'gust>17'
    ],
    fairConditions: [
      'temperature=5..10 or 28..30', // chilly or hot but tolerable
      'windSpeed=9..13',            // breezy but playable
      'precipitation=2..5',          // damp but possible with caution
      'visibility=2..5',              // dull light, still visible
      'gust=13.6..17'
    ],
    goodConditions: [
      'temperature=10..28',          // broad acceptable range
      'windSpeed<9',
      'precipitation=0..2',
      'visibility>5',
      'gust<13.6'
    ],
    perfectConditions: [
      'temperature=18..22',          // mild & comfortable
      'windSpeed<5',
      'precipitation=0',
      'visibility>10',
      'gust<9.4'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Book an indoor court, practise drills, or join a local league training session'
  },
  {
    id: 'volleyball_indoor',
    name: 'Play Volleyball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: false,
    tags: ['sport','team','indoor','Saturday','Sunday','Wednesday']
  },
  {
    id: 'basketball_outdoor',
    name: 'Play Basketball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['exercise', 'sport', 'team', 'outdoor', 'social', 'Saturday', 'Sunday', 'holiday'],

    poorConditions: [
      'precipitation>1',      // slippery & unsafe
      'windSpeed>13',         // very disruptive to play (was 20)
      'temperature<5',        // too cold for comfort
      'temperature>30',       // risk of heat stress
      'visibility<2',         // fog/darkness
      'snowfallRateMmH>0.5',  // court surface turns slick fast
      'snowDepthCm>0.5',       // even light settling snow is unsafe underfoot
      'gust>17'
    ],

    fairConditions: [
      'precipitation=0.1..1',

      'temperature=5..12 or temperature=26..30',  // cool or hot but tolerable
      'windSpeed=9..13',                         // breezy but still playable (expanded range)
      'visibility=2..5',                          // hazy or low light conditions
      'clouds=70..100',                            // overcast but dry (fixed from cloudCover)
      'gust=13.6..17'
    ],

    goodConditions: [
      'temperature=12..26',   // comfortable for most
      'windSpeed<9',         // less windy (increased from 18)
      'visibility>5',
      'precipitation=0..0.1',      // a trace at most
      'gust<13.6'
    ],

    perfectConditions: [
      'temperature=18..22',   // mild & comfortable
      'windSpeed<5',         // calm conditions (increased from 10)
      'visibility>10',
      'precipitation=0',
      'gust<9.4'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Play at an indoor gym or practise shooting drills at home'
  },
  {
    id: 'beach_volleyball',
    name: 'Play Beach Volleyball',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'social', 'beach', 'outdoors', 'Saturday', 'Sunday', 'Friday'],

    perfectConditions: [
      'temperature=22..28',         // warm enough for bare feet, not scorching
      'windSpeed<3',                // minimal wind keeps the ball predictable
  'cloudCover=10..30',           // some sun, great beach vibes
  'precipitation=0',            // dry sand is essential
  'visibility>10',              // full visibility across court
  'waveHeight=0..0.6',           // gentle lapping, no rogue waves
      'gust<6.1'
    ],

    goodConditions: [
      'temperature=18..28',         // solid beach weather
      'windSpeed<5.5',               // light breeze is fine
      'cloudCover=0..60',            // sun or mild overcast
      'precipitation=0',            // still dry enough
      'visibility>5',               // good view of ball & surroundings
      'waveHeight<=0.9',
      'gust<8.8'
    ],

    fairConditions: [
      'temperature=12..18 or 28..32', // chilly or very hot, playable but not comfy
      'windSpeed=5.5..8',             // ball may drift, sand may blow
      'cloudCover=60..100',            // overcast or flat light
      'precipitation=0..5',           // light rain might dampen enthusiasm
      'visibility=2..5',             // misty or dull but not dangerous
      'waveHeight=0.9..1.2',
      'gust=8.8..11'
    ],

    poorConditions: [
      'temperature<12 or temperature>32', // unsafe or deeply unpleasant
      'windSpeed>8',                     // play becomes chaotic
      'precipitation>5',                  // wet sand & discomfort
      'visibility<2',                     // fog = no-go
      'waveHeight>1.2',                   // waves encroaching on court
      'snowfallRateMmH>0.5',              // snow makes footing slippery and visibility poor
      'snowDepthCm>0.5',                   // cold sand and hidden hazards
      'gust>11'
    ],       // peak summer activity

    indoorAlternative: 'Play indoor volleyball at a sports hall or practise drills at home'
  },
  {
    id: 'cricket',
    name: 'Play Cricket',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'bat-and-ball', 'Saturday', 'Sunday', 'holiday'],

    poorConditions: [
      'precipitation>1',       // light drizzle tolerated
      'windSpeed>8',          // too gusty
      'temperature<8',         // uncomfortably cold
      'temperature>30',        // oppressive heat
      'soilMoisture>50', // baked wicket or waterlogged outfield
      'visibility<2',          // bad light
      'snowfallRateMmH>1',     // snow showers kill visibility
      'snowDepthCm>1',          // covers wicket & outfield speed
      'gust>11'
    ],

    fairConditions: [
      'temperature=8..12 or 26..30',      // brisk morning matches
      'windSpeed=5.5..8',       // slightly gusty but playable
      'precipitation=0.5..1',   // occasional drizzle
      'soilMoisture=45..50', // dry wickets or soft patches
      'visibility=2..5',         // hazy light but not unsafe
      'gust=8.8..11'
    ],

    goodConditions: [
      'temperature=12..26',     // broad comfortable range
      'windSpeed<5.5',
      'precipitation=0..0.5',
      'soilMoisture=15..45',    // well-drained outfield
      'visibility>5',
      'gust<8.8'
    ],

    perfectConditions: [
      'temperature=20..25',
      'windSpeed<3',
      'precipitation=0',
      'soilMoisture=18..35',    // firm wicket & outfield
      'visibility>10',
      'gust<6.1'
    ],

    /* ECB: the County Championship ran 3 April - 27 September in 2026, and the
       National Club Championship "begins in April". May-September marked the
       whole of April out of season — the month people most want to know. */
    seasonalMonths: [4, 5, 6, 7, 8, 9],

    indoorAlternative: 'Watch match highlights, practise batting drills, or read cricket biographies'
  },
  {
    id: 'rugby',
    name: 'Play Rugby',
    category: 'Active Sports',
    secondaryCategory: 'Team Sports',
    weatherSensitive: true,
    tags: ['sport', 'team', 'contact', 'Saturday', 'Sunday', 'holiday'],

    poorConditions: [
      'precipitation>15',     // waterlogged pitch
      'windSpeed>15',         // dangerously gusty
      'temperature<0',        // freezing, icy
      'temperature>28',       // oppressive heat
      'soilMoisture>50', // rock-hard or boggy pitch
      'visibility<2',         // fog, unsafe
      'snowfallRateMmH>1',    // sustained snow kills visibility & ball handling
      'snowDepthCm>1',         // snow cover hides lines and studs lose traction
      'gust>20'
    ],

    fairConditions: [
      'temperature=0..5 or 24..28',       // cold but common in winter leagues
      'windSpeed=11..15',       // gusty but playable
      'precipitation=5..15',    // moderate rain, slippery pitch
      'soilMoisture=45..50', // baked patches or soft turf
      'visibility=2..5',         // hazy or low light
      'gust=16..20'
    ],

    goodConditions: [
      'temperature=5..24',      // tolerable range for most
      'windSpeed<11',
      'precipitation=0..5',
      'soilMoisture=15..45',    // firm footing with give
      'visibility>5',
      'gust<16'
    ],

    perfectConditions: [
      'temperature=12..18',
      'windSpeed<6',
      'precipitation=0',
      'soilMoisture=18..35',    // true bounce and traction
      'visibility>10',
      'gust<11'
    ],

    /* April added: the community game runs to late April, and the RFU
       Championship above it ran 20 September 2024 to 31 May 2025. Ending at
       March cut off a real month of rugby. */
    seasonalMonths: [9, 10, 11, 12, 1, 2, 3, 4],

    indoorAlternative: 'Hit the gym, practise drills indoors, or watch match footage'
  },
];

export default teamSports;