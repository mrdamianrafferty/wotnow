/**
Climate Zone Inference for European Gardening

Automatically determines the gardening climate zone based on geographic coordinates.
This helps provide region-specific planting advice, frost dates, and task recommendations.
 */

export type ClimateZoneCode =
  | 'atlantic_mild'      // Ireland, W France, Asturias - mild, wet winters
  | 'cool_maritime'      // Scotland, Denmark, North Sea - cool, maritime
  | 'continental_cool'   // Central Europe - cold winters, warm summers
  | 'med_marine'         // Coastal Mediterranean - mild winters, hot dry summers
  | 'southern_hot_dry'   // Inland Spain/Italy - very hot, dry summers
  | 'mountain_cool';     // Alpine regions - short growing season, cool temps

export interface ClimateZone {
  code: ClimateZoneCode;
  name: string;
  description: string;
  characteristics: {
    winterType: string;
    summerType: string;
    rainfall: string;
    frostRisk: string;
    growingSeason: string;
  };
}

/**
Infer gardening climate zone from latitude and longitude
Optional elevation parameter for mountain detection
 */
export function inferGardeningClimateZone(
  lat: number,
  lon: number,
  elevation?: number
): ClimateZoneCode {

  // --- 1. Elevation takes priority for mountains
  if (typeof elevation === 'number' && elevation > 800) {
    return 'mountain_cool';
  }
  // Small bonus: detect mountainous lat/lon bands even without elevation
  if (
    (lat > 42 && lat < 47 && lon > -10 && lon < 10) ||  // Pyrenees / French Massif / Alps belt
    (lat > 46 && lat < 49 && lon > 6 && lon < 13)       // Austrian Alps / N Italy Alps
  ) {
    return 'mountain_cool';
  }

  // --- 2. Scandinavia & Northern Atlantic
  if (lat >= 58) {
    // Southern Norway / Sweden still milder than you think
    if (lon > 5 && lon < 20) return 'cool_maritime';
    // Faroes, Iceland, northern coasts have very Atlantic conditions
    return 'cool_maritime';
  }

  // --- 3. Broad cool-maritime band (North Sea, Scotland, Denmark)
  if (
    (lat >= 54 && lat < 58 && lon >= -5 && lon <= 10) || // Scotland, N England, NL, DK
    (lat >= 50 && lat < 54 && lon >= 2 && lon <= 10)     // N Germany coasts
  ) {
    return 'cool_maritime';
  }

  // --- 4. Atlantic mild maritime (includes Asturias, Galicia, W France, Ireland)
  const isAtlanticFacing =
    lon <= 1 && lon >= -12 && // Atlantic coast from Portugal to Ireland
    lat >= 40 && lat <= 55;

  if (isAtlanticFacing) {
    // Warmer south = med influence?
    if (lat < 43) {
      return 'med_marine'; // N Portugal / Galicia southern band
    }
    return 'atlantic_mild';
  }

  // --- 5. Mediterranean coastal band (strong Med climate influence)
  const isMedBasin =
    lat >= 35 &&
    lat <= 45 &&
    lon >= -10 &&
    lon <= 30 &&     // Whole Med basin (West Med to Greece)
    lat < 44 &&      // Ensure it's not drifting north into Alps
    !(lat > 42 && lon > -1 && lon < 10 && elevation && elevation > 500); // exclude Pyrenees/Alps

  if (isMedBasin) {
    // Distinguish coastal Med vs hot inland Iberia/Italy
    const closeToCoast =
      lon > -10 &&
      lon < 30 &&
      lat >= 35 &&
      lat <= 45 &&
      (
        // Simple coastal proximity logic: treat within ~70 km of sea as coastal
        // You can refine this later with coastline checks
        Math.abs(lat - 37) < 3 || 
        Math.abs(lat - 40) < 3 ||
        Math.abs(lat - 43) < 3
      );

    if (closeToCoast) {
      return 'med_marine';
    } else {
      return 'southern_hot_dry';
    }
  }

  // --- 6. Hot-dry interiors (Spain, Italy, Balkans inland)
  const inlandHotSouth =
    lat >= 36 &&
    lat <= 45 &&
    lon >= -10 &&
    lon <= 30; // broad sweep of southern Europe

  if (inlandHotSouth) {
    return 'southern_hot_dry';
  }

  // --- 7. Default for most inland Europe (France interior, Germany, Poland, CZ, Austria lowlands)
  return 'continental_cool';
}

/**
Get detailed information about a climate zone
 */
export function getClimateZoneInfo(code: ClimateZoneCode): ClimateZone {
  const zones: Record<ClimateZoneCode, ClimateZone> = {
    atlantic_mild: {
      code: 'atlantic_mild',
      name: 'Atlantic Mild Maritime',
      description: 'Mild, wet winters with cool summers. Consistent rainfall year-round.',
      characteristics: {
        winterType: 'Mild (5-10°C)',
        summerType: 'Cool to Moderate (15-22°C)',
        rainfall: 'High, year-round',
        frostRisk: 'Low to Moderate',
        growingSeason: 'Long (9-10 months)'
      }
    },
    cool_maritime: {
      code: 'cool_maritime',
      name: 'Cool Maritime',
      description: 'Cool, wet climate with moderate winters and mild summers.',
      characteristics: {
        winterType: 'Cool (0-7°C)',
        summerType: 'Mild (12-18°C)',
        rainfall: 'High, year-round',
        frostRisk: 'Moderate',
        growingSeason: 'Moderate (7-8 months)'
      }
    },
    continental_cool: {
      code: 'continental_cool',
      name: 'Continental Cool',
      description: 'Cold winters and warm summers with moderate rainfall.',
      characteristics: {
        winterType: 'Cold (-5 to 5°C)',
        summerType: 'Warm (20-26°C)',
        rainfall: 'Moderate, summer peaks',
        frostRisk: 'High',
        growingSeason: 'Moderate (6-7 months)'
      }
    },
    med_marine: {
      code: 'med_marine',
      name: 'Mediterranean Marine',
      description: 'Mild winters and hot, dry summers. Coastal influence moderates extremes.',
      characteristics: {
        winterType: 'Mild (8-15°C)',
        summerType: 'Hot (25-32°C)',
        rainfall: 'Low, winter concentration',
        frostRisk: 'Low',
        growingSeason: 'Very Long (10-11 months)'
      }
    },
    southern_hot_dry: {
      code: 'southern_hot_dry',
      name: 'Southern Hot Dry',
      description: 'Hot, dry summers with mild winters. Interior continental influence.',
      characteristics: {
        winterType: 'Mild to Cool (5-12°C)',
        summerType: 'Very Hot (28-38°C)',
        rainfall: 'Low, irregular',
        frostRisk: 'Moderate',
        growingSeason: 'Long (8-9 months)'
      }
    },
    mountain_cool: {
      code: 'mountain_cool',
      name: 'Mountain Cool',
      description: 'Short growing season with cool temperatures and high altitude effects.',
      characteristics: {
        winterType: 'Very Cold (-10 to 0°C)',
        summerType: 'Cool to Moderate (15-22°C)',
        rainfall: 'Moderate to High',
        frostRisk: 'Very High',
        growingSeason: 'Short (4-6 months)'
      }
    }
  };

  return zones[code];
}

/**
Get planting recommendations based on climate zone
 */
export function getClimateZonePlantingAdvice(code: ClimateZoneCode): {
  bestPlants: string[];
  avoidPlants: string[];
  specialConsiderations: string[];
} {
  const advice: Record<ClimateZoneCode, ReturnType<typeof getClimateZonePlantingAdvice>> = {
    atlantic_mild: {
      bestPlants: ['Hydrangeas', 'Fuchsias', 'Rhododendrons', 'Camellias', 'Ferns', 'Primroses'],
      avoidPlants: ['Lavender', 'Cacti', 'Mediterranean herbs (may struggle with moisture)'],
      specialConsiderations: [
        'Excellent for shade-loving plants',
        'Mulch to retain moisture',
        'Watch for fungal diseases in wet conditions',
        'Year-round planting possible for many species'
      ]
    },
    cool_maritime: {
      bestPlants: ['Hardy perennials', 'Brassicas', 'Root vegetables', 'Berries', 'Hardy roses'],
      avoidPlants: ['Heat-loving vegetables (melons, peppers)', 'Tender exotics'],
      specialConsiderations: [
        'Choose quick-maturing varieties',
        'Use cloches for early spring planting',
        'Excellent for cool-season crops',
        'Wind protection important'
      ]
    },
    continental_cool: {
      bestPlants: ['Deciduous trees', 'Hardy perennials', 'Spring bulbs', 'Berries', 'Root crops'],
      avoidPlants: ['Tender perennials', 'Frost-sensitive annuals (plant late)'],
      specialConsiderations: [
        'Wait until after last frost for tender plants',
        'Mulch heavily for winter protection',
        'Excellent growing conditions in summer',
        'Plan for snow load on structures'
      ]
    },
    med_marine: {
      bestPlants: ['Lavender', 'Rosemary', 'Olive trees', 'Citrus', 'Bougainvillea', 'Succulents'],
      avoidPlants: ['Moisture-loving plants', 'Plants requiring cold dormancy'],
      specialConsiderations: [
        'Drought-resistant plants excel',
        'Drip irrigation recommended',
        'Shade cloth for intense summer sun',
        'Plant in autumn for best establishment'
      ]
    },
    southern_hot_dry: {
      bestPlants: ['Drought-tolerant natives', 'Cacti', 'Succulents', 'Mediterranean herbs', 'Grapes'],
      avoidPlants: ['Lawn grass', 'Moisture-loving perennials', 'Acid-loving plants'],
      specialConsiderations: [
        'Irrigation essential for vegetables',
        'Mulch heavily to conserve moisture',
        'Morning watering to reduce evaporation',
        'Choose heat-tolerant varieties'
      ]
    },
    mountain_cool: {
      bestPlants: ['Alpine plants', 'Hardy perennials', 'Cold-hardy berries', 'Root vegetables'],
      avoidPlants: ['Long-season crops', 'Heat-loving vegetables', 'Tender perennials'],
      specialConsiderations: [
        'Very short growing season',
        'Use season extension techniques',
        'Excellent drainage crucial',
        'Frost can occur any month'
      ]
    }
  };

  return advice[code];
}

/**
Frost risk severity levels for a climate zone
 */
export type FrostRiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'severe';

/**
Get frost risk severity for a climate zone
Used to determine if frost protection tasks should be shown
 */
export function getClimateZoneFrostRisk(code: ClimateZoneCode): FrostRiskLevel {
  const riskMap: Record<ClimateZoneCode, FrostRiskLevel> = {
    atlantic_mild: 'low',        // Mild Atlantic - occasional light frost
    cool_maritime: 'moderate',   // Cool maritime - regular frosts
    continental_cool: 'high',    // Continental - hard winters
    med_marine: 'low',           // Med coastal - rare frost
    southern_hot_dry: 'moderate', // Inland Med - occasional frost
    mountain_cool: 'severe'      // Mountain - frequent hard frost
  };
  return riskMap[code];
}

/**
Check if frost protection is relevant for a climate zone
Returns true if the zone has moderate or higher frost risk
 */
export function zonHasFrostRisk(code: ClimateZoneCode): boolean {
  const risk = getClimateZoneFrostRisk(code);
  return risk === 'moderate' || risk === 'high' || risk === 'severe';
}

/**
Check if current date is within frost risk period for a zone
 */
export function isInFrostRiskPeriod(code: ClimateZoneCode, date: Date = new Date()): boolean {
  const year = date.getFullYear();
  const frostDates = getClimateZoneFrostDates(code, year);

  // Frost risk period is from first fall frost to last spring frost
  // This spans across year boundary (e.g., Oct 15 -> April 15)
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const springMonth = frostDates.lastSpringFrost.getMonth() + 1;
  const springDay = frostDates.lastSpringFrost.getDate();
  const fallMonth = frostDates.firstFallFrost.getMonth() + 1;
  const fallDay = frostDates.firstFallFrost.getDate();

  // In frost risk if: after fall frost OR before spring frost
  if (month > fallMonth || (month === fallMonth && day >= fallDay)) {
    return true; // After fall frost
  }
  if (month < springMonth || (month === springMonth && day <= springDay)) {
    return true; // Before spring frost
  }

  return false;
}

/**
Get frost date estimates based on climate zone
 */
export function getClimateZoneFrostDates(code: ClimateZoneCode, year: number = new Date().getFullYear()): {
  lastSpringFrost: Date;
  firstFallFrost: Date;
  frostFreeDepth: number; // days
} {
  // Approximate frost dates by zone
  const frostData: Record<ClimateZoneCode, { lastSpring: [number, number], firstFall: [number, number] }> = {
    atlantic_mild: {
      lastSpring: [3, 15],  // March 15
      firstFall: [11, 15]    // November 15
    },
    cool_maritime: {
      lastSpring: [4, 15],   // April 15
      firstFall: [10, 15]    // October 15
    },
    continental_cool: {
      lastSpring: [4, 25],   // April 25
      firstFall: [10, 10]    // October 10
    },
    med_marine: {
      lastSpring: [2, 15],   // February 15
      firstFall: [12, 1]     // December 1
    },
    southern_hot_dry: {
      lastSpring: [3, 1],    // March 1
      firstFall: [11, 20]    // November 20
    },
    mountain_cool: {
      lastSpring: [5, 20],   // May 20
      firstFall: [9, 15]     // September 15
    }
  };

  const dates = frostData[code];
  const lastSpringFrost = new Date(year, dates.lastSpring[0] - 1, dates.lastSpring[1]);
  const firstFallFrost = new Date(year, dates.firstFall[0] - 1, dates.firstFall[1]);
  
  const frostFreeDepth = Math.floor(
    (firstFallFrost.getTime() - lastSpringFrost.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    lastSpringFrost,
    firstFallFrost,
    frostFreeDepth
  };
}