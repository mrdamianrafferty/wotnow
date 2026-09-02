import type { ActivityType } from './types';

export const waterSports: ActivityType[] = [
  {
    id: 'surfing',
    name: 'Go Surfing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['water', 'waves', 'leisure', 'ocean', 'outdoors', 'sport', 'adventure', 'Friday', 'Saturday', 'Sunday'],
    perfectConditions: [
      'waterTemperature=16..20',
      'airTemperature=18..24',
      'waveHeight=0.8..1.5',
      'swellPeriod=10..12',
      'windSpeed=5..10',
      'windRelative=offshore',
      'gust<8',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'waterTemperature=14..26',
      'airTemperature=12..28',
      'waveHeight=0.35..1.8',
      'swellPeriod=8..12',
      'windSpeed=5..15',
      'windRelative=offshore or windRelative=side-offshore & windSpeed<=12 or windRelative=cross-shore & windSpeed<=8 or windRelative=side-onshore & windSpeed<=10 & waveHeight<=1.0',
      'gust<12',
      'visibility>5'
    ],
    fairConditions: [
      'waterTemperature=12..14 or 26..28',
      'airTemperature=8..12 or 28..30',
      'waveHeight=0.25..0.5 or 1.8..2.5',
      'swellPeriod=6..8 or 12..14',
      'windSpeed=15..20',
      'windRelative=cross-shore & windSpeed=8..15 or windRelative=side-onshore & windSpeed<=12 or windRelative=onshore & windSpeed<=8 & swellPeriod>=10 & waveHeight<=1.2',
      'gust=12..18',
      'visibility=2..5',
      'precipitation=2..10'
    ],
    poorConditions: [
      'waterTemperature<12',
      'airTemperature<8 or airTemperature>32',
      'waveHeight<0.25 or waveHeight>2.5',
      'swellPeriod<6 or swellPeriod>14',
      'windSpeed>20',
      'windRelative=onshore & windSpeed>10 or windRelative=onshore & swellPeriod<8 or windRelative=onshore & waveHeight<0.3',
      'gust>18',
      'visibility<2',
      'precipitation>10',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Watch surf films or work on your pop-up at home'
  },
  {
    id: 'kayaking',
    name: 'Go Kayaking',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport', 'water', 'outdoors', 'adventure', 'Saturday', 'Sunday', 'holiday'],

    /**
     * ─── Re-cut for enclosed water, 2026-09 ──────────────────────────────
     *
     * POOR was `windSpeed>25` — 48 knots, a Force 9 severe gale. That is not a
     * threshold, it is the absence of one, and it is why this model read "Fair"
     * at Force 6 and only fell over when a separate wind table caught it.
     *
     * A recreational kayak on 3,000 acres with five kilometres of fetch is
     * committed once it leaves the bank: the wind that decides the day is the
     * wind you have to paddle home against, not the wind you set out in. Force 5
     * is a rescue-boat call on that water, so it is the stop.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<4',               // under 8 kn — genuinely easy water
      'gust<6',
      'visibility>10',
      'precipitation=0'
    ],

    goodConditions: [
      'temperature=10..24',
      'windSpeed<7',               // to about 14 kn, Force 4
      'gust<9',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'temperature=5..10 or 24..28',
      'windSpeed=7..10',           // Force 5 — hard work back upwind
      'gust=9..12',
      'precipitation=2..10',
      'visibility=2..5'
    ],

    poorConditions: [
      'temperature<5 or temperature>28',
      'windSpeed>10',              // Force 5 and above
      'gust>12',
      'precipitation>10',
      'visibility<2',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],

    indoorAlternative: 'Check your gear, practise strokes on a paddle machine, or plan your next trip'
  },
  {
    id: 'sea_kayaking',
    name: 'Go Sea Kayaking',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['sport', 'water', 'sea', 'coastal', 'outdoors', 'adventure', 'Saturday', 'Sunday', 'holiday'],

    perfectConditions: [
      'temperature=14..20',
      'windSpeed<10',
      'gust<8',
      'waveHeight<0.3',
      'visibility>10',
      'precipitation=0',
      'windRelative=cross-shore & windSpeed<10 or windRelative=onshore & windSpeed<8'
    ],

    goodConditions: [
      'temperature=10..24',
      'windSpeed<15',
      'gust<12',
      'waveHeight<0.6',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=cross-shore & windSpeed<=15 or windRelative=onshore & windSpeed<=12'
    ],

    fairConditions: [
      'temperature=5..10 or 24..28',
      'windSpeed=15..20',
      'gust=12..15',
      'waveHeight=0.6..1.0',
      'visibility=2..5',
      'precipitation=2..10',
      'windRelative=offshore & windSpeed<=6 & gust<=10 & waveHeight<0.4'
    ],

    poorConditions: [
      'temperature<5 or temperature>28',
      'windSpeed>20',
      'gust>15',
      'waveHeight>1.0',
      'visibility<2',
      'precipitation>10',
      'waterTemperature<12',
      'windRelative=offshore & windSpeed>10 or windRelative=offshore & gust>12',
      'windRelative=onshore & waveHeight>0.8',
      'windRelative=cross-shore & windSpeed>20',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Check your kit, practise rescues in a pool, or plan a coastal route'
  },
  {
    id: 'canoeing',
    name: 'Go Canoeing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','outdoors','Saturday','Sunday','holiday'],
    /**
     * ─── Re-cut for enclosed water, 2026-09 ──────────────────────────────
     *
     * Tighter than kayaking at every step, which the old numbers already had the
     * right instinct about and expressed an order of magnitude too loosely
     * (POOR at 18 m/s is 35 knots, a Force 8).
     *
     * An open canoe has the most freeboard and the least power of anything that
     * goes out from these centres: it is a sail with a paddler in it, and it
     * blows downwind faster than an average crew can paddle back. Force 4 is
     * where a hire boat should already be ashore.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    perfectConditions: [
      'temperature=15..22',
      'windSpeed<3',               // under 6 kn
      'gust<5',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'temperature=10..24',
      'windSpeed<5.5',             // to about 11 kn
      'gust<7',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'temperature=5..10 or 24..28',
      'windSpeed=5.5..8',          // upper Force 4 — for competent crews only
      'gust=7..10',
      'visibility=2..5',
      'precipitation=2..10'
    ],
    poorConditions: [
      'temperature<5 or temperature>28',
      'windSpeed>8',               // Force 5
      'gust>10',
      'visibility<2',
      'precipitation>10',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [4,5,6,7,8,9,10]
  },
  {
    id: 'stand_up_paddleboarding',
    name: 'Go Paddleboarding',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','outdoors','inland','Saturday','Sunday','holiday'],
    /**
     * ─── Re-cut for enclosed water, 2026-09 ──────────────────────────────
     *
     * The highest windage and the lowest power of anything on these waters: a
     * standing paddler is a sail, and the board underneath has no keel to
     * resist it. POOR was 10 m/s — 19 knots, a Force 5 — which is well past the
     * point a beginner stops making ground upwind.
     *
     * The dominant incident pattern in open-water paddleboarding is not being
     * capsized, it is being blown away from the bank and not being able to
     * return, which makes wind DIRECTION the number that matters most and which
     * nothing in this engine currently reads. That is a real limitation and is
     * why these thresholds are set conservatively: they are standing in for a
     * test we cannot yet make.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    perfectConditions: [
      'temperature=16..24',
      'windSpeed<3',               // under 6 kn — glassy
      'gust<4.5',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'temperature=10..26',
      'windSpeed<5',               // to about 10 kn, Force 3
      'gust<7',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'temperature=5..10 or 26..30',
      'windSpeed=5..7',            // Force 4 — competent paddlers, close in
      'gust=7..9',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'temperature<5 or temperature>30',
      'windSpeed>7',               // upper Force 4 and beyond
      'gust>9',
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [4,5,6,7,8,9,10]
  },
  {
    id: 'snorkeling',
    name: 'Go Snorkelling',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['water', 'swimming', 'adventure', 'leisure', 'nature', 'sea', 'coastal', 'Saturday', 'Sunday', 'holiday'],

    // Safety-first: avoid offshore winds unless extremely light and in tiny surf; keep waves small; cap gusts; watch for heavy rain (murk)
    poorConditions: [
      'waterTemperature<17',            // uncomfortably cold for most casual snorkellers
      'windSpeed>18',                   // choppy & unsafe (whitecaps likely)
      'gust>16',                        // unpredictable surface disturbance
      'waveHeight>1',                   // hard to breathe & see in the break zone
      'precipitation>6',                // heavy rain reduces water clarity & surface safety
      'visibility<2',                   // foggy, unsafe for navigation/spotters
      // Directional hazards
      'windRelative=offshore & windSpeed>6 or windRelative=offshore & gust>8',
      'windRelative=onshore & waveHeight>0.6',
      'windRelative=cross-shore & windSpeed>14',
      'snowfallRateMmH>0.5',           // airborne snow slashes visibility fast
      'snowDepthCm>0.5'                // launch points quickly become icy
    ],

    fairConditions: [
      'waterTemperature=17..19',        // brisk but tolerable with suitable gear
      'windSpeed=10..16',
      'gust=10..14',
      'waveHeight=0.3..0.8',
      'cloudCover=60..90',
      'visibility=2..5',
      'precipitation=2..6',
      // Directional allowances (only if very light and waves are tiny)
      'windRelative=offshore & windSpeed<=5 & gust<=8 & waveHeight<0.3',
      'windRelative=onshore & windSpeed<=10 & waveHeight<=0.5',
      'windRelative=cross-shore & windSpeed<=12'
    ],

    goodConditions: [
      'waterTemperature=20..28',
      'windSpeed<10',
      'gust<=10',
      'waveHeight<0.5',
      'cloudCover=0..60',
      'visibility>5',
      'precipitation=0..2',
      // Prefer cross-shore or very light onshore; avoid offshore in exposed areas
      'windRelative=cross-shore & windSpeed<=10 or windRelative=onshore & windSpeed<=8'
    ],

    perfectConditions: [
      'waterTemperature=22..26',
      'windSpeed<6',
      'gust<6',
      'waveHeight<0.3',
      'cloudCover=10..40',
      'visibility>10',
      'precipitation=0',
      // Flat, clear, and safe directions (no offshore)
      'windRelative=cross-shore & windSpeed<6 or windRelative=onshore & windSpeed<5'
    ],

    seasonalMonths: [5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Practise breath-holding techniques, research marine life, or plan your next beach trip'
  },
  {
    id: 'jet_skiing',
    name: 'Go Jet Skiing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['water', 'motorised', 'adventure', 'speed', 'sea', 'coastal', 'Saturday', 'Sunday', 'holiday'],

    poorConditions: [
      'waterTemperature<14',           // cold spray & hypothermia risk
      'airTemperature<12 or airTemperature>32',
      'windSpeed>22',                  // strong winds create chop
      'gust>25',                       // erratic gusts destabilise riders
      'waveHeight>1.5',                // large chop/waves risky for PWC
      'visibility<2',                  // tough to spot hazards or other craft
      'precipitation>8',               // heavy rain reduces visibility & control
      'windRelative=offshore & windSpeed>12',
      'windRelative=onshore & waveHeight>1.2',
      'snowfallRateMmH>0.5',          // snow squalls devastate sightlines
      'snowDepthCm>0.5'               // ramps/paths icy for launching
    ],

    fairConditions: [
      'waterTemperature=14..18',
      'airTemperature=12..16 or airTemperature=28..32',
      'windSpeed=15..22',
      'gust=18..25',
      'waveHeight=1.0..1.5',
      'visibility=2..5',
      'precipitation=2..8',
      'windRelative=cross-shore & windSpeed<=18',
      'windRelative=offshore & windSpeed<=12 & waveHeight<=0.8'
    ],

    goodConditions: [
      'waterTemperature=18..26',
      'airTemperature=18..28',
      'windSpeed<15',
      'gust<=18',
      'waveHeight<1.0',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=cross-shore & windSpeed<=12 or windRelative=onshore & windSpeed<=10'
    ],

    perfectConditions: [
      'waterTemperature=20..24',
      'airTemperature=20..26',
      'windSpeed<10',
      'gust<12',
      'waveHeight<0.6',
      'visibility>10',
      'precipitation=0',
      'windRelative=cross-shore & windSpeed<10 or windRelative=onshore & windSpeed<8'
    ],

    seasonalMonths: [4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Book a session on a jet-ski simulator, plan routes, or watch safety refreshers'
  },
  {
    id: 'wild_swimming',
    name: 'Go Wild Swimming',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','outdoors','inland','nature','Saturday','Sunday','holiday'],
    /**
     * ─── The one that was actually dangerous, fixed 2026-09 ──────────────
     *
     * These bands were not wrong. They were INVISIBLE. Every criterion below is
     * written in `waterTemperature` or `airTemperature`, and the inland
     * forecast pipeline supplied neither — it supplied `temperature`. A key the
     * weather object does not carry is dropped rather than scored, so the entire
     * thermal half of this model evaluated to nothing and what remained was
     * wind plus a fabricated visibility constant.
     *
     * Measured before the fix: 95 out of 100, band "perfect", sentence "Perfect
     * conditions for Go Wild Swimming!", on a 3 °C January day. Rendered through
     * the Anglian demo's vocabulary that is a tile reading "Swimming — Peak" at
     * Rutland in February.
     *
     * Two things fixed it and neither is in this file: `airTemperature` is now
     * supplied as an alias of `temperature`, and `seasonalMonths` is now applied
     * to the score instead of being logged. What IS in this file is the thermal
     * ladder, tightened to the numbers open-water swimming actually uses:
     *
     *   below 10 °C   cold-water shock and swim failure dominate incidents
     *   10–15 °C      "cold water" — acclimatised swimmers, short dips
     *   15–17 °C      swimmable with care
     *   17–22 °C      what a supervised UK session runs in
     *
     * ⚠️ `waterTemperature` STILL has no inland source, so on a reservoir this
     * model is scored on air temperature and season alone. Air is a poor proxy
     * — a reservoir lags it by weeks, and is coldest in the spring exactly when
     * the air first feels warm. A consumer showing this score MUST also gate on
     * the venue's own supervised season, and RiseDaisy already holds a
     * per-water `waterTempC` for its fishing engine that belongs here.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    perfectConditions: [
      'waterTemperature=17..22',
      'airTemperature=18..26',
      'windSpeed<4',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'waterTemperature=15..24',
      'airTemperature=15..28',
      'windSpeed<6',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'waterTemperature=10..15 or 24..26',
      'airTemperature=11..15 or 28..30',
      'windSpeed=6..8',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'waterTemperature<10',       // cold-water shock territory
      'airTemperature<11 or airTemperature>30',
      'windSpeed>8',
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [5,6,7,8,9]
  },
  {
    id: 'sea_swimming',
    name: 'Go Sea Swimming',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['sport','water','sea','coastal','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=16..22',
      'airTemperature=18..24',
      'windSpeed<8',
      'gust<10',
      'waveHeight<0.4',
      'visibility>10',
      'precipitation=0',
      'windRelative=onshore & windSpeed<6 or windRelative=cross-shore & windSpeed<8'
    ],
    goodConditions: [
      'waterTemperature=14..24',
      'airTemperature=14..28',
      'windSpeed<12',
      'gust<14',
      'waveHeight<0.6',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=onshore & windSpeed<=8 or windRelative=cross-shore & windSpeed<=12 or windRelative=side-onshore & windSpeed<=10'
    ],
    fairConditions: [
      'waterTemperature=12..14 or 24..28',
      'airTemperature=10..14 or 28..30',
      'windSpeed=12..15',
      'gust=14..18',
      'waveHeight=0.6..0.8',
      'visibility=2..5',
      'precipitation=2..5',
      'windRelative=offshore & windSpeed<=5 & gust<=8 & waveHeight<0.4'
    ],
    poorConditions: [
      'waterTemperature<12',
      'airTemperature<10 or airTemperature>30',
      'windSpeed>15',
      'gust>18',
      'waveHeight>0.8',
      'visibility<2',
      'precipitation>5',
      'windRelative=offshore & windSpeed>6',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [5,6,7,8,9,10]
  },
  {
    id: 'indoor_swimming',
    name: 'Go Swimming (Indoor)',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: false,
    tags: ['sport','water','indoor','fitness','year-round']
  },
  {
    id: 'sailing',
    name: 'Go Sailing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','sea','coastal','boat','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'airTemperature=14..22',
      'windSpeed=8..15',
      'gust<18',
      'waveHeight<1.0',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'airTemperature=10..26',
      'windSpeed=6..20',
      'gust<24',
      'waveHeight<1.5',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'airTemperature=5..10 or 26..30',
      'windSpeed=4..6 or 20..25',
      'gust=24..30',
      'waveHeight=1.5..2.2',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'airTemperature<5 or airTemperature>30',
      'windSpeed<4 or windSpeed>25',
      'gust>30',
      'waveHeight>2.2',
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [4,5,6,7,8,9,10],
    indoorAlternative: 'Study charts, practise knots, or plan a passage'
  },
  {
    id: 'sailing_inland',
    name: 'Go Sailing (Inland)',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    applyBeaufort: true,
    tags: ['sport','water','inland','lake','dinghy','outdoors','Saturday','Sunday','holiday'],
    /**
     * ─── Re-cut against inland club practice, 2026-09 ────────────────────
     *
     * The old numbers put PERFECT at 6–12 m/s, which is 12–23 knots, Force 4 to
     * Force 6 — and POOR only above 20 m/s, which is 39 knots, a Force 8 gale.
     * Measured against them, this model scored 62 and "Good weather" at Force 6
     * on a reservoir whose own keeper takes the boats off at Force 6. Those
     * read like figures written in km/h and never converted; nothing else
     * explains a dinghy model tolerating a gale.
     *
     * The ladder now is the one a reservoir sailing club actually runs:
     *
     *   Force 2–4   ordinary club sailing, and Force 3–4 is the good day
     *   Force 5     experienced hands, depowered — fair, not good
     *   Force 6     stop. Not "challenging"; ashore.
     *   Force 1     drifting. Fair at best, and poor below it.
     *
     * Force 6 begins at 39 km/h, so the hard stop is 10.8 m/s. That is the same
     * line RiseDaisy's data/demo/anglian-thresholds.json already draws as
     * `boatsOffForce: 6` for Rutland and Grafham — the engine and the keeper now
     * agree, which they did not before.
     *
     * Gusts are the addition that matters most and were previously specified
     * here and never supplied to the scorer at all. On enclosed water the gust
     * spread is what capsizes a dinghy: measured at Rutland on 2026-09-04, a
     * Force 4 mean carried Force 7 gusts. 14 m/s is Force 7, which is where a
     * gust alone ends the day whatever the mean is doing.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    perfectConditions: [
      'temperature=14..24',
      'windSpeed=4..7',            // Force 3–4, 8–14 kn — the club day
      'gust<9',                    // spread stays inside Force 5
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'temperature=10..26',
      'windSpeed=1.7..8',          // all of Force 2 to the top of Force 4
      'gust<11',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'temperature=5..10 or 26..30',
      'windSpeed=0.5..1.7 or 8..10.8',  // Force 1 drifting, or Force 5 for experienced hands
      'gust=11..14',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'temperature<5 or temperature>30',
      /* Only a genuine flat calm counts as too little. Force 1 is drifting and
         Force 2 is a lesson — neither is nothing, and the centres these models
         describe teach in exactly that. Below Force 1 there is no sailing. */
      'windSpeed<0.5 or windSpeed>10.8',  // Force 6 is the stop
      'gust>14',                          // a Force 7 gust ends it on the mean alone
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [3,4,5,6,7,8,9,10],
    indoorAlternative: 'Knot practice, rules revision, or simulator'
  },
  {
    id: 'windsurfing',
    name: 'Go Windsurfing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['sport','water','sea','coastal','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=14..24',
      'airTemperature=12..26',
      'windSpeed=12..20',
      'gust<25',
      'waveHeight=0.5..1.5',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=cross-shore & windSpeed=12..20 or windRelative=side-onshore & windSpeed=12..20'
    ],
    goodConditions: [
      'waterTemperature=12..26',
      'airTemperature=10..28',
      'windSpeed=10..25',
      'gust<30',
      'waveHeight=0.3..2.0',
      'visibility>5',
      'precipitation=0..4',
      'windRelative=cross-shore & windSpeed=10..25 or windRelative=side-onshore & windSpeed=10..22 or windRelative=onshore & windSpeed<=18 & waveHeight<=1.2 or windRelative=side-offshore & windSpeed<=18 & waveHeight<0.6'
    ],
    fairConditions: [
      'waterTemperature=10..12 or 26..28',
      'airTemperature=8..10 or 28..30',
      'windSpeed=8..10 or 25..30',
      'gust=30..35',
      'waveHeight=0.2..0.3 or 2.0..2.5',
      'visibility=2..5',
      'precipitation=4..8',
      'windRelative=onshore & windSpeed<=22 & waveHeight<=1.5 or windRelative=offshore & windSpeed<=6 & waveHeight<0.4'
    ],
    poorConditions: [
      'waterTemperature<10',
      'airTemperature<8 or airTemperature>32',
      'windSpeed<8 or windSpeed>30',
      'gust>35',
      'waveHeight>2.5',
      'visibility<2',
      'precipitation>8',
      'windRelative=offshore & windSpeed>6',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [4,5,6,7,8,9,10],
    indoorAlternative: 'Rig tuning, fitness, or watch technique videos'
  },
  {
    id: 'kitesurfing',
    name: 'Go Kitesurfing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['sport','water','sea','coastal','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=16..24',
      'airTemperature=14..26',
      'windSpeed=14..22',
      'gust<28',
      'waveHeight=0.5..1.8',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=cross-shore & windSpeed=14..22 or windRelative=side-onshore & windSpeed=14..22'
    ],
    goodConditions: [
      'waterTemperature=12..26',
      'airTemperature=10..28',
      'windSpeed=12..26',
      'gust<32',
      'waveHeight=0.3..2.2',
      'visibility>5',
      'precipitation=0..4',
      'windRelative=cross-shore & windSpeed=12..26 or windRelative=side-onshore & windSpeed=12..24 or windRelative=onshore & windSpeed<=18 & waveHeight<=1.2'
    ],
    fairConditions: [
      'waterTemperature=10..12 or 26..28',
      'airTemperature=8..10 or 28..30',
      'windSpeed=10..12 or 26..30',
      'gust=32..36',
      'waveHeight=0.2..0.3 or 2.2..2.5',
      'visibility=2..5',
      'precipitation=4..8',
      'windRelative=onshore & windSpeed<=20 & waveHeight<=1.5 or windRelative=offshore & windSpeed<=6 & waveHeight<0.4'
    ],
    poorConditions: [
      'waterTemperature<10',
      'airTemperature<8 or airTemperature>32',
      'windSpeed<10 or windSpeed>30',
      'gust>36',
      'waveHeight>2.5',
      'visibility<2',
      'precipitation>8',
      'windRelative=offshore & windSpeed>6',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [4,5,6,7,8,9,10],
    indoorAlternative: 'Kite maintenance, line tuning, or strength & mobility'
  },
  {
    id: 'scuba_diving',
    name: 'Go Scuba Diving',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','sea','coastal','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=14..24',
      'airTemperature=12..26',
      'windSpeed<10',
      'gust<12',
      'waveHeight<0.6',
      'swellPeriod=8..14',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'waterTemperature=12..26',
      'airTemperature=10..28',
      'windSpeed<15',
      'gust<18',
      'waveHeight<1.0',
      'swellPeriod=6..14',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'waterTemperature=10..12 or 26..28',
      'airTemperature=8..10 or 28..30',
      'windSpeed=15..20',
      'gust=18..22',
      'waveHeight=1.0..1.5',
      'swellPeriod=5..8',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'waterTemperature<10',
      'airTemperature<8 or airTemperature>32',
      'windSpeed>20',
      'gust>22',
      'waveHeight>1.5',
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [5,6,7,8,9,10],
    indoorAlternative: 'Pool skills, gear maintenance, or dive planning'
  },
  {
    id: 'jetskiing',
    name: 'Go Jet Skiing',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    tags: ['sport','water','sea','coastal','outdoors','motor','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=16..26',
      'airTemperature=18..28',
      'windSpeed<10',
      'gust<12',
      'waveHeight<0.8',
      'visibility>10',
      'precipitation=0'
    ],
    goodConditions: [
      'waterTemperature=14..28',
      'airTemperature=14..30',
      'windSpeed<15',
      'gust<18',
      'waveHeight<1.2',
      'visibility>5',
      'precipitation=0..2'
    ],
    fairConditions: [
      'waterTemperature=12..14 or 28..30',
      'airTemperature=10..14 or 30..32',
      'windSpeed=15..20',
      'gust=18..22',
      'waveHeight=1.2..1.8',
      'visibility=2..5',
      'precipitation=2..5'
    ],
    poorConditions: [
      'waterTemperature<12',
      'airTemperature<10 or airTemperature>32',
      'windSpeed>20',
      'gust>22',
      'waveHeight>1.8',
      'visibility<2',
      'precipitation>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [5,6,7,8,9],
    indoorAlternative: 'Maintenance, safety review, or route planning'
  },
  {
    id: 'sup_sea',
    name: 'Go Paddleboarding (Sea)',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: true,
    requiresBeachOrientation: true,
    tags: ['sport','water','sea','coastal','outdoors','Saturday','Sunday','holiday'],
    perfectConditions: [
      'waterTemperature=16..24',
      'airTemperature=18..26',
      'windSpeed<6',
      'gust<8',
      'waveHeight<0.3',
      'visibility>10',
      'precipitation=0',
      'windRelative=onshore & windSpeed<6 or windRelative=cross-shore & windSpeed<6'
    ],
    goodConditions: [
      'waterTemperature=14..26',
      'airTemperature=14..28',
      'windSpeed<10',
      'gust<12',
      'waveHeight<0.5',
      'visibility>5',
      'precipitation=0..2',
      'windRelative=onshore & windSpeed<=8 or windRelative=cross-shore & windSpeed<=10 or windRelative=side-onshore & windSpeed<=8'
    ],
    fairConditions: [
      'waterTemperature=12..14 or 26..28',
      'airTemperature=10..14 or 28..30',
      'windSpeed=10..12',
      'gust=12..15',
      'waveHeight=0.5..0.7',
      'visibility=2..5',
      'precipitation=2..5',
      'windRelative=offshore & windSpeed<=5 & gust<=8 & waveHeight<0.4'
    ],
    poorConditions: [
      'waterTemperature<12',
      'airTemperature<10 or airTemperature>30',
      'windSpeed>12',
      'gust>15',
      'waveHeight>0.7',
      'visibility<2',
      'precipitation>5',
      'windRelative=offshore & windSpeed>5',
      'snowfallRateMmH>0.5',
      'snowDepthCm>0.5'
    ],
    seasonalMonths: [5,6,7,8,9],
    indoorAlternative: 'Practise balance drills, repair kit, or plan a route'
  },
  {
    id: 'windsurfing_inland',
    name: 'Go Windsurfing (Inland)',
    category: 'Active Sports',
    secondaryCategory: 'Water Sports',
    weatherSensitive: true,
    usesWindRelative: false,            // direction relative to a shoreline not required for lakes
    requiresBeachOrientation: false,
    tags: ['water', 'wind', 'lake', 'reservoir', 'flatwater', 'Saturday', 'Sunday', 'holiday'],
    /**
     * ─── Re-cut against inland club practice, 2026-09 ────────────────────
     *
     * These were the closest to right in the library — the comments below were
     * written by somebody who sails, and 12 knots for planing is the correct
     * number — but the ladder had a hole in it and no top.
     *
     * The hole: GOOD stopped at 14 m/s and FAIR resumed at 16, so 14–16 m/s
     * (27–31 knots) matched no band at all and fell through to the neutral
     * fallback. That is why this model measured 70 and "Good weather" at Force 7.
     * A near gale reading as a good day is the single worst output the engine
     * produced, and it was a gap between two ranges rather than a bad judgement.
     *
     * The top: POOR began at 20 m/s, a Force 8 gale.
     *
     * Both are now cut to the same ladder as `sailing_inland`, because these are
     * the same water on the same day under the same safety-boat cover:
     *
     *   below Force 3   not enough to plane, and not enough to get back
     *   Force 3–4       the good sailing, planing for most recreational rigs
     *   Force 5         experienced riders only — fair, not good
     *   Force 6         stop
     *
     * A windsurfer will tell you Force 6 is when it gets interesting, and on the
     * open coast they are right. This is a reservoir with a rescue boat and a
     * shoreline on every side; the operator's limit is the limit.
     */
    /**
     * ─── No waveHeight, deliberately ─────────────────────────────────────
     *
     * Removed 2026-09 after measuring it rather than assuming it. On enclosed
     * water there is no swell: every wave is local wind-sea, so significant
     * wave height is a function of wind, fetch and depth and carries no
     * information the wind criteria do not already carry.
     *
     * Computed from the reservoirs' own OSM outlines (SMB fetch-limited,
     * shallow-water form) with Rutland's longest fetch of 4.5 km:
     *
     *     Force 3  Hs 0.17 m     Force 5  Hs 0.42 m     Force 7  Hs 0.74 m
     *     Force 4  Hs 0.28 m     Force 6  Hs 0.56 m
     *
     * Two consequences, and they point the same way. The POOR wave thresholds
     * these models carried were unreachable: 0.9 m needs a Force 8 and the wind
     * stop is Force 6, so that line could never fire. And where a wave
     * threshold WAS inside the live range, it was a restatement of the wind —
     * so supplying it would have made the band mean count wind twice and
     * quietly doubled its weight against temperature and rain.
     *
     * Direction is the one thing waves could have added, since fetch varies
     * about 1.8x across the compass here. It is not enough: at Force 5 that is
     * 0.42 m down Rutland's long axis against 0.33 m across it, a difference
     * smaller than the gap between any two thresholds. What direction DOES
     * change on these waters is whether the wind blows you off the bank, which
     * is a different question and not one wave height answers.
     *
     * The coastal models keep theirs, and should: swell travels, so out there
     * wave height is genuinely independent of the local wind.
     */
    poorConditions: [
      /* Force 2 is where a beginner can uphaul, balance and get back. Below it
         there is no return leg, which is the reason this is a poor condition at
         all — not that it would be dull. */
      'windSpeed<1.7',                  // below Force 2: no way home
      'windSpeed>10.8',                 // Force 6 — the stop
      'gust>14',                        // a Force 7 gust ends it whatever the mean does
      'precipitation>6',                // heavy rain reduces visibility
      'temperature<8',                  // cold air without good gear
      'temperature>32',                 // heat stress
      'visibility<2',                   // fog, low contrast
      'snowfallRateMmH>0.5',            // snowfall hides horizon and gear
      'snowDepthCm>0.5'                 // beach ramps & rigs buried quickly
    ],
    fairConditions: [
      /* One entry, OR'd — not two. Two array entries on the same key are scored
         as two independent criteria and averaged, so satisfying either one
         guarantees failing the other and halves the band's mean. That is why a
         Force 2 could not reach the fair band it was written for. */
      'windSpeed=1.7..4.5 or 8..10.8',  // tuition and schlogging, or Force 5 for experienced riders
      'gust=11..14',
      'temperature=8..12 or temperature=28..32',
      'precipitation=1..6',
      'visibility=2..5'
    ],
    goodConditions: [
      'windSpeed=4.5..8',               // planing likely for many set-ups
      'gust<11',
      'temperature=12..28',
      'precipitation<=2',
      'visibility>5'
    ],
    perfectConditions: [
      'windSpeed=5.5..8',               // Force 4 — steady, forgiving, planing
      'gust<9',
      'temperature=16..26',
      'precipitation=0',
      'visibility>10'
    ],
    seasonalMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    indoorAlternative: 'Practise balance, study technique videos, or maintain your gear'
  },
];
