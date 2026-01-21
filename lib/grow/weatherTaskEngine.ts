/**
 * Weather Task Engine
 *
 * The core engine that connects weather forecasts to task generation.
 * This is the KEY DIFFERENTIATOR - weather data driving actionable tasks.
 *
 * @module lib/grow/weatherTaskEngine
 */

// =============================================================================
// TYPES
// =============================================================================

export interface WeatherForecast {
  date: string;
  tempMin: number;
  tempMax: number;
  humidity: number;
  precipitation: number;
  precipProbability: number;
  windSpeed: number;
  windGust: number;
  uvIndex: number;
  description: string;
}

export interface SoilConditions {
  temp0cm: number;
  temp6cm: number;
  temp18cm: number;
  temp54cm: number;
  moisture0to1cm: number;
  moisture1to3cm: number;
  moisture3to9cm: number;
  moisture9to27cm: number;
}

export interface UserPlant {
  id: string;
  plantName: string;
  plantSlug: string;
  frostTolerance: 'hardy' | 'half_hardy' | 'tender' | null;
  waterNeeds: 'low' | 'medium' | 'high' | null;
  temperatureMin?: number;
  temperatureMax?: number;
  lastWateredAt?: string;
  wateringFrequencyDays?: number;
}

export interface WeatherAlert {
  type:
    | 'frost' | 'heat' | 'drought' | 'rain' | 'wind' | 'storm'
    | 'late_blight' | 'powdery_mildew' | 'botrytis' | 'aphids' | 'slugs'
    | 'wind_desiccation';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  forecastDate: string;
  forecastValue: number;
  affectedPlantIds: string[];
  suggestedAction: string;
}

export interface TaskAdjustment {
  taskType: string;
  originalUrgency: string;
  newUrgency: string;
  reason: string;
  suggestedDate?: string;
}

export interface WeatherTaskResult {
  alerts: WeatherAlert[];
  taskAdjustments: TaskAdjustment[];
  wateringRecommendation: WateringRecommendation;
  plantingWindows: PlantingWindow[];
}

export interface WateringRecommendation {
  shouldWater: boolean;
  reason: string;
  nextWateringDate: string;
  adjustmentFactor: number; // 1.0 = normal, 1.3 = 30% more, 0.5 = skip
  details: string[];
}

export interface PlantingWindow {
  plantSlug: string;
  canPlantNow: boolean;
  reason: string;
  optimalDate?: string;
  soilTempRequired: number;
  currentSoilTemp: number;
  daysUntilReady?: number;
}

// =============================================================================
// FROST DETECTION
// =============================================================================

/**
 * Check forecast for frost risk and identify affected plants
 */
export function detectFrostRisk(
  forecast: WeatherForecast[],
  plants: UserPlant[],
  hoursAhead: number = 48
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  // Find frost events in forecast window
  const frostDays = forecast.filter(day => {
    const dayDate = new Date(day.date);
    return dayDate <= cutoff && day.tempMin <= 0;
  });

  if (frostDays.length === 0) return alerts;

  // Identify tender and half-hardy plants at risk
  const tenderPlants = plants.filter(p => p.frostTolerance === 'tender');
  const halfHardyPlants = plants.filter(p => p.frostTolerance === 'half_hardy');

  for (const frostDay of frostDays) {
    const frostTemp = frostDay.tempMin;
    const affectedIds: string[] = [];
    let severity: 'info' | 'warning' | 'critical' = 'info';

    // Tender plants are at risk from any frost
    if (tenderPlants.length > 0 && frostTemp <= 0) {
      affectedIds.push(...tenderPlants.map(p => p.id));
      severity = frostTemp <= -2 ? 'critical' : 'warning';
    }

    // Half-hardy plants at risk from hard frost
    if (halfHardyPlants.length > 0 && frostTemp <= -2) {
      affectedIds.push(...halfHardyPlants.map(p => p.id));
      severity = 'critical';
    }

    if (affectedIds.length > 0) {
      const plantCount = affectedIds.length;
      const plantWord = plantCount === 1 ? 'plant' : 'plants';

      alerts.push({
        type: 'frost',
        severity,
        title: severity === 'critical'
          ? `HARD FROST WARNING - ${plantCount} ${plantWord} at risk`
          : `Frost Alert - ${plantCount} ${plantWord} may need protection`,
        message: `Temperature expected to drop to ${frostTemp}°C on ${frostDay.date}. ` +
          `${plantCount} of your tender or half-hardy ${plantWord} could be damaged.`,
        forecastDate: frostDay.date,
        forecastValue: frostTemp,
        affectedPlantIds: affectedIds,
        suggestedAction: severity === 'critical'
          ? 'Move tender plants indoors or cover with fleece/cloches tonight.'
          : 'Consider covering tender plants or moving containers to a sheltered spot.',
      });
    }
  }

  return alerts;
}

// =============================================================================
// HEAT STRESS DETECTION
// =============================================================================

/**
 * Check forecast for extreme heat that could stress plants
 */
export function detectHeatStress(
  forecast: WeatherForecast[],
  plants: UserPlant[],
  hoursAhead: number = 72
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  // Find hot days (>30°C) in forecast window
  const hotDays = forecast.filter(day => {
    const dayDate = new Date(day.date);
    return dayDate <= cutoff && day.tempMax >= 30;
  });

  if (hotDays.length === 0) return alerts;

  // Consecutive hot days are more dangerous
  const consecutiveHotDays = hotDays.length;
  const maxTemp = Math.max(...hotDays.map(d => d.tempMax));

  // Find plants with low heat tolerance
  const vulnerablePlants = plants.filter(p =>
    p.temperatureMax && p.temperatureMax < maxTemp
  );

  if (consecutiveHotDays >= 2 || maxTemp >= 35) {
    const severity: 'warning' | 'critical' = maxTemp >= 35 ? 'critical' : 'warning';

    alerts.push({
      type: 'heat',
      severity,
      title: severity === 'critical'
        ? `EXTREME HEAT - ${maxTemp}°C expected`
        : `Heat Wave Alert - ${consecutiveHotDays} hot days ahead`,
      message: `High temperatures of ${maxTemp}°C forecast. ` +
        `Plants will need extra water and may benefit from shade.`,
      forecastDate: hotDays[0].date,
      forecastValue: maxTemp,
      affectedPlantIds: vulnerablePlants.map(p => p.id),
      suggestedAction: severity === 'critical'
        ? 'Water deeply morning and evening. Consider temporary shade cloth for sensitive plants.'
        : 'Increase watering frequency. Water early morning to reduce evaporation.',
    });
  }

  return alerts;
}

// =============================================================================
// WIND IMPACT ASSESSMENT
// =============================================================================

/**
 * Wind impact thresholds for different gardening activities
 */
const WIND_THRESHOLDS = {
  spraying: 10,      // km/h - drift is dangerous
  fertilizing: 15,   // km/h - drift wastes product
  directSowing: 15,  // km/h - seeds blow away
  watering: 20,      // km/h - water evaporates/drifts
  mulching: 20,      // km/h - light mulch blows away
  transplanting: 20, // km/h - increases transplant shock
  generalWork: 30,   // km/h - uncomfortable/unsafe
};

/**
 * Calculate wind factor for watering adjustment
 */
export function calculateWindWateringFactor(windSpeed: number): number {
  if (windSpeed <= 10) return 1.0;      // Normal
  if (windSpeed <= 20) return 1.15;     // +15%
  if (windSpeed <= 30) return 1.3;      // +30%
  return 1.5;                           // +50%
}

/**
 * Check if wind conditions affect planned activities
 */
export function assessWindImpact(
  forecast: WeatherForecast[],
  plannedActivities: string[]
): TaskAdjustment[] {
  const adjustments: TaskAdjustment[] = [];
  const today = forecast[0];
  const tomorrow = forecast[1];

  if (!today) return adjustments;

  const currentWind = today.windSpeed;
  const currentGust = today.windGust;
  const effectiveWind = Math.max(currentWind, currentGust * 0.7); // Gusts matter

  for (const activity of plannedActivities) {
    const activityLower = activity.toLowerCase();
    let threshold = WIND_THRESHOLDS.generalWork;
    let activityName = activity;

    if (activityLower.includes('spray') || activityLower.includes('pesticide')) {
      threshold = WIND_THRESHOLDS.spraying;
      activityName = 'Spraying';
    } else if (activityLower.includes('fertili')) {
      threshold = WIND_THRESHOLDS.fertilizing;
      activityName = 'Fertilizing';
    } else if (activityLower.includes('sow') || activityLower.includes('seed')) {
      threshold = WIND_THRESHOLDS.directSowing;
      activityName = 'Sowing seeds';
    } else if (activityLower.includes('water')) {
      threshold = WIND_THRESHOLDS.watering;
      activityName = 'Watering';
    } else if (activityLower.includes('mulch')) {
      threshold = WIND_THRESHOLDS.mulching;
      activityName = 'Mulching';
    } else if (activityLower.includes('transplant') || activityLower.includes('plant')) {
      threshold = WIND_THRESHOLDS.transplanting;
      activityName = 'Transplanting';
    }

    if (effectiveWind > threshold) {
      // Check if tomorrow is better
      const tomorrowWind = tomorrow ? Math.max(tomorrow.windSpeed, (tomorrow.windGust || 0) * 0.7) : effectiveWind;
      const betterTomorrow = tomorrowWind < threshold;

      adjustments.push({
        taskType: activityName,
        originalUrgency: 'scheduled',
        newUrgency: betterTomorrow ? 'postpone' : 'caution',
        reason: `Wind speed (${Math.round(effectiveWind)} km/h) exceeds safe limit (${threshold} km/h) for ${activityName.toLowerCase()}.`,
        suggestedDate: betterTomorrow ? tomorrow.date : undefined,
      });
    }
  }

  return adjustments;
}

/**
 * Generate wind-based alerts
 */
export function detectWindRisk(
  forecast: WeatherForecast[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];

  if (!today) return alerts;

  const windSpeed = today.windSpeed;
  const windGust = today.windGust;

  // High wind warning
  if (windGust >= 50 || windSpeed >= 40) {
    alerts.push({
      type: 'wind',
      severity: 'critical',
      title: `STRONG WIND WARNING - Gusts to ${Math.round(windGust)} km/h`,
      message: 'Very strong winds may damage tall plants and structures. Secure containers and supports.',
      forecastDate: today.date,
      forecastValue: windGust,
      affectedPlantIds: [],
      suggestedAction: 'Stake tall plants, secure containers, delay all outdoor work.',
    });
  } else if (windSpeed >= 25) {
    alerts.push({
      type: 'wind',
      severity: 'warning',
      title: `Windy Conditions - ${Math.round(windSpeed)} km/h`,
      message: 'Moderate winds will affect spraying, sowing, and watering. Plan indoor tasks or wait for calmer conditions.',
      forecastDate: today.date,
      forecastValue: windSpeed,
      affectedPlantIds: [],
      suggestedAction: 'Avoid spraying/fertilizing. Water early morning when winds are typically calmer.',
    });
  }

  return alerts;
}

// =============================================================================
// PEST & DISEASE RISK DETECTION
// =============================================================================

/**
 * Plants susceptible to specific diseases
 */
const DISEASE_SUSCEPTIBLE_PLANTS: Record<string, string[]> = {
  late_blight: ['tomato', 'potato', 'pepper', 'aubergine', 'eggplant'],
  powdery_mildew: ['courgette', 'zucchini', 'squash', 'cucumber', 'melon', 'pumpkin', 'rose', 'pea'],
  botrytis: ['strawberry', 'grape', 'tomato', 'lettuce', 'bean'],
  aphids: ['rose', 'bean', 'pepper', 'tomato', 'lettuce', 'cabbage', 'brassica', 'apple'],
  slugs: ['lettuce', 'hosta', 'strawberry', 'cabbage', 'bean', 'seedling'],
};

/**
 * Calculate cumulative rain over multiple days
 */
function calculateRain72h(forecast: WeatherForecast[]): number {
  return forecast.slice(0, 3).reduce((sum, day) => sum + (day.precipitation || 0), 0);
}

/**
 * Check for consecutive dry days
 */
function countDryDays(forecast: WeatherForecast[]): number {
  let count = 0;
  for (const day of forecast) {
    if (day.precipitation < 1) count++;
    else break;
  }
  return count;
}

/**
 * Find plants matching disease susceptibility
 */
function findSusceptiblePlants(plants: UserPlant[], disease: string): UserPlant[] {
  const susceptibleTypes = DISEASE_SUSCEPTIBLE_PLANTS[disease] || [];
  return plants.filter(p => {
    const slug = (p.plantSlug || p.plantName || '').toLowerCase();
    return susceptibleTypes.some(type => slug.includes(type));
  });
}

/**
 * LATE BLIGHT RISK
 * Conditions: rain_72h > 20mm AND humidity > 90% for 6+ hours AND temp 15-25°C
 * Devastating for tomatoes and potatoes
 */
export function detectLateBlight(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const rain72h = calculateRain72h(forecast);
  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;

  // Late blight thrives in wet, humid, mild conditions
  const blightRisk = rain72h > 15 && humidity > 80 && temp >= 12 && temp <= 25;
  const highBlightRisk = rain72h >= 25 && humidity >= 90 && temp >= 15 && temp <= 22;

  if (blightRisk || highBlightRisk) {
    const susceptiblePlants = findSusceptiblePlants(plants, 'late_blight');
    const severity: 'warning' | 'critical' = highBlightRisk ? 'critical' : 'warning';
    const riskLevel = highBlightRisk ? 'HIGH' : 'ELEVATED';

    alerts.push({
      type: 'late_blight',
      severity,
      title: `${riskLevel} Late Blight Risk`,
      message: `Weather conditions favor late blight: ${rain72h.toFixed(0)}mm rain in 72h, ` +
        `${humidity}% humidity, ${temp.toFixed(0)}°C average temperature. ` +
        (susceptiblePlants.length > 0
          ? `${susceptiblePlants.length} of your plants (tomatoes, potatoes) are at risk.`
          : 'Monitor tomatoes and potatoes closely.'),
      forecastDate: today.date,
      forecastValue: rain72h,
      affectedPlantIds: susceptiblePlants.map(p => p.id),
      suggestedAction: severity === 'critical'
        ? 'Apply copper-based fungicide immediately. Improve air circulation. Remove lower leaves touching soil.'
        : 'Inspect plants for brown lesions. Consider preventive copper spray. Avoid overhead watering.',
    });
  }

  return alerts;
}

/**
 * POWDERY MILDEW RISK
 * Conditions: high night humidity > 90% AND dry days > 3 AND temp 20-30°C
 * Common on squash, cucumbers, roses
 */
export function detectPowderyMildew(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const dryDays = countDryDays(forecast);
  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;

  // Powdery mildew: dry days but humid nights, warm temps
  const mildewRisk = dryDays >= 3 && humidity > 70 && temp >= 18 && temp <= 30;
  const highMildewRisk = dryDays >= 5 && humidity > 85 && temp >= 20 && temp <= 28;

  if (mildewRisk || highMildewRisk) {
    const susceptiblePlants = findSusceptiblePlants(plants, 'powdery_mildew');
    const severity: 'warning' | 'critical' = highMildewRisk ? 'critical' : 'warning';
    const riskLevel = highMildewRisk ? 'HIGH' : 'ELEVATED';

    alerts.push({
      type: 'powdery_mildew',
      severity,
      title: `${riskLevel} Powdery Mildew Risk`,
      message: `${dryDays} consecutive dry days with ${humidity}% humidity and ${temp.toFixed(0)}°C ` +
        `creates ideal conditions for powdery mildew. ` +
        (susceptiblePlants.length > 0
          ? `${susceptiblePlants.length} of your plants (squash, cucumbers, roses) are at risk.`
          : 'Watch courgettes, cucumbers, and roses.'),
      forecastDate: today.date,
      forecastValue: humidity,
      affectedPlantIds: susceptiblePlants.map(p => p.id),
      suggestedAction: severity === 'critical'
        ? 'Apply sulfur-based fungicide or milk spray (1:10 ratio). Remove affected leaves.'
        : 'Improve air circulation. Water at soil level, not on leaves. Monitor for white patches.',
    });
  }

  return alerts;
}

/**
 * BOTRYTIS (Grey Mold) RISK
 * Conditions: humidity > 85% AND temp 15-25°C AND wet foliage
 */
export function detectBotrytis(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const humidity = today.humidity;
  const temp = (today.tempMin + today.tempMax) / 2;
  const recentRain = today.precipitation > 2;

  // Botrytis: high humidity, moderate temps, wet conditions
  const botrytisRisk = humidity > 80 && temp >= 12 && temp <= 25 && recentRain;
  const highBotrytisRisk = humidity > 90 && temp >= 15 && temp <= 22;

  if (botrytisRisk || highBotrytisRisk) {
    const susceptiblePlants = findSusceptiblePlants(plants, 'botrytis');
    const severity: 'warning' | 'critical' = highBotrytisRisk ? 'critical' : 'warning';

    alerts.push({
      type: 'botrytis',
      severity,
      title: `${severity === 'critical' ? 'HIGH' : 'ELEVATED'} Grey Mold (Botrytis) Risk`,
      message: `Humid conditions (${humidity}%) with ${temp.toFixed(0)}°C temperatures favor botrytis. ` +
        (susceptiblePlants.length > 0
          ? `Watch your strawberries, tomatoes, and lettuce.`
          : 'Monitor soft fruits and dense foliage plants.'),
      forecastDate: today.date,
      forecastValue: humidity,
      affectedPlantIds: susceptiblePlants.map(p => p.id),
      suggestedAction: 'Remove dead/decaying material. Increase spacing for airflow. Avoid wetting leaves when watering.',
    });
  }

  return alerts;
}

/**
 * APHID RISK
 * Conditions: temp > 15°C AND wind < 10km/h AND growing season
 * Calm, warm conditions favor aphid reproduction
 */
export function detectAphidRisk(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const temp = (today.tempMin + today.tempMax) / 2;
  const wind = today.windSpeed;
  const month = new Date().getMonth() + 1;

  // Growing season: April to September (4-9)
  const inGrowingSeason = month >= 4 && month <= 9;

  // Aphids love warm, calm conditions during growing season
  const aphidRisk = inGrowingSeason && temp > 15 && temp < 30 && wind < 15;
  const highAphidRisk = inGrowingSeason && temp >= 18 && temp <= 25 && wind < 8;

  // Check for consecutive favorable days
  const favorableDays = forecast.filter(d =>
    d.windSpeed < 15 && ((d.tempMin + d.tempMax) / 2) > 15
  ).length;

  if ((aphidRisk && favorableDays >= 3) || highAphidRisk) {
    const susceptiblePlants = findSusceptiblePlants(plants, 'aphids');
    const severity: 'info' | 'warning' = highAphidRisk ? 'warning' : 'info';

    alerts.push({
      type: 'aphids',
      severity,
      title: 'Aphid Activity Likely',
      message: `Warm (${temp.toFixed(0)}°C), calm (${wind.toFixed(0)} km/h wind) conditions with ` +
        `${favorableDays} favorable days ahead promote aphid reproduction. ` +
        (susceptiblePlants.length > 0
          ? `Check your roses, beans, and brassicas.`
          : 'Inspect new growth and undersides of leaves.'),
      forecastDate: today.date,
      forecastValue: temp,
      affectedPlantIds: susceptiblePlants.map(p => p.id),
      suggestedAction: 'Check new growth daily. Encourage ladybirds. Blast off with water or use insecticidal soap if found.',
    });
  }

  return alerts;
}

/**
 * SLUG RISK
 * Conditions: rain in last 24h > 5mm AND temp > 5°C AND night time or overcast
 */
export function detectSlugRisk(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const rain = today.precipitation;
  const humidity = today.humidity;
  const temp = today.tempMin;

  // Slugs active after rain, in mild, humid conditions
  const slugRisk = rain > 3 && temp > 5 && humidity > 70;
  const highSlugRisk = rain > 10 && temp > 10 && humidity > 85;

  if (slugRisk || highSlugRisk) {
    const susceptiblePlants = findSusceptiblePlants(plants, 'slugs');
    const severity: 'info' | 'warning' = highSlugRisk ? 'warning' : 'info';

    alerts.push({
      type: 'slugs',
      severity,
      title: 'Slug Activity Expected Tonight',
      message: `Recent rain (${rain.toFixed(0)}mm) with mild temperatures (${temp.toFixed(0)}°C) and ` +
        `${humidity}% humidity creates ideal slug conditions. ` +
        (susceptiblePlants.length > 0
          ? `Protect your lettuce, hostas, and seedlings.`
          : 'Protect vulnerable seedlings and leafy crops.'),
      forecastDate: today.date,
      forecastValue: rain,
      affectedPlantIds: susceptiblePlants.map(p => p.id),
      suggestedAction: 'Go slug hunting after dark with a torch. Set beer traps. Apply slug pellets or wool barriers around vulnerable plants.',
    });
  }

  return alerts;
}

/**
 * WIND DESICCATION RISK
 * Conditions: high wind > 25km/h AND low humidity < 40% AND sunny
 * Rapid moisture loss can damage plants
 */
export function detectWindDesiccation(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast[0];
  if (!today) return alerts;

  const wind = today.windSpeed;
  const gust = today.windGust;
  const humidity = today.humidity;
  const temp = today.tempMax;

  // Wind desiccation: strong wind, low humidity, warm/sunny
  const desiccationRisk = wind > 20 && humidity < 50 && temp > 15;
  const highDesiccationRisk = (wind > 30 || gust > 45) && humidity < 40 && temp > 20;

  if (desiccationRisk || highDesiccationRisk) {
    const severity: 'warning' | 'critical' = highDesiccationRisk ? 'critical' : 'warning';

    // Newly planted and container plants most at risk
    const atRiskPlants = plants.filter(p => {
      const slug = (p.plantSlug || p.plantName || '').toLowerCase();
      return slug.includes('seedling') || p.waterNeeds === 'high';
    });

    alerts.push({
      type: 'wind_desiccation',
      severity,
      title: `${severity === 'critical' ? 'SEVERE' : 'Wind'} Desiccation Risk`,
      message: `Strong wind (${wind.toFixed(0)} km/h, gusts ${gust.toFixed(0)} km/h) combined with ` +
        `low humidity (${humidity}%) will cause rapid moisture loss from leaves and soil. ` +
        `Newly planted and container plants are most vulnerable.`,
      forecastDate: today.date,
      forecastValue: wind,
      affectedPlantIds: atRiskPlants.map(p => p.id),
      suggestedAction: severity === 'critical'
        ? 'Water deeply early morning. Move containers to shelter. Consider temporary windbreaks for vulnerable plants.'
        : 'Increase watering. Mulch to retain soil moisture. Check containers twice daily.',
    });
  }

  return alerts;
}

/**
 * Combined pest & disease alert detection
 */
export function detectPestDiseaseRisks(
  forecast: WeatherForecast[],
  plants: UserPlant[]
): WeatherAlert[] {
  return [
    ...detectLateBlight(forecast, plants),
    ...detectPowderyMildew(forecast, plants),
    ...detectBotrytis(forecast, plants),
    ...detectAphidRisk(forecast, plants),
    ...detectSlugRisk(forecast, plants),
    ...detectWindDesiccation(forecast, plants),
  ];
}

// =============================================================================
// SMART WATERING
// =============================================================================

/**
 * Find the next date when conditions are suitable for watering (not frozen)
 */
function calculateNextUnfrozenDate(forecast: WeatherForecast[]): string {
  for (const day of forecast) {
    // Look for first day with temps above freezing
    if (day.tempMax > 2) { // Give 2°C buffer above freezing
      return day.date;
    }
  }
  // If no warm day in forecast, suggest checking in a week
  const checkDate = new Date();
  checkDate.setDate(checkDate.getDate() + 7);
  return checkDate.toISOString().split('T')[0];
}

/**
 * Calculate smart watering recommendation based on weather
 */
export function calculateWateringRecommendation(
  forecast: WeatherForecast[],
  soil: SoilConditions,
  _plants: UserPlant[]
): WateringRecommendation {
  const today = forecast[0];
  const tomorrow = forecast[1];
  const _dayAfter = forecast[2];

  if (!today) {
    return {
      shouldWater: true,
      reason: 'No forecast available',
      nextWateringDate: new Date().toISOString().split('T')[0],
      adjustmentFactor: 1.0,
      details: [],
    };
  }

  const details: string[] = [];
  let adjustmentFactor = 1.0;
  let shouldWater = true;
  let reason = '';

  // 0. CRITICAL: Check for frozen conditions - NEVER water frozen soil
  const soilIsFrozen = soil.temp6cm <= 0;
  const airIsFreezing = today.tempMax <= 0;
  const airIsNearFreezing = today.tempMin <= 0;

  if (soilIsFrozen) {
    return {
      shouldWater: false,
      reason: 'Soil is frozen - do not water',
      nextWateringDate: calculateNextUnfrozenDate(forecast),
      adjustmentFactor: 0,
      details: [
        `Soil temperature at 6cm: ${soil.temp6cm.toFixed(1)}°C (frozen)`,
        'Watering frozen soil can damage plant roots',
        'Wait for soil to thaw before watering',
      ],
    };
  }

  if (airIsFreezing) {
    return {
      shouldWater: false,
      reason: 'Air temperature below freezing - do not water',
      nextWateringDate: calculateNextUnfrozenDate(forecast),
      adjustmentFactor: 0,
      details: [
        `Maximum temperature today: ${today.tempMax.toFixed(0)}°C`,
        'Water will freeze on contact with plants',
        'Wait for temperatures to rise above freezing',
      ],
    };
  }

  // Add warning if near-freezing (but still can water if soil is warm)
  if (airIsNearFreezing && !soilIsFrozen) {
    details.push(`⚠️ Frost possible tonight (${today.tempMin.toFixed(0)}°C) - water early in the day if needed`);
  }

  // 1. Check soil moisture
  const soilMoisture = soil.moisture1to3cm;
  if (soilMoisture > 50) {
    shouldWater = false;
    reason = 'Soil moisture is adequate';
    details.push(`Soil moisture at 1-3cm: ${soilMoisture.toFixed(0)}% (adequate)`);
  } else if (soilMoisture > 30) {
    details.push(`Soil moisture at 1-3cm: ${soilMoisture.toFixed(0)}% (moderate)`);
  } else {
    details.push(`Soil moisture at 1-3cm: ${soilMoisture.toFixed(0)}% (dry - needs water)`);
    adjustmentFactor = 1.2; // Water more
  }

  // 2. Check incoming rain
  const rainNext24h = today.precipitation + (tomorrow?.precipitation || 0);
  const rainProbability = Math.max(today.precipProbability, tomorrow?.precipProbability || 0);

  if (rainNext24h >= 10 && rainProbability >= 60) {
    shouldWater = false;
    reason = `Significant rain expected (${rainNext24h.toFixed(0)}mm)`;
    details.push(`Rain forecast: ${rainNext24h.toFixed(0)}mm in next 24-48h (${rainProbability}% chance)`);
  } else if (rainNext24h >= 5 && rainProbability >= 50) {
    adjustmentFactor *= 0.5;
    details.push(`Light rain expected: ${rainNext24h.toFixed(0)}mm - reduce watering`);
  } else {
    details.push('No significant rain expected');
  }

  // 3. Check temperature (evaporation)
  if (today.tempMax >= 30) {
    adjustmentFactor *= 1.3;
    details.push(`High temperature (${today.tempMax}°C) increases water needs`);
  } else if (today.tempMax <= 15) {
    adjustmentFactor *= 0.8;
    details.push(`Cool temperature (${today.tempMax}°C) reduces evaporation`);
  }

  // 4. Check wind (evaporation)
  const windFactor = calculateWindWateringFactor(today.windSpeed);
  if (windFactor > 1.0) {
    adjustmentFactor *= windFactor;
    details.push(`Wind speed (${today.windSpeed.toFixed(0)} km/h) increases water loss by ${((windFactor - 1) * 100).toFixed(0)}%`);
  }

  // 5. Check humidity (stronger effect at extreme values)
  if (today.humidity < 30) {
    adjustmentFactor *= 1.25;
    details.push(`Very low humidity (${today.humidity}%) significantly increases evaporation`);
  } else if (today.humidity < 40) {
    adjustmentFactor *= 1.15;
    details.push(`Low humidity (${today.humidity}%) increases evaporation`);
  } else if (today.humidity >= 95) {
    adjustmentFactor *= 0.7;
    details.push(`Very high humidity (${today.humidity}%) greatly reduces evaporation`);
  } else if (today.humidity > 80) {
    adjustmentFactor *= 0.9;
    details.push(`High humidity (${today.humidity}%) reduces evaporation`);
  }

  // 6. Calculate next watering date
  let nextWateringDate = new Date().toISOString().split('T')[0];
  if (!shouldWater) {
    // Suggest checking after rain
    const daysUntilCheck = rainNext24h >= 10 ? 2 : 1;
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + daysUntilCheck);
    nextWateringDate = checkDate.toISOString().split('T')[0];
    reason = reason || 'Conditions suggest skipping today';
  } else if (!reason) {
    reason = adjustmentFactor > 1.2
      ? 'Water more than usual due to conditions'
      : adjustmentFactor < 0.8
        ? 'Light watering recommended'
        : 'Normal watering recommended';
  }

  return {
    shouldWater,
    reason,
    nextWateringDate,
    adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
    details,
  };
}

// =============================================================================
// PLANTING WINDOWS
// =============================================================================

/**
 * Germination soil temperature requirements by plant type
 */
const GERMINATION_TEMPS: Record<string, { min: number; optimal: number }> = {
  tomato: { min: 16, optimal: 24 },
  pepper: { min: 18, optimal: 26 },
  cucumber: { min: 16, optimal: 24 },
  courgette: { min: 15, optimal: 22 },
  squash: { min: 15, optimal: 22 },
  bean: { min: 12, optimal: 18 },
  pea: { min: 7, optimal: 12 },
  carrot: { min: 7, optimal: 15 },
  lettuce: { min: 4, optimal: 15 },
  spinach: { min: 4, optimal: 12 },
  radish: { min: 4, optimal: 15 },
  onion: { min: 7, optimal: 15 },
  garlic: { min: 4, optimal: 12 },
  potato: { min: 7, optimal: 15 },
  brassica: { min: 7, optimal: 15 }, // cabbage, broccoli, etc.
};

/**
 * Calculate planting windows based on soil temperature
 */
export function calculatePlantingWindows(
  soil: SoilConditions,
  forecast: WeatherForecast[],
  plants: UserPlant[]
): PlantingWindow[] {
  const windows: PlantingWindow[] = [];
  const seedDepthTemp = soil.temp6cm; // Most seeds planted at ~6cm

  for (const plant of plants) {
    // Find germination requirements
    const slug = plant.plantSlug?.toLowerCase() || '';
    let germTemp = GERMINATION_TEMPS[slug];

    // Try to match partial slugs
    if (!germTemp) {
      for (const [key, temp] of Object.entries(GERMINATION_TEMPS)) {
        if (slug.includes(key) || key.includes(slug)) {
          germTemp = temp;
          break;
        }
      }
    }

    if (!germTemp) continue; // Skip plants without germination data

    const canPlantNow = seedDepthTemp >= germTemp.min;
    let reason = '';
    let daysUntilReady: number | undefined;

    if (canPlantNow) {
      if (seedDepthTemp >= germTemp.optimal) {
        reason = `Soil temperature (${seedDepthTemp.toFixed(1)}°C) is optimal for germination`;
      } else {
        reason = `Soil temperature (${seedDepthTemp.toFixed(1)}°C) is adequate but below optimal (${germTemp.optimal}°C)`;
      }
    } else {
      // Estimate days until soil warms up
      // Rough estimate: soil warms ~0.5°C per day in spring
      const tempDeficit = germTemp.min - seedDepthTemp;
      daysUntilReady = Math.ceil(tempDeficit / 0.5);
      reason = `Soil too cold (${seedDepthTemp.toFixed(1)}°C). Need ${germTemp.min}°C minimum. Wait ~${daysUntilReady} days.`;
    }

    windows.push({
      plantSlug: plant.plantSlug || plant.plantName,
      canPlantNow,
      reason,
      soilTempRequired: germTemp.min,
      currentSoilTemp: seedDepthTemp,
      daysUntilReady,
    });
  }

  return windows;
}

// =============================================================================
// MAIN ENGINE
// =============================================================================

/**
 * Main weather task engine - analyzes weather and generates recommendations
 */
export function analyzeWeatherForTasks(
  forecast: WeatherForecast[],
  soil: SoilConditions,
  plants: UserPlant[],
  plannedActivities: string[] = []
): WeatherTaskResult {
  // Generate all weather alerts
  const frostAlerts = detectFrostRisk(forecast, plants);
  const heatAlerts = detectHeatStress(forecast, plants);
  const windAlerts = detectWindRisk(forecast);

  // Generate pest & disease alerts based on weather conditions
  const pestDiseaseAlerts = detectPestDiseaseRisks(forecast, plants);

  // Analyze wind impact on activities
  const windAdjustments = assessWindImpact(forecast, plannedActivities);

  // Calculate watering recommendation
  const wateringRecommendation = calculateWateringRecommendation(forecast, soil, plants);

  // Calculate planting windows
  const plantingWindows = calculatePlantingWindows(soil, forecast, plants);

  // Combine and sort all alerts by severity
  const allAlerts = [...frostAlerts, ...heatAlerts, ...windAlerts, ...pestDiseaseAlerts];
  allAlerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return {
    alerts: allAlerts,
    taskAdjustments: windAdjustments,
    wateringRecommendation,
    plantingWindows,
  };
}

/**
 * Quick check: any urgent alerts?
 */
export function hasUrgentAlerts(result: WeatherTaskResult): boolean {
  return result.alerts.some(a => a.severity === 'critical');
}

/**
 * Quick check: should water today?
 */
export function shouldWaterToday(result: WeatherTaskResult): boolean {
  return result.wateringRecommendation.shouldWater &&
    result.wateringRecommendation.adjustmentFactor >= 0.5;
}
