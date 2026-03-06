/**
 * Local Signals System
 *
 * Privacy-preserving, weather-based signals for regional gardening conditions.
 * These signals are algorithmically generated from weather data - no individual
 * user data is exposed.
 *
 * Signal Types:
 * - PEST_PRESSURE: Conditions favor pest activity (aphids, slugs, etc.)
 * - DISEASE_RISK: Conditions favor disease spread (blight, mildew, etc.)
 * - WEATHER_DAMAGE: Extreme weather may damage plants (wind, frost, heat)
 *
 * @module lib/grow/localSignals
 */

import type { WeatherForecast } from './weatherTaskEngine';

// =============================================================================
// TYPES
// =============================================================================

export type SignalCategory = 'pest_pressure' | 'disease_risk' | 'weather_damage';

export type SignalType =
  // Pest pressure signals
  | 'aphid_conditions'
  | 'slug_activity'
  | 'caterpillar_conditions'
  // Disease risk signals
  | 'late_blight_risk'
  | 'powdery_mildew_risk'
  | 'botrytis_risk'
  | 'rust_risk'
  // Weather damage signals
  | 'frost_damage'
  | 'wind_damage'
  | 'heat_stress'
  | 'drought_stress';

export type SignalSeverity = 'low' | 'moderate' | 'high' | 'critical';

export interface LocalSignal {
  id: string;
  type: SignalType;
  category: SignalCategory;
  severity: SignalSeverity;
  title: string;
  description: string;
  advice: string;
  affectedPlants: string[];
  validFrom: string;
  validUntil: string;
  confidence: number; // 0-100
  weatherFactors: WeatherFactor[];
}

export interface WeatherFactor {
  name: string;
  value: number;
  unit: string;
  contribution: 'favorable' | 'neutral' | 'unfavorable';
}

export interface SignalPreferences {
  muted: SignalType[];
  minSeverity: SignalSeverity;
}

export interface LocalSignalResult {
  signals: LocalSignal[];
  location: {
    lat: number;
    lon: number;
    name?: string;
  };
  generatedAt: string;
  dataFreshness: string;
}

// =============================================================================
// SEVERITY UTILITIES
// =============================================================================

const SEVERITY_ORDER: Record<SignalSeverity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function compareSeverity(a: SignalSeverity, b: SignalSeverity): number {
  return SEVERITY_ORDER[b] - SEVERITY_ORDER[a];
}

function severityFromScore(score: number): SignalSeverity {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  return 'low';
}

// =============================================================================
// SIGNAL ID GENERATION
// =============================================================================

function generateSignalId(type: SignalType, date: string): string {
  return `${type}_${date}_${Math.random().toString(36).substring(2, 8)}`;
}

// =============================================================================
// PEST PRESSURE SIGNALS
// =============================================================================

/**
 * Aphid conditions signal
 * Favorable: warm (15-25°C), calm winds (<15 km/h), growing season
 */
function detectAphidConditions(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  const month = new Date().getMonth() + 1;
  const inGrowingSeason = month >= 4 && month <= 9;
  if (!inGrowingSeason) return null;

  const temp = (today.tempMin + today.tempMax) / 2;
  const wind = today.windSpeed;

  const factors: WeatherFactor[] = [];
  let score = 0;

  // Temperature factor (optimal 18-25°C)
  if (temp >= 18 && temp <= 25) {
    score += 40;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'favorable' });
  } else if (temp > 15 && temp < 30) {
    score += 25;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'unfavorable' });
  }

  // Wind factor (aphids dislike wind)
  if (wind < 8) {
    score += 35;
    factors.push({ name: 'Wind speed', value: wind, unit: 'km/h', contribution: 'favorable' });
  } else if (wind < 15) {
    score += 20;
    factors.push({ name: 'Wind speed', value: wind, unit: 'km/h', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Wind speed', value: wind, unit: 'km/h', contribution: 'unfavorable' });
  }

  // Consecutive favorable days bonus
  const favorableDays = forecast.filter(
    (d) => d.windSpeed < 15 && (d.tempMin + d.tempMax) / 2 > 15
  ).length;
  if (favorableDays >= 3) {
    score += 25;
    factors.push({
      name: 'Favorable days ahead',
      value: favorableDays,
      unit: 'days',
      contribution: 'favorable',
    });
  }

  if (score < 40) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('aphid_conditions', today.date),
    type: 'aphid_conditions',
    category: 'pest_pressure',
    severity,
    title: `Aphid watch - ${favorableDays} warm days ahead`,
    description: `Calm, warm weather (${temp.toFixed(0)}°C, light wind) is ideal for aphid reproduction. Check plants over the next ${favorableDays} days.`,
    advice:
      'Inspect new growth and leaf undersides today. Blast off with a jet of water. Encourage ladybirds, lacewings and hoverflies.',
    affectedPlants: ['roses', 'beans', 'peppers', 'tomatoes', 'lettuce', 'brassicas'],
    validFrom: today.date,
    validUntil: forecast[Math.min(favorableDays, forecast.length - 1)]?.date || today.date,
    confidence: Math.min(score, 95),
    weatherFactors: factors,
  };
}

/**
 * Slug activity signal
 * Favorable: recent rain, mild temps (>5°C), high humidity
 */
function detectSlugActivity(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  const rain = today.precipitation;
  const humidity = today.humidity;
  const temp = today.tempMin;

  const factors: WeatherFactor[] = [];
  let score = 0;

  // Rain factor
  if (rain > 10) {
    score += 40;
    factors.push({ name: 'Rainfall', value: rain, unit: 'mm', contribution: 'favorable' });
  } else if (rain > 3) {
    score += 25;
    factors.push({ name: 'Rainfall', value: rain, unit: 'mm', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Rainfall', value: rain, unit: 'mm', contribution: 'unfavorable' });
  }

  // Humidity factor
  if (humidity > 85) {
    score += 30;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'favorable' });
  } else if (humidity > 70) {
    score += 15;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'unfavorable' });
  }

  // Temperature factor (slugs need >5°C)
  if (temp > 10) {
    score += 20;
    factors.push({ name: 'Night temperature', value: temp, unit: '°C', contribution: 'favorable' });
  } else if (temp > 5) {
    score += 10;
    factors.push({ name: 'Night temperature', value: temp, unit: '°C', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Night temperature', value: temp, unit: '°C', contribution: 'unfavorable' });
  }

  if (score < 40) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('slug_activity', today.date),
    type: 'slug_activity',
    category: 'pest_pressure',
    severity,
    title: 'Slug alert - go hunting tonight',
    description: `Rain (${rain.toFixed(0)}mm), mild nights (${temp.toFixed(0)}°C) and ${humidity}% humidity mean slugs will be active after dark.`,
    advice:
      'Head out with a torch after dark. Set beer traps near vulnerable plants. Encourage frogs, toads, hedgehogs and birds.',
    affectedPlants: ['lettuce', 'hostas', 'strawberries', 'cabbage', 'beans', 'seedlings'],
    validFrom: today.date,
    validUntil: today.date,
    confidence: Math.min(score, 90),
    weatherFactors: factors,
  };
}

// =============================================================================
// DISEASE RISK SIGNALS
// =============================================================================

/**
 * Late blight risk signal
 * Favorable: wet (>15mm/72h), high humidity (>80%), mild temps (12-25°C)
 */
function detectLateBlightRisk(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  // Calculate 72h rain
  const rain72h = forecast.slice(0, 3).reduce((sum, day) => sum + (day.precipitation || 0), 0);
  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;

  const factors: WeatherFactor[] = [];
  let score = 0;

  // Rain factor
  if (rain72h >= 25) {
    score += 35;
    factors.push({ name: '72h rainfall', value: rain72h, unit: 'mm', contribution: 'favorable' });
  } else if (rain72h >= 15) {
    score += 20;
    factors.push({ name: '72h rainfall', value: rain72h, unit: 'mm', contribution: 'neutral' });
  } else {
    factors.push({ name: '72h rainfall', value: rain72h, unit: 'mm', contribution: 'unfavorable' });
  }

  // Humidity factor
  if (humidity >= 90) {
    score += 35;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'favorable' });
  } else if (humidity >= 80) {
    score += 20;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'unfavorable' });
  }

  // Temperature factor (blight thrives 15-22°C)
  if (temp >= 15 && temp <= 22) {
    score += 30;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'favorable' });
  } else if (temp >= 12 && temp <= 25) {
    score += 15;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'unfavorable' });
  }

  if (score < 45) return null;

  const severity = severityFromScore(score);
  const daysAtRisk = forecast.filter(
    (d) => d.humidity >= 80 && (d.tempMin + d.tempMax) / 2 >= 12
  ).length;

  return {
    id: generateSignalId('late_blight_risk', today.date),
    type: 'late_blight_risk',
    category: 'disease_risk',
    severity,
    title: `Late blight risk - act within ${daysAtRisk > 1 ? `${daysAtRisk} days` : '24 hours'}`,
    description: `${rain72h.toFixed(0)}mm rain in 72h plus ${humidity}% humidity at ${temp.toFixed(0)}°C. Classic blight conditions for the next ${daysAtRisk} days.`,
    advice:
      severity === 'critical' || severity === 'high'
        ? 'Spray copper-based fungicide today. Remove lower leaves touching soil. Improve airflow around plants.'
        : 'Check leaves for brown lesions now. Consider a preventive copper spray. Water at soil level only.',
    affectedPlants: ['tomatoes', 'potatoes', 'peppers', 'aubergines'],
    validFrom: today.date,
    validUntil: forecast[Math.min(daysAtRisk, forecast.length - 1)]?.date || today.date,
    confidence: Math.min(score, 95),
    weatherFactors: factors,
  };
}

/**
 * Powdery mildew risk signal
 * Favorable: dry days (>3), humid nights (>70%), warm temps (18-30°C)
 */
function detectPowderyMildewRisk(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  // Count dry days
  let dryDays = 0;
  for (const day of forecast) {
    if (day.precipitation < 1) dryDays++;
    else break;
  }

  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;

  const factors: WeatherFactor[] = [];
  let score = 0;

  // Dry days factor
  if (dryDays >= 5) {
    score += 35;
    factors.push({
      name: 'Consecutive dry days',
      value: dryDays,
      unit: 'days',
      contribution: 'favorable',
    });
  } else if (dryDays >= 3) {
    score += 20;
    factors.push({
      name: 'Consecutive dry days',
      value: dryDays,
      unit: 'days',
      contribution: 'neutral',
    });
  } else {
    factors.push({
      name: 'Consecutive dry days',
      value: dryDays,
      unit: 'days',
      contribution: 'unfavorable',
    });
  }

  // Humidity factor (paradoxically, mildew needs humid nights)
  if (humidity > 85) {
    score += 30;
    factors.push({ name: 'Night humidity', value: humidity, unit: '%', contribution: 'favorable' });
  } else if (humidity > 70) {
    score += 15;
    factors.push({ name: 'Night humidity', value: humidity, unit: '%', contribution: 'neutral' });
  } else {
    factors.push({
      name: 'Night humidity',
      value: humidity,
      unit: '%',
      contribution: 'unfavorable',
    });
  }

  // Temperature factor
  if (temp >= 20 && temp <= 28) {
    score += 30;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'favorable' });
  } else if (temp >= 18 && temp <= 30) {
    score += 15;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'unfavorable' });
  }

  if (score < 45) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('powdery_mildew_risk', today.date),
    type: 'powdery_mildew_risk',
    category: 'disease_risk',
    severity,
    title: `Powdery mildew risk - ${dryDays} dry days and counting`,
    description: `${dryDays} dry days with humid nights (${humidity}%) at ${temp.toFixed(0)}°C. Perfect for powdery mildew to take hold.`,
    advice:
      severity === 'critical' || severity === 'high'
        ? 'Apply milk spray (1:10 ratio) or sulphur fungicide today. Remove any affected leaves immediately.'
        : 'Check squash, courgettes and roses for white patches. Water at soil level. Thin crowded growth for airflow.',
    affectedPlants: ['courgettes', 'cucumbers', 'squash', 'melons', 'pumpkins', 'roses', 'peas'],
    validFrom: today.date,
    validUntil: forecast[Math.min(dryDays + 1, forecast.length - 1)]?.date || today.date,
    confidence: Math.min(score, 90),
    weatherFactors: factors,
  };
}

/**
 * Botrytis (grey mold) risk signal
 * Favorable: high humidity (>80%), moderate temps (12-25°C), wet foliage
 */
function detectBotrytisRisk(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;
  const recentRain = today.precipitation > 2;

  const factors: WeatherFactor[] = [];
  let score = 0;

  // Humidity factor
  if (humidity > 90) {
    score += 40;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'favorable' });
  } else if (humidity > 80) {
    score += 25;
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Humidity', value: humidity, unit: '%', contribution: 'unfavorable' });
  }

  // Temperature factor
  if (temp >= 15 && temp <= 22) {
    score += 30;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'favorable' });
  } else if (temp >= 12 && temp <= 25) {
    score += 15;
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'neutral' });
  } else {
    factors.push({ name: 'Temperature', value: temp, unit: '°C', contribution: 'unfavorable' });
  }

  // Rain factor
  if (recentRain) {
    score += 20;
    factors.push({
      name: 'Recent rain',
      value: today.precipitation,
      unit: 'mm',
      contribution: 'favorable',
    });
  }

  if (score < 45) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('botrytis_risk', today.date),
    type: 'botrytis_risk',
    category: 'disease_risk',
    severity,
    title: 'Grey mould risk - clear dead material today',
    description: `${humidity}% humidity at ${temp.toFixed(0)}°C creates the damp conditions grey mould (botrytis) thrives in.`,
    advice:
      'Remove dead flowers, fallen leaves and decaying material now. Space plants for airflow. Water at soil level only.',
    affectedPlants: ['strawberries', 'grapes', 'tomatoes', 'lettuce', 'beans'],
    validFrom: today.date,
    validUntil: today.date,
    confidence: Math.min(score, 85),
    weatherFactors: factors,
  };
}

// =============================================================================
// WEATHER DAMAGE SIGNALS
// =============================================================================

/**
 * Frost damage signal
 * Conditions: temp dropping below 0°C in next 48h
 */
function detectFrostDamage(forecast: WeatherForecast[]): LocalSignal | null {
  const frostDays = forecast.slice(0, 3).filter((d) => d.tempMin <= 0);
  if (frostDays.length === 0) return null;

  const coldestDay = frostDays.reduce((min, d) => (d.tempMin < min.tempMin ? d : min));
  const frostTemp = coldestDay.tempMin;

  const factors: WeatherFactor[] = [
    {
      name: 'Minimum temperature',
      value: frostTemp,
      unit: '°C',
      contribution: 'unfavorable',
    },
    {
      name: 'Frost days ahead',
      value: frostDays.length,
      unit: 'days',
      contribution: 'unfavorable',
    },
  ];

  let score = 50;
  if (frostTemp <= -5) score = 95;
  else if (frostTemp <= -2) score = 80;
  else if (frostTemp <= 0) score = 60;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('frost_damage', coldestDay.date),
    type: 'frost_damage',
    category: 'weather_damage',
    severity,
    title:
      severity === 'critical'
        ? `Hard frost tonight - protect plants now (${frostTemp}°C)`
        : `Frost expected - cover tender plants tonight (${frostTemp}°C)`,
    description: `Temperatures dropping to ${frostTemp}°C. ${frostDays.length} frosty night${frostDays.length > 1 ? 's' : ''} ahead.`,
    advice:
      severity === 'critical' || severity === 'high'
        ? 'Cover with fleece or cloches before dark. Move containers indoors. Bring tender plants inside tonight.'
        : 'Drape fleece over vulnerable plants this evening. Move pots to a sheltered wall.',
    affectedPlants: ['tender plants', 'tomatoes', 'peppers', 'courgettes', 'beans', 'seedlings'],
    validFrom: frostDays[0].date,
    validUntil: frostDays[frostDays.length - 1].date,
    confidence: 95,
    weatherFactors: factors,
  };
}

/**
 * Wind damage signal
 * Conditions: strong wind (>40 km/h) or gusts (>50 km/h)
 */
function detectWindDamage(forecast: WeatherForecast[]): LocalSignal | null {
  const today = forecast[0];
  if (!today) return null;

  const windSpeed = today.windSpeed;
  const windGust = today.windGust;

  const factors: WeatherFactor[] = [
    { name: 'Wind speed', value: windSpeed, unit: 'km/h', contribution: 'unfavorable' },
  ];

  if (windGust > windSpeed) {
    factors.push({ name: 'Wind gusts', value: windGust, unit: 'km/h', contribution: 'unfavorable' });
  }

  let score = 0;
  if (windGust >= 70 || windSpeed >= 50) score = 95;
  else if (windGust >= 50 || windSpeed >= 40) score = 75;
  else if (windSpeed >= 30) score = 55;
  else if (windSpeed >= 25) score = 45;

  if (score < 45) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('wind_damage', today.date),
    type: 'wind_damage',
    category: 'weather_damage',
    severity,
    title:
      severity === 'critical'
        ? `Strong winds today - stake and secure now (gusts ${Math.round(windGust)} km/h)`
        : `Windy spell ahead - check supports (${Math.round(windSpeed)} km/h)`,
    description: `Winds of ${Math.round(windSpeed)} km/h with gusts to ${Math.round(windGust)} km/h. Tall plants and containers are at risk.`,
    advice:
      severity === 'critical' || severity === 'high'
        ? 'Stake tall plants and secure containers before the wind picks up. Delay spraying and sowing.'
        : 'Firm up plant supports this morning. Avoid spraying. Water early while it is calmer.',
    affectedPlants: ['tall plants', 'climbers', 'sunflowers', 'sweetcorn', 'container plants'],
    validFrom: today.date,
    validUntil: today.date,
    confidence: 90,
    weatherFactors: factors,
  };
}

/**
 * Heat stress signal
 * Conditions: temps >30°C, especially consecutive days
 */
function detectHeatStress(forecast: WeatherForecast[]): LocalSignal | null {
  const hotDays = forecast.filter((d) => d.tempMax >= 30);
  if (hotDays.length === 0) return null;

  const maxTemp = Math.max(...hotDays.map((d) => d.tempMax));
  const consecutiveHotDays = hotDays.length;

  const factors: WeatherFactor[] = [
    { name: 'Maximum temperature', value: maxTemp, unit: '°C', contribution: 'unfavorable' },
    { name: 'Hot days ahead', value: consecutiveHotDays, unit: 'days', contribution: 'unfavorable' },
  ];

  let score = 0;
  if (maxTemp >= 38) score = 95;
  else if (maxTemp >= 35) score = 80;
  else if (maxTemp >= 32 && consecutiveHotDays >= 2) score = 70;
  else if (maxTemp >= 30) score = 50;

  if (score < 50) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('heat_stress', hotDays[0].date),
    type: 'heat_stress',
    category: 'weather_damage',
    severity,
    title:
      severity === 'critical'
        ? `Extreme heat - water twice daily from tomorrow (${maxTemp}°C)`
        : `Hot spell coming - ${consecutiveHotDays} days above 30°C`,
    description: `Temperatures reaching ${maxTemp}°C over the next ${consecutiveHotDays} days. Plants will need extra water and shade.`,
    advice:
      severity === 'critical' || severity === 'high'
        ? 'Water deeply at dawn and dusk. Rig shade cloth over leafy greens. Mulch exposed soil to lock in moisture.'
        : 'Water early morning before the heat builds. Move pots into afternoon shade. Mulch around thirsty plants.',
    affectedPlants: ['lettuce', 'spinach', 'leafy greens', 'newly planted', 'container plants'],
    validFrom: hotDays[0].date,
    validUntil: hotDays[hotDays.length - 1].date,
    confidence: 90,
    weatherFactors: factors,
  };
}

/**
 * Drought stress signal
 * Conditions: no significant rain for 5+ days, low humidity
 */
function detectDroughtStress(forecast: WeatherForecast[]): LocalSignal | null {
  let dryDays = 0;
  for (const day of forecast) {
    if (day.precipitation < 2) dryDays++;
    else break;
  }

  if (dryDays < 5) return null;

  const today = forecast[0];
  const humidity = today?.humidity || 50;

  const factors: WeatherFactor[] = [
    { name: 'Dry days ahead', value: dryDays, unit: 'days', contribution: 'unfavorable' },
    {
      name: 'Humidity',
      value: humidity,
      unit: '%',
      contribution: humidity < 40 ? 'unfavorable' : 'neutral',
    },
  ];

  let score = 40;
  if (dryDays >= 7 && humidity < 40) score = 80;
  else if (dryDays >= 7) score = 65;
  else if (dryDays >= 5 && humidity < 50) score = 55;

  if (score < 50) return null;

  const severity = severityFromScore(score);

  return {
    id: generateSignalId('drought_stress', today?.date || new Date().toISOString().split('T')[0]),
    type: 'drought_stress',
    category: 'weather_damage',
    severity,
    title: `Dry spell - no rain for ${dryDays} days, water deeply now`,
    description: `No meaningful rain ahead for ${dryDays} days with humidity at just ${humidity}%. Soil moisture is dropping.`,
    advice:
      'Give beds a deep soak every 2-3 days rather than a light daily sprinkle. Mulch bare soil. Prioritise containers and new plantings.',
    affectedPlants: ['all plants', 'especially shallow-rooted', 'containers', 'newly planted'],
    validFrom: today?.date || new Date().toISOString().split('T')[0],
    validUntil:
      forecast[Math.min(dryDays - 1, forecast.length - 1)]?.date ||
      new Date().toISOString().split('T')[0],
    confidence: Math.min(score, 85),
    weatherFactors: factors,
  };
}

// =============================================================================
// MAIN SIGNAL GENERATION
// =============================================================================

/**
 * Generate all local signals from weather forecast data
 */
export function generateLocalSignals(
  forecast: WeatherForecast[],
  preferences?: SignalPreferences
): LocalSignal[] {
  if (!forecast || forecast.length === 0) return [];

  const allSignals: LocalSignal[] = [];

  // Pest pressure signals
  const aphidSignal = detectAphidConditions(forecast);
  if (aphidSignal) allSignals.push(aphidSignal);

  const slugSignal = detectSlugActivity(forecast);
  if (slugSignal) allSignals.push(slugSignal);

  // Disease risk signals
  const blightSignal = detectLateBlightRisk(forecast);
  if (blightSignal) allSignals.push(blightSignal);

  const mildewSignal = detectPowderyMildewRisk(forecast);
  if (mildewSignal) allSignals.push(mildewSignal);

  const botrytisSignal = detectBotrytisRisk(forecast);
  if (botrytisSignal) allSignals.push(botrytisSignal);

  // Weather damage signals
  const frostSignal = detectFrostDamage(forecast);
  if (frostSignal) allSignals.push(frostSignal);

  const windSignal = detectWindDamage(forecast);
  if (windSignal) allSignals.push(windSignal);

  const heatSignal = detectHeatStress(forecast);
  if (heatSignal) allSignals.push(heatSignal);

  const droughtSignal = detectDroughtStress(forecast);
  if (droughtSignal) allSignals.push(droughtSignal);

  // Apply preferences
  let filteredSignals = allSignals;

  if (preferences) {
    // Filter muted signal types
    if (preferences.muted && preferences.muted.length > 0) {
      filteredSignals = filteredSignals.filter((s) => !preferences.muted.includes(s.type));
    }

    // Filter by minimum severity
    if (preferences.minSeverity) {
      const minLevel = SEVERITY_ORDER[preferences.minSeverity];
      filteredSignals = filteredSignals.filter((s) => SEVERITY_ORDER[s.severity] >= minLevel);
    }
  }

  // Sort by severity (critical first) then by category
  filteredSignals.sort((a, b) => {
    const severityDiff = compareSeverity(a.severity, b.severity);
    if (severityDiff !== 0) return severityDiff;

    // Within same severity, order: weather_damage > disease_risk > pest_pressure
    const categoryOrder = { weather_damage: 0, disease_risk: 1, pest_pressure: 2 };
    return categoryOrder[a.category] - categoryOrder[b.category];
  });

  return filteredSignals;
}

/**
 * Get signals for a specific category
 */
export function getSignalsByCategory(
  signals: LocalSignal[],
  category: SignalCategory
): LocalSignal[] {
  return signals.filter((s) => s.category === category);
}

/**
 * Get critical and high severity signals
 */
export function getUrgentSignals(signals: LocalSignal[]): LocalSignal[] {
  return signals.filter((s) => s.severity === 'critical' || s.severity === 'high');
}

/**
 * Check if there are any urgent signals
 */
export function hasUrgentSignals(signals: LocalSignal[]): boolean {
  return signals.some((s) => s.severity === 'critical' || s.severity === 'high');
}
