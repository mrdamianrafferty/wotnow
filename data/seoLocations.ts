/**
 * SEO location dataset — every place that gets a programmatic page generated
 * at /[activity]/[location-slug].
 *
 * Coverage:
 *   - All 44 European capital cities
 *   - Top 50 North American cities by population (US, Canada, Mexico mixed)
 *   - Hand-picked Asturias, UK surf and mountain locations
 *
 * Page count: ~100 locations × curated activities per location = ~2,000 pages.
 *
 * Activities per location are curated by archetype below. A "surf city" gets
 * surfing in its list; Madrid does not. This is the single most important
 * lever for keeping these pages high-quality — generating "/surfing/madrid"
 * because we *could* would invite a doorway-page penalty.
 *
 * To add a location: append to the cities array at the bottom of this file.
 * To change which activities a city covers: edit its `activities` array
 * (or change the archetype it composes from).
 */

// ============================================================================
// Activity archetypes — sets of activity IDs grouped by what kind of place
// would plausibly do them. A city composes its activity list from one or
// more of these, plus any explicit additions/removals.
// ============================================================================

/** Things you can do in any walkable city, anywhere with weather. */
const UNIVERSAL = [
  'running',
  'cycling',
  'urban_exploring',
  'photography',
  'outdoor_yoga',
  'outdoor_meditation',
  'yoga',
  'meditation',
  'pilates',
  'gym_workout',
  'tai_chi',
  'padel',
  'tennis',
  'tennis_indoor',
  'pickleball',
  'basketball_outdoor',
  'table_tennis',
  'badminton',
  'squash',
  'going_to_pub',
  'cafe',
  'cinema',
  'museum',
  'gallery',
  'shopping',
  'bowling',
  'dance',
  'reading',
  'outdoor_reading',
  'picnicking',
  'bbq',
  'dog_walking',
  'outdoor_painting',
  'outdoor_chess',
  'outdoor_music',
];

/** Coastal additions — open ocean or large saltwater bay nearby. */
const COASTAL = [
  'surfing',
  'sea_swimming',
  'sea_kayaking',
  'stand_up_paddleboarding',
  'sup_sea',
  'sailing',
  'snorkeling',
  'scuba_diving',
  'windsurfing',
  'kitesurfing',
  'jet_skiing',
  'sea_fishing_shore',
  'sea_fishing_boat',
  'beach',
  'beach_volleyball',
  'rock_hopping',
];

/** Coastal additions for places where the surf isn't great but the sea is usable. */
const COASTAL_NO_SURF = COASTAL.filter((a) => a !== 'surfing');

/** Inland water — rivers, lakes, reservoirs. */
const INLAND_WATER = [
  'kayaking',
  'canoeing',
  'sailing_inland',
  'windsurfing_inland',
  'wild_swimming',
  'indoor_swimming',
  'fly_fishing_freshwater',
  'coarse_fishing',
];

/** Hills, mountains and trails nearby. */
const MOUNTAINOUS = [
  'hiking',
  'trail_running',
  'rock_climbing',
  'rock_hopping',
  'mountain_biking',
  'gravel_biking',
  'birdwatching',
  'foraging',
  'mushroom_hunting',
  'stargazing',
];

/** Cold-climate winter sports zone (Alps, Pyrenees, Scandinavia, mountain US). */
const WINTER_SPORTS = [
  'skiing',
  'snowboarding',
  'cross_country_skiing',
  'ice_skating',
  'ice_hockey',
  'ice_hockey_indoor',
  'ice_fishing',
];

/** Indoor / weather-bad-day fallbacks (always include — every city has these). */
const INDOOR_ALWAYS = [
  'crafts',
  'knitting',
  'diy',
  'cooking',
  'playing_records',
  'make_music',
  'gaming',
  'online',
  'playing_cards',
  'watch_a_movie',
  'painting',
  'indoor_climbing',
  'indoor_swimming',
  'volleyball_indoor',
  'archery',
  'boxing',
  'spinning',
  'zumba',
  'martial_arts',
];

/** Garden / outdoor-domestic activities (most cities have them). */
const GARDEN = ['outdoor_gardening'];

/** Major outdoor team sports — typically scored for outdoor pitches. */
const TEAM_SPORTS_GLOBAL = [
  'football_soccer',
  'rugby',
  'cricket',
  'hockey',
  'netball',
  'beach_volleyball',
];

/** Team sports skewed to the US market. */
const TEAM_SPORTS_US = [
  'american_football',
  'baseball',
  'basketball_outdoor',
];

/** Team sports for Ireland. */
const TEAM_SPORTS_IRELAND = ['hurling_camogie', 'gaelic_football'];

/** Convenience to dedupe an activity list while preserving order. */
function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/** Archetype: inland European city — no surfing, no winter sports. */
function inlandEuropean(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...INLAND_WATER,
    ...MOUNTAINOUS.filter((a) =>
      ['hiking', 'birdwatching', 'foraging', 'stargazing'].includes(a)
    ),
    ...TEAM_SPORTS_GLOBAL,
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

/** Archetype: coastal European city — saltwater + city stuff. */
function coastalEuropean(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...COASTAL,
    ...INLAND_WATER,
    ...TEAM_SPORTS_GLOBAL,
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

/** Archetype: coastal European city without proper surf (e.g. Med, Baltic). */
function coastalEuropeanNoSurf(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...COASTAL_NO_SURF,
    ...INLAND_WATER,
    ...TEAM_SPORTS_GLOBAL,
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

/** Archetype: Alpine / mountain city — winter sports active. */
function alpineCity(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...INLAND_WATER,
    ...MOUNTAINOUS,
    ...WINTER_SPORTS,
    ...TEAM_SPORTS_GLOBAL,
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

/** Archetype: inland US city — adds American team sports. */
function inlandUS(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...INLAND_WATER,
    ...MOUNTAINOUS.filter((a) =>
      ['hiking', 'birdwatching', 'foraging', 'stargazing'].includes(a)
    ),
    ...TEAM_SPORTS_US,
    ...TEAM_SPORTS_GLOBAL.filter((a) => a !== 'cricket' && a !== 'netball'),
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

/** Archetype: coastal US city. */
function coastalUS(extra: string[] = []): string[] {
  return dedupe([
    ...UNIVERSAL,
    ...COASTAL,
    ...INLAND_WATER,
    ...TEAM_SPORTS_US,
    ...TEAM_SPORTS_GLOBAL.filter((a) => a !== 'cricket' && a !== 'netball'),
    ...INDOOR_ALWAYS,
    ...GARDEN,
    ...extra,
  ]);
}

// ============================================================================
// Location type
// ============================================================================

export interface SeoLocation {
  slug: string;
  name: string;
  region: string;
  country: string;
  lat: number;
  lon: number;
  timezone: string;
  activities: string[];
  beachFacingDeg?: number | null;
  description?: string;
}

// ============================================================================
// The cities
// ============================================================================

export const SEO_LOCATIONS: SeoLocation[] = [
  // ===========================================================================
  // ASTURIAS, SPAIN — local market, low competition
  // ===========================================================================
  {
    slug: 'llanes-asturias',
    name: 'Llanes',
    region: 'Asturias',
    country: 'Spain',
    lat: 43.4198,
    lon: -4.7541,
    timezone: 'Europe/Madrid',
    activities: coastalEuropean(['fly_fishing_freshwater']),
    beachFacingDeg: 0,
    description:
      'Llanes sits on the Asturian coast where limestone sea cliffs, sheltered coves and Atlantic surf beaches are within a ten-minute drive of each other.',
  },
  {
    slug: 'tapia-de-casariego-asturias',
    name: 'Tapia de Casariego',
    region: 'Asturias',
    country: 'Spain',
    lat: 43.5667,
    lon: -6.9442,
    timezone: 'Europe/Madrid',
    activities: coastalEuropean(),
    beachFacingDeg: 350,
    description:
      'Tapia is the surf capital of the Asturian west coast — host of the long-running Tapia Pro and an Atlantic-facing reef that picks up almost any swell from the north or west.',
  },
  {
    slug: 'salinas-asturias',
    name: 'Salinas',
    region: 'Asturias',
    country: 'Spain',
    lat: 43.5786,
    lon: -5.9614,
    timezone: 'Europe/Madrid',
    activities: coastalEuropean(),
    beachFacingDeg: 5,
    description:
      'Salinas is the long, sandy beach above Avilés — a forgiving wave for intermediates and the home of the Salinas Longboard Festival.',
  },
  {
    slug: 'picos-de-europa',
    name: 'Picos de Europa',
    region: 'Asturias',
    country: 'Spain',
    lat: 43.1944,
    lon: -4.8500,
    timezone: 'Europe/Madrid',
    activities: alpineCity(),
    description:
      'One of the wildest mountain ranges in Western Europe — limestone peaks that touch 2,600m within 15km of the Atlantic, creating their own weather.',
  },

  // ===========================================================================
  // UK SURF, COAST, AND HILLS
  // ===========================================================================
  {
    slug: 'newquay-cornwall',
    name: 'Newquay',
    region: 'Cornwall',
    country: 'United Kingdom',
    lat: 50.4156,
    lon: -5.0750,
    timezone: 'Europe/London',
    activities: coastalEuropean(),
    beachFacingDeg: 310,
    description:
      'The UK\'s best-known surf town — Fistral picks up almost every Atlantic swell, with a range of bays inside Newquay for less exposed conditions.',
  },
  {
    slug: 'brighton-sussex',
    name: 'Brighton',
    region: 'East Sussex',
    country: 'United Kingdom',
    lat: 50.8225,
    lon: -0.1372,
    timezone: 'Europe/London',
    activities: coastalEuropeanNoSurf(),
    beachFacingDeg: 180,
    description:
      'South-facing pebble beach, Channel swell, a year-round wild swimming community, and a train line from London.',
  },
  {
    slug: 'tynemouth-northumberland',
    name: 'Tynemouth',
    region: 'Northumberland',
    country: 'United Kingdom',
    lat: 55.0174,
    lon: -1.4244,
    timezone: 'Europe/London',
    activities: coastalEuropean(),
    beachFacingDeg: 65,
    description:
      'Longsands is the North-East\'s biggest surf beach — east-facing, exposed to North Sea swells, and home to one of the UK\'s most committed cold-water surfing communities.',
  },
  {
    slug: 'lake-district-cumbria',
    name: 'Lake District',
    region: 'Cumbria',
    country: 'United Kingdom',
    lat: 54.4609,
    lon: -3.0886,
    timezone: 'Europe/London',
    activities: alpineCity().filter((a) => a !== 'skiing' && a !== 'snowboarding' && a !== 'cross_country_skiing'),
    description:
      'England\'s deepest lakes, highest mountains, and most variable weather. A morning of perfect light can turn to a Lakeland deluge by lunchtime.',
  },
  {
    slug: 'snowdonia-eryri',
    name: 'Snowdonia (Eryri)',
    region: 'Gwynedd',
    country: 'United Kingdom',
    lat: 53.0685,
    lon: -4.0763,
    timezone: 'Europe/London',
    activities: alpineCity().filter((a) => a !== 'skiing' && a !== 'snowboarding'),
    description:
      'The highest mountain region of Wales — and a designated International Dark Sky Reserve, so it doubles as one of the UK\'s best stargazing locations.',
  },
  {
    slug: 'biarritz-pays-basque',
    name: 'Biarritz',
    region: 'Pays Basque',
    country: 'France',
    lat: 43.4832,
    lon: -1.5586,
    timezone: 'Europe/Paris',
    activities: coastalEuropean(),
    beachFacingDeg: 290,
    description:
      'Where European surfing began. Consistent Atlantic swell, a Basque culinary scene, and the Pyrenees an hour away.',
  },

  // ===========================================================================
  // EUROPEAN CAPITALS — alphabetical
  // ===========================================================================
  { slug: 'amsterdam', name: 'Amsterdam', region: 'North Holland', country: 'Netherlands', lat: 52.3676, lon: 4.9041, timezone: 'Europe/Amsterdam', activities: inlandEuropean(), description: 'Famously flat, famously cycle-friendly, and one of the easiest cities in Europe to live outdoors on a bike.' },
  { slug: 'andorra-la-vella', name: 'Andorra la Vella', region: 'Andorra la Vella', country: 'Andorra', lat: 42.5063, lon: 1.5218, timezone: 'Europe/Andorra', activities: alpineCity(), description: 'A Pyrenean capital where the ski lifts are inside the city limits.' },
  { slug: 'athens', name: 'Athens', region: 'Attica', country: 'Greece', lat: 37.9838, lon: 23.7275, timezone: 'Europe/Athens', activities: coastalEuropeanNoSurf(), description: 'Mediterranean coast on one side, the Pindus foothills on the other, and a climate that rewards being outside ten months of the year.' },
  { slug: 'belgrade', name: 'Belgrade', region: 'Belgrade', country: 'Serbia', lat: 44.7866, lon: 20.4489, timezone: 'Europe/Belgrade', activities: inlandEuropean(), description: 'Where the Sava meets the Danube — two of Europe\'s great rivers, with kayaking, rowing and wild swimming all on the city map.' },
  { slug: 'berlin', name: 'Berlin', region: 'Berlin', country: 'Germany', lat: 52.5200, lon: 13.4050, timezone: 'Europe/Berlin', activities: inlandEuropean(), description: 'Lakes, forests and a famously thorough cycle network — most things outdoor are a 30-minute S-Bahn ride away.' },
  { slug: 'bern', name: 'Bern', region: 'Bern', country: 'Switzerland', lat: 46.9480, lon: 7.4474, timezone: 'Europe/Zurich', activities: alpineCity(), description: 'The Aare loops through the old town, and the Bernese Oberland mountains rise an hour to the south.' },
  { slug: 'bratislava', name: 'Bratislava', region: 'Bratislava', country: 'Slovakia', lat: 48.1486, lon: 17.1077, timezone: 'Europe/Bratislava', activities: inlandEuropean(), description: 'The Little Carpathians sit on the city\'s western doorstep, with the Danube on its southern.' },
  { slug: 'brussels', name: 'Brussels', region: 'Brussels-Capital', country: 'Belgium', lat: 50.8503, lon: 4.3517, timezone: 'Europe/Brussels', activities: inlandEuropean(), description: 'The Sonian Forest covers a quarter of the city — half an hour from Grand Place by bike.' },
  { slug: 'bucharest', name: 'Bucharest', region: 'Bucharest', country: 'Romania', lat: 44.4268, lon: 26.1025, timezone: 'Europe/Bucharest', activities: inlandEuropean(), description: 'Within two hours of the Carpathians and three hours of the Black Sea — Bucharest changes shape with the seasons.' },
  { slug: 'budapest', name: 'Budapest', region: 'Budapest', country: 'Hungary', lat: 47.4979, lon: 19.0402, timezone: 'Europe/Budapest', activities: inlandEuropean(), description: 'The Danube runs through it and the Buda hills rise on its western side.' },
  { slug: 'chisinau', name: 'Chișinău', region: 'Chișinău', country: 'Moldova', lat: 47.0105, lon: 28.8638, timezone: 'Europe/Chisinau', activities: inlandEuropean(), description: 'Continental climate, vineyards on its outskirts, and surprisingly green public parks.' },
  { slug: 'copenhagen', name: 'Copenhagen', region: 'Capital Region', country: 'Denmark', lat: 55.6761, lon: 12.5683, timezone: 'Europe/Copenhagen', activities: coastalEuropeanNoSurf(['ice_skating']), description: 'Sea on three sides, more bikes than cars, and a city-wide tradition of harbour swimming year-round.' },
  { slug: 'dublin', name: 'Dublin', region: 'Leinster', country: 'Ireland', lat: 53.3498, lon: -6.2603, timezone: 'Europe/Dublin', activities: coastalEuropean([...TEAM_SPORTS_IRELAND]), description: 'Dublin Bay on the east, the Wicklow Mountains a half-hour south, and GAA pitches in every parish.' },
  { slug: 'helsinki', name: 'Helsinki', region: 'Uusimaa', country: 'Finland', lat: 60.1699, lon: 24.9384, timezone: 'Europe/Helsinki', activities: coastalEuropeanNoSurf([...WINTER_SPORTS]), description: 'Built across a Baltic archipelago — long summer evenings, hard winters, sauna culture, and ice swimming.' },
  { slug: 'kyiv', name: 'Kyiv', region: 'Kyiv', country: 'Ukraine', lat: 50.4501, lon: 30.5234, timezone: 'Europe/Kyiv', activities: inlandEuropean(['ice_skating']), description: 'The Dnipro splits the city north–south; pine forests and freshwater beaches sit on its eastern bank.' },
  { slug: 'lisbon', name: 'Lisbon', region: 'Lisbon', country: 'Portugal', lat: 38.7223, lon: -9.1393, timezone: 'Europe/Lisbon', activities: coastalEuropean(), beachFacingDeg: 240, description: 'The Tagus on one side, Atlantic surf beaches 30 minutes away on the other, and 300 days of sunshine a year.' },
  { slug: 'ljubljana', name: 'Ljubljana', region: 'Central Slovenia', country: 'Slovenia', lat: 46.0569, lon: 14.5058, timezone: 'Europe/Ljubljana', activities: alpineCity(), description: 'Forty minutes to the Julian Alps for skiing in winter and trail running in summer; the Adriatic an hour away in the other direction.' },
  { slug: 'london', name: 'London', region: 'Greater London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, timezone: 'Europe/London', activities: inlandEuropean(['fly_fishing_freshwater']), description: 'The Thames, eight royal parks, three thousand kilometres of cycleway, and a borough-by-borough cricket and rugby culture.' },
  { slug: 'luxembourg', name: 'Luxembourg City', region: 'Luxembourg', country: 'Luxembourg', lat: 49.6116, lon: 6.1319, timezone: 'Europe/Luxembourg', activities: inlandEuropean(), description: 'Mosel valley to the east, Ardennes to the north, and a hilly old town that makes walking it count as exercise.' },
  { slug: 'madrid', name: 'Madrid', region: 'Madrid', country: 'Spain', lat: 40.4168, lon: -3.7038, timezone: 'Europe/Madrid', activities: inlandEuropean(['skiing', 'snowboarding']), description: 'A continental capital ringed by the Sierra de Guadarrama — high enough to ski in winter, dry enough to play padel four hundred days a year.' },
  { slug: 'minsk', name: 'Minsk', region: 'Minsk', country: 'Belarus', lat: 53.9006, lon: 27.5590, timezone: 'Europe/Minsk', activities: inlandEuropean([...WINTER_SPORTS.filter((a) => a !== 'skiing')]), description: 'Long, real winters, flat terrain, and a city plan built around its lakes and the Svislach river.' },
  { slug: 'monaco', name: 'Monaco', region: 'Monaco', country: 'Monaco', lat: 43.7384, lon: 7.4246, timezone: 'Europe/Monaco', activities: coastalEuropeanNoSurf(), description: 'Mediterranean on its doorstep, Alpes-Maritimes 20 minutes inland — the smallest place on this list, the highest density of outdoor options per square kilometre.' },
  { slug: 'nicosia', name: 'Nicosia', region: 'Nicosia', country: 'Cyprus', lat: 35.1856, lon: 33.3823, timezone: 'Asia/Nicosia', activities: inlandEuropean(['scuba_diving', 'sea_swimming']), description: 'The Mediterranean is 40 minutes south and the Troodos mountains an hour west.' },
  { slug: 'oslo', name: 'Oslo', region: 'Oslo', country: 'Norway', lat: 59.9139, lon: 10.7522, timezone: 'Europe/Oslo', activities: alpineCity(), description: 'Cross-country ski trails inside the city limits. Fjord on the doorstep. Sauna boats on the harbour year-round.' },
  { slug: 'paris', name: 'Paris', region: 'Île-de-France', country: 'France', lat: 48.8566, lon: 2.3522, timezone: 'Europe/Paris', activities: inlandEuropean(), description: 'The Seine, the bois on either side, and a national obsession with the Sunday outdoor lunch.' },
  { slug: 'podgorica', name: 'Podgorica', region: 'Podgorica', country: 'Montenegro', lat: 42.4304, lon: 19.2594, timezone: 'Europe/Podgorica', activities: alpineCity(), description: 'Between Skadar Lake and the Dinaric Alps, with the Adriatic 45 minutes away.' },
  { slug: 'prague', name: 'Prague', region: 'Prague', country: 'Czech Republic', lat: 50.0755, lon: 14.4378, timezone: 'Europe/Prague', activities: inlandEuropean(), description: 'The Vltava cuts through it, and Bohemia rolls outwards into hills, forests and beer gardens.' },
  { slug: 'pristina', name: 'Pristina', region: 'Pristina', country: 'Kosovo', lat: 42.6629, lon: 21.1655, timezone: 'Europe/Belgrade', activities: alpineCity(), description: 'The Sharr Mountains form a long ridge to the south, with Brezovica\'s ski runs an hour and a half away.' },
  { slug: 'reykjavik', name: 'Reykjavík', region: 'Capital Region', country: 'Iceland', lat: 64.1466, lon: -21.9426, timezone: 'Atlantic/Reykjavik', activities: coastalEuropean([...WINTER_SPORTS]), description: 'A geothermal capital where the aurora is a weather forecast question and the sea swim is a year-round one.' },
  { slug: 'riga', name: 'Riga', region: 'Riga', country: 'Latvia', lat: 56.9496, lon: 24.1052, timezone: 'Europe/Riga', activities: coastalEuropeanNoSurf([...WINTER_SPORTS.filter((a) => a !== 'skiing')]), description: 'On the Gulf of Riga with the Daugava river running through it — flat, wooded, and made for cycling.' },
  { slug: 'rome', name: 'Rome', region: 'Lazio', country: 'Italy', lat: 41.9028, lon: 12.4964, timezone: 'Europe/Rome', activities: inlandEuropean(['sea_swimming']), description: 'The Tiber, three hills, and Ostia\'s beach 30 minutes by train.' },
  { slug: 'san-marino', name: 'San Marino', region: 'San Marino', country: 'San Marino', lat: 43.9424, lon: 12.4578, timezone: 'Europe/San_Marino', activities: inlandEuropean(['rock_climbing']), description: 'Three hilltop towers on Monte Titano, with the Adriatic 15 minutes east at Rimini.' },
  { slug: 'sarajevo', name: 'Sarajevo', region: 'Sarajevo Canton', country: 'Bosnia and Herzegovina', lat: 43.8563, lon: 18.4131, timezone: 'Europe/Sarajevo', activities: alpineCity(), description: 'Mount Bjelašnica on its southern edge — Olympic ski runs 25km from the old town.' },
  { slug: 'skopje', name: 'Skopje', region: 'Skopje', country: 'North Macedonia', lat: 41.9981, lon: 21.4254, timezone: 'Europe/Skopje', activities: alpineCity(), description: 'Mount Vodno rises above the city; Mavrovo and Popova Šapka are within day-trip distance.' },
  { slug: 'sofia', name: 'Sofia', region: 'Sofia City', country: 'Bulgaria', lat: 42.6977, lon: 23.3219, timezone: 'Europe/Sofia', activities: alpineCity(), description: 'Vitosha Mountain begins where the tram lines end — a working ski hill that\'s legitimately part of the city.' },
  { slug: 'stockholm', name: 'Stockholm', region: 'Stockholm County', country: 'Sweden', lat: 59.3293, lon: 18.0686, timezone: 'Europe/Stockholm', activities: coastalEuropeanNoSurf([...WINTER_SPORTS]), description: 'Built across 14 islands in the Baltic archipelago — kayaking and swimming in summer, ice skating in winter.' },
  { slug: 'tallinn', name: 'Tallinn', region: 'Harju', country: 'Estonia', lat: 59.4370, lon: 24.7536, timezone: 'Europe/Tallinn', activities: coastalEuropeanNoSurf([...WINTER_SPORTS.filter((a) => a !== 'skiing')]), description: 'On the Gulf of Finland, with the medieval old town opening onto pine forests and bog-walking trails.' },
  { slug: 'tirana', name: 'Tirana', region: 'Tirana', country: 'Albania', lat: 41.3275, lon: 19.8187, timezone: 'Europe/Tirane', activities: alpineCity(['sea_swimming']), description: 'Mount Dajti on one side, the Adriatic 40 minutes the other — a capital with both summer beach days and winter ski days within an hour.' },
  { slug: 'vaduz', name: 'Vaduz', region: 'Oberland', country: 'Liechtenstein', lat: 47.1410, lon: 9.5209, timezone: 'Europe/Vaduz', activities: alpineCity(), description: 'A Rhine-valley capital wedged between Swiss and Austrian Alps — small enough to walk across in fifteen minutes, mountainous enough to ski from its outskirts.' },
  { slug: 'valletta', name: 'Valletta', region: 'Valletta', country: 'Malta', lat: 35.8989, lon: 14.5146, timezone: 'Europe/Malta', activities: coastalEuropeanNoSurf(), description: 'A walkable Mediterranean fortress city — every street ends in sea, and the scuba diving on the surrounding coast is some of Europe\'s best.' },
  { slug: 'vienna', name: 'Vienna', region: 'Vienna', country: 'Austria', lat: 48.2082, lon: 16.3738, timezone: 'Europe/Vienna', activities: alpineCity(), description: 'The Danube, the Vienna Woods on the western edge, and a tram to ski slopes within an hour.' },
  { slug: 'vilnius', name: 'Vilnius', region: 'Vilnius County', country: 'Lithuania', lat: 54.6872, lon: 25.2797, timezone: 'Europe/Vilnius', activities: inlandEuropean([...WINTER_SPORTS.filter((a) => a !== 'skiing')]), description: 'Forest covers more of the city than buildings; the Neris and Vilnia rivers run through it and lakes ring its outskirts.' },
  { slug: 'warsaw', name: 'Warsaw', region: 'Masovian', country: 'Poland', lat: 52.2297, lon: 21.0122, timezone: 'Europe/Warsaw', activities: inlandEuropean(['ice_skating']), description: 'The Vistula with its wild eastern bank, the Kampinos Forest a tram-ride away, and proper winters most years.' },
  { slug: 'zagreb', name: 'Zagreb', region: 'City of Zagreb', country: 'Croatia', lat: 45.8150, lon: 15.9819, timezone: 'Europe/Zagreb', activities: alpineCity(), description: 'Medvednica rises on the city\'s northern edge — a wooded mountain with a working ski hill and trail networks for hiking and gravel.' },

  // ===========================================================================
  // TOP 50 NORTH AMERICAN CITIES BY POPULATION
  // (mix of US, Canadian and Mexican cities by city-proper population)
  // ===========================================================================
  { slug: 'mexico-city', name: 'Mexico City', region: 'Mexico City', country: 'Mexico', lat: 19.4326, lon: -99.1332, timezone: 'America/Mexico_City', activities: inlandEuropean(['rock_climbing']), description: 'At 2,240m elevation and ringed by volcanoes — the highest-altitude megacity on the continent.' },
  { slug: 'new-york', name: 'New York', region: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, timezone: 'America/New_York', activities: coastalUS(), description: 'Five boroughs, two rivers, the Atlantic on one flank and the Hudson Valley on the other.' },
  { slug: 'los-angeles', name: 'Los Angeles', region: 'California', country: 'United States', lat: 34.0522, lon: -118.2437, timezone: 'America/Los_Angeles', activities: coastalUS(), beachFacingDeg: 245, description: 'A coastal city stretched along 75 miles of Pacific — surfing on Tuesday, San Gabriel hiking on Wednesday.' },
  { slug: 'toronto', name: 'Toronto', region: 'Ontario', country: 'Canada', lat: 43.6532, lon: -79.3832, timezone: 'America/Toronto', activities: coastalEuropeanNoSurf([...TEAM_SPORTS_US, 'ice_hockey', 'ice_skating']), description: 'On the north shore of Lake Ontario — sailing in summer, hard ice in winter, and a year-round ravine system that feels rural for an hour at a time.' },
  { slug: 'chicago', name: 'Chicago', region: 'Illinois', country: 'United States', lat: 41.8781, lon: -87.6298, timezone: 'America/Chicago', activities: coastalUS().filter((a) => a !== 'surfing' && a !== 'jet_skiing'), description: 'On Lake Michigan — 26 miles of public lakefront, a famous summer running culture, and proper winters.' },
  { slug: 'houston', name: 'Houston', region: 'Texas', country: 'United States', lat: 29.7604, lon: -95.3698, timezone: 'America/Chicago', activities: inlandUS(['sea_kayaking', 'sea_fishing_boat']), description: 'Subtropical, hurricane-aware, and an hour from Galveston Bay.' },
  { slug: 'ecatepec', name: 'Ecatepec', region: 'State of Mexico', country: 'Mexico', lat: 19.6011, lon: -99.0500, timezone: 'America/Mexico_City', activities: inlandEuropean(), description: 'High-altitude Mexico City metro — same climate, same volcanic ring, dryer southern outskirts.' },
  { slug: 'phoenix', name: 'Phoenix', region: 'Arizona', country: 'United States', lat: 33.4484, lon: -112.0740, timezone: 'America/Phoenix', activities: inlandUS(), description: 'A desert city where summer pushes activities to dawn and dusk — and the South Mountain trails are walkable from downtown.' },
  { slug: 'philadelphia', name: 'Philadelphia', region: 'Pennsylvania', country: 'United States', lat: 39.9526, lon: -75.1652, timezone: 'America/New_York', activities: inlandUS(), description: 'The Schuylkill and Delaware rivers run through it, the Wissahickon ravine cuts inside the city limits, and the Jersey shore is 90 minutes east.' },
  { slug: 'tijuana', name: 'Tijuana', region: 'Baja California', country: 'Mexico', lat: 32.5149, lon: -117.0382, timezone: 'America/Tijuana', activities: coastalEuropean(), beachFacingDeg: 270, description: 'Pacific-facing border city — proper surf to the south at Rosarito and Ensenada, and the Sierra de Juárez an hour inland.' },
  { slug: 'san-antonio', name: 'San Antonio', region: 'Texas', country: 'United States', lat: 29.4241, lon: -98.4936, timezone: 'America/Chicago', activities: inlandUS(), description: 'Hill country to the north, river walk through the centre, and a long shoulder season for outdoor sport.' },
  { slug: 'san-diego', name: 'San Diego', region: 'California', country: 'United States', lat: 32.7157, lon: -117.1611, timezone: 'America/Los_Angeles', activities: coastalUS(), beachFacingDeg: 250, description: 'A consistent 18°C climate, 70 miles of Pacific coast, and the closest US city to Baja\'s surf and diving.' },
  { slug: 'dallas', name: 'Dallas', region: 'Texas', country: 'United States', lat: 32.7767, lon: -96.7970, timezone: 'America/Chicago', activities: inlandUS(), description: 'Flat, hot, and surprisingly green — lakes ring the city and the cycle network is improving fast.' },
  { slug: 'puebla', name: 'Puebla', region: 'Puebla', country: 'Mexico', lat: 19.0413, lon: -98.2062, timezone: 'America/Mexico_City', activities: alpineCity(), description: 'In the shadow of Popocatépetl and Iztaccíhuatl — a colonial capital where the volcanoes set the weather.' },
  { slug: 'austin', name: 'Austin', region: 'Texas', country: 'United States', lat: 30.2672, lon: -97.7431, timezone: 'America/Chicago', activities: inlandUS(['stand_up_paddleboarding']), description: 'Lady Bird Lake runs through downtown — SUP from the centre, hill-country gravel an hour west.' },
  { slug: 'jacksonville', name: 'Jacksonville', region: 'Florida', country: 'United States', lat: 30.3322, lon: -81.6557, timezone: 'America/New_York', activities: coastalUS(), beachFacingDeg: 75, description: 'The biggest US city by land area — Atlantic beach on one side, the St. Johns River through the middle.' },
  { slug: 'fort-worth', name: 'Fort Worth', region: 'Texas', country: 'United States', lat: 32.7555, lon: -97.3308, timezone: 'America/Chicago', activities: inlandUS(), description: 'Dallas\' twin city, with its own outdoor culture rooted in the Trinity River and the Stockyards.' },
  { slug: 'guadalajara', name: 'Guadalajara', region: 'Jalisco', country: 'Mexico', lat: 20.6597, lon: -103.3496, timezone: 'America/Mexico_City', activities: inlandEuropean(['rock_climbing']), description: 'Bosque La Primavera on its western edge — a 30,000-hectare forest with mountain biking trails and hot springs.' },
  { slug: 'columbus-oh', name: 'Columbus', region: 'Ohio', country: 'United States', lat: 39.9612, lon: -82.9988, timezone: 'America/New_York', activities: inlandUS(['ice_skating', 'ice_hockey']), description: 'Flat, four-seasons, and built around the Olentangy and Scioto rivers.' },
  { slug: 'charlotte', name: 'Charlotte', region: 'North Carolina', country: 'United States', lat: 35.2271, lon: -80.8431, timezone: 'America/New_York', activities: inlandUS(), description: 'In the Piedmont — between the Blue Ridge and the Atlantic, with both within day-trip range.' },
  { slug: 'indianapolis', name: 'Indianapolis', region: 'Indiana', country: 'United States', lat: 39.7684, lon: -86.1581, timezone: 'America/New_York', activities: inlandUS(['ice_skating']), description: 'A capital city built around the White River and the Monon Trail.' },
  { slug: 'san-francisco', name: 'San Francisco', region: 'California', country: 'United States', lat: 37.7749, lon: -122.4194, timezone: 'America/Los_Angeles', activities: coastalUS(), beachFacingDeg: 250, description: 'Microclimates that change in five minutes, year-round wetsuit-only sea swimming, and Marin Headlands on the doorstep.' },
  { slug: 'seattle', name: 'Seattle', region: 'Washington', country: 'United States', lat: 47.6062, lon: -122.3321, timezone: 'America/Los_Angeles', activities: coastalUS([...WINTER_SPORTS]), description: 'Puget Sound on one side, the Cascades on the other — and famously moody weather.' },
  { slug: 'denver', name: 'Denver', region: 'Colorado', country: 'United States', lat: 39.7392, lon: -104.9903, timezone: 'America/Denver', activities: alpineCity(), description: 'A mile high, with the Front Range 30 minutes west and 300 days of sun a year.' },
  { slug: 'monterrey', name: 'Monterrey', region: 'Nuevo León', country: 'Mexico', lat: 25.6866, lon: -100.3161, timezone: 'America/Monterrey', activities: alpineCity(['rock_climbing']), description: 'Surrounded by the Sierra Madre — Mexico\'s climbing capital, with Potrero Chico an hour north.' },
  { slug: 'washington-dc', name: 'Washington D.C.', region: 'District of Columbia', country: 'United States', lat: 38.9072, lon: -77.0369, timezone: 'America/New_York', activities: inlandUS(), description: 'The Potomac runs through it, and Rock Creek Park is 1,750 acres of woods inside the city.' },
  { slug: 'boston', name: 'Boston', region: 'Massachusetts', country: 'United States', lat: 42.3601, lon: -71.0589, timezone: 'America/New_York', activities: coastalUS([...WINTER_SPORTS]), description: 'On Massachusetts Bay, with a strong harbour culture and a four-seasons climate.' },
  { slug: 'montreal', name: 'Montreal', region: 'Quebec', country: 'Canada', lat: 45.5017, lon: -73.5673, timezone: 'America/Toronto', activities: inlandEuropean([...WINTER_SPORTS, 'ice_hockey', 'ice_skating']), description: 'An island city with Mont Royal in the middle and the Laurentians an hour north.' },
  { slug: 'el-paso', name: 'El Paso', region: 'Texas', country: 'United States', lat: 31.7619, lon: -106.4850, timezone: 'America/Denver', activities: inlandUS(), description: 'Franklin Mountains run through it — high desert with cool nights and an 80km radius of outdoor terrain.' },
  { slug: 'nashville', name: 'Nashville', region: 'Tennessee', country: 'United States', lat: 36.1627, lon: -86.7816, timezone: 'America/Chicago', activities: inlandUS(['fly_fishing_freshwater']), description: 'The Cumberland River through the middle and Percy Warner Park within the city limits.' },
  { slug: 'detroit', name: 'Detroit', region: 'Michigan', country: 'United States', lat: 42.3314, lon: -83.0458, timezone: 'America/Detroit', activities: inlandUS(['ice_hockey', 'ice_skating']), description: 'On the Detroit River, with Belle Isle Park in the middle and Lake St. Clair to the east.' },
  { slug: 'oklahoma-city', name: 'Oklahoma City', region: 'Oklahoma', country: 'United States', lat: 35.4676, lon: -97.5164, timezone: 'America/Chicago', activities: inlandUS(), description: 'Flat plains city — proper summer storms, surprisingly mild winters, big-sky stargazing on the outskirts.' },
  { slug: 'las-vegas', name: 'Las Vegas', region: 'Nevada', country: 'United States', lat: 36.1716, lon: -115.1391, timezone: 'America/Los_Angeles', activities: inlandUS(['rock_climbing']), description: 'Red Rock Canyon 20 minutes west — a desert climbing and hiking landscape on the edge of the strip.' },
  { slug: 'portland-or', name: 'Portland', region: 'Oregon', country: 'United States', lat: 45.5152, lon: -122.6784, timezone: 'America/Los_Angeles', activities: coastalUS(['skiing', 'snowboarding']), description: 'Forty minutes from Mount Hood, two hours from the Oregon coast, and rain that defines the local outdoor culture.' },
  { slug: 'memphis', name: 'Memphis', region: 'Tennessee', country: 'United States', lat: 35.1495, lon: -90.0490, timezone: 'America/Chicago', activities: inlandUS(['fly_fishing_freshwater']), description: 'On the Mississippi, with Shelby Farms — five times the size of Central Park — inside the city limits.' },
  { slug: 'louisville', name: 'Louisville', region: 'Kentucky', country: 'United States', lat: 38.2527, lon: -85.7585, timezone: 'America/New_York', activities: inlandUS(), description: 'On the Ohio River, with the Bluegrass region of horse country immediately south.' },
  { slug: 'baltimore', name: 'Baltimore', region: 'Maryland', country: 'United States', lat: 39.2904, lon: -76.6122, timezone: 'America/New_York', activities: coastalUS(), description: 'On Chesapeake Bay — sailing, blue crab, and an Inner Harbor culture that goes back to the 18th century.' },
  { slug: 'milwaukee', name: 'Milwaukee', region: 'Wisconsin', country: 'United States', lat: 43.0389, lon: -87.9065, timezone: 'America/Chicago', activities: coastalUS([...WINTER_SPORTS]).filter((a) => a !== 'surfing'), description: 'On Lake Michigan\'s western shore — hard winters, beach summers, and a long list of outdoor festivals.' },
  { slug: 'albuquerque', name: 'Albuquerque', region: 'New Mexico', country: 'United States', lat: 35.0844, lon: -106.6504, timezone: 'America/Denver', activities: alpineCity(), description: 'In the high desert with the Sandia Mountains directly east — a 3,000-metre summit reachable by tram.' },
  { slug: 'tucson', name: 'Tucson', region: 'Arizona', country: 'United States', lat: 32.2226, lon: -110.9747, timezone: 'America/Phoenix', activities: alpineCity(['rock_climbing']).filter((a) => a !== 'cross_country_skiing'), description: 'Sky islands — five mountain ranges visible from town, each with its own climate band.' },
  { slug: 'fresno', name: 'Fresno', region: 'California', country: 'United States', lat: 36.7378, lon: -119.7871, timezone: 'America/Los_Angeles', activities: alpineCity(), description: 'Yosemite, Sequoia and Kings Canyon all within 90 minutes — California\'s outdoor capital by some measures.' },
  { slug: 'sacramento', name: 'Sacramento', region: 'California', country: 'United States', lat: 38.5816, lon: -121.4944, timezone: 'America/Los_Angeles', activities: inlandUS(['kayaking', 'fly_fishing_freshwater']), description: 'Where the Sacramento and American rivers meet — a paddling capital, and an hour from the Sierra Nevada.' },
  { slug: 'kansas-city', name: 'Kansas City', region: 'Missouri', country: 'United States', lat: 39.0997, lon: -94.5786, timezone: 'America/Chicago', activities: inlandUS(), description: 'A four-seasons river city with more fountains per capita than anywhere outside Rome.' },
  { slug: 'mesa', name: 'Mesa', region: 'Arizona', country: 'United States', lat: 33.4152, lon: -111.8315, timezone: 'America/Phoenix', activities: inlandUS(['rock_climbing']), description: 'Tonto National Forest on its eastern edge — desert climbing, paddling on Saguaro Lake, and a long shoulder season.' },
  { slug: 'atlanta', name: 'Atlanta', region: 'Georgia', country: 'United States', lat: 33.7490, lon: -84.3880, timezone: 'America/New_York', activities: inlandUS(), description: 'A wooded city in the southern Appalachian foothills, with the BeltLine doing more for outdoor culture than any city plan in recent memory.' },
  { slug: 'omaha', name: 'Omaha', region: 'Nebraska', country: 'United States', lat: 41.2565, lon: -95.9345, timezone: 'America/Chicago', activities: inlandUS(['ice_skating']), description: 'On the Missouri River, with proper Great Plains winters and big-sky summer storms.' },
  { slug: 'colorado-springs', name: 'Colorado Springs', region: 'Colorado', country: 'United States', lat: 38.8339, lon: -104.8214, timezone: 'America/Denver', activities: alpineCity(['rock_climbing']), description: 'At the foot of Pikes Peak — 6,000 feet up, 300 days of sun, and trail access from almost every neighbourhood.' },
  { slug: 'miami', name: 'Miami', region: 'Florida', country: 'United States', lat: 25.7617, lon: -80.1918, timezone: 'America/New_York', activities: coastalUS(), beachFacingDeg: 85, description: 'Subtropical, Atlantic on one flank, Biscayne Bay on the other — and the closest US city to the Bahamas reefs.' },
  { slug: 'vancouver', name: 'Vancouver', region: 'British Columbia', country: 'Canada', lat: 49.2827, lon: -123.1207, timezone: 'America/Vancouver', activities: coastalUS([...WINTER_SPORTS]), description: 'Where the Pacific meets the Coast Mountains — ski in the morning, sail in the afternoon, year-round.' },
  { slug: 'calgary', name: 'Calgary', region: 'Alberta', country: 'Canada', lat: 51.0447, lon: -114.0719, timezone: 'America/Edmonton', activities: alpineCity(['fly_fishing_freshwater']), description: 'The eastern gateway to the Canadian Rockies — Banff is 90 minutes west, Bow River runs through the city.' },
  { slug: 'minneapolis', name: 'Minneapolis', region: 'Minnesota', country: 'United States', lat: 44.9778, lon: -93.2650, timezone: 'America/Chicago', activities: inlandUS([...WINTER_SPORTS, 'sailing_inland']), description: 'Twenty lakes inside the city, the Mississippi through the middle, and a winter cycling culture that puts most cities to shame.' },
  { slug: 'ottawa', name: 'Ottawa', region: 'Ontario', country: 'Canada', lat: 45.4215, lon: -75.6972, timezone: 'America/Toronto', activities: inlandUS([...WINTER_SPORTS, 'sailing_inland']), description: 'On the Ottawa River with Gatineau Park across it — the Rideau Canal becomes the world\'s longest skating rink every winter.' },
];

/**
 * Lookup helper — returns the location for a given slug, or undefined.
 */
export function getLocationBySlug(slug: string): SeoLocation | undefined {
  return SEO_LOCATIONS.find((l) => l.slug === slug);
}

/**
 * Returns every (activity, location) pair that should have a generated page.
 * Used by getStaticPaths and by the sitemap generator.
 */
export function getAllSeoPagePaths(): Array<{ activity: string; location: string }> {
  const paths: Array<{ activity: string; location: string }> = [];
  for (const loc of SEO_LOCATIONS) {
    for (const activity of loc.activities) {
      paths.push({ activity, location: loc.slug });
    }
  }
  return paths;
}

/**
 * Returns the count of pages this dataset would generate — for sanity checks.
 */
export function getSeoPageCount(): { locations: number; pages: number } {
  return {
    locations: SEO_LOCATIONS.length,
    pages: SEO_LOCATIONS.reduce((acc, loc) => acc + loc.activities.length, 0),
  };
}

/**
 * Returns the list of locations that include a given activity. Used by the
 * "Other good places for X" related-locations section on each page.
 */
export function getLocationsForActivity(activityId: string): SeoLocation[] {
  return SEO_LOCATIONS.filter((l) => l.activities.includes(activityId));
}
