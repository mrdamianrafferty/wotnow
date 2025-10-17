// Utility functions for weather descriptions: wind, rain, wave/swell

// Wind speed (m/s) to Beaufort description - UPDATED to use m/s as standard unit
export function getBeaufortDescription(windMs: number): string {
  // Convert m/s to km/h for Beaufort scale thresholds
  const windKmh = windMs * 3.6;
  
  if (windKmh < 2) return 'Calm';
  if (windKmh < 6) return 'Light air';
  if (windKmh < 12) return 'Light breeze';
  if (windKmh < 20) return 'Gentle breeze';
  if (windKmh < 29) return 'Moderate breeze';
  if (windKmh < 39) return 'Fresh breeze';
  if (windKmh < 50) return 'Strong breeze';
  if (windKmh < 62) return '⚠️ Near gale';
  if (windKmh < 75) return '⚠️ Gale';
  if (windKmh < 89) return '⚠️ Severe gale';
  if (windKmh < 103) return '⚠️ Storm';
  if (windKmh < 118) return '⚠️ Violent storm';
  return '⚠️ 🌀 Hurricane';
}

// Rainfall (mm) and period (hours) to intensity description
// Aligned with WMO, Met Office, and NOAA standards
export function getRainfallDescription(mm: number, hours: number = 1): string {
  // Guard against invalid inputs and division by zero
  const validMm = Number.isFinite(mm) ? Math.max(0, mm) : 0;
  const validHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
  if (validMm === 0) return 'No rain';
  const mmPerHour = validMm / validHours;

  // Hourly/short period gradations (aligned with meteorological standards)
  if (validHours <= 3) {
    if (mmPerHour < 0.1) return 'Drizzle';
    if (mmPerHour < 0.5) return 'Very light rain';
    if (mmPerHour < 2.5) return 'Light rain';
    if (mmPerHour < 10) return 'Moderate rain';        // Extended to WMO upper bound
    if (mmPerHour < 50) return 'Heavy rain';           // Starts at WMO heavy threshold
    return '⚠️ Violent rain';
  }

  // Daily gradations (scaled proportionally from hourly standards)
  if (validMm < 2.4) return 'Very light rain';              // 0.1-0.5 mm/h × 24h = 2.4-12mm
  if (validMm < 12) return 'Light rain';                    // 0.5-2.5 mm/h × 24h = 12-60mm  
  if (validMm < 60) return 'Moderate rain';                 // 2.5-10 mm/h × 24h = 60-240mm
  if (validMm < 150) return 'Heavy rain';                   // Practical heavy daily range
  if (validMm < 240) return '⚠️ Very heavy rain';           // 10-50 mm/h × 24h = 240-1200mm
  return '⚠️ Violent rain';
}

// Combined rainfall description with hourly fallback
export function getRainfallDescriptionWithHourly(
  dailyMm: number, 
  hourlyData?: Array<{ time?: string; dt?: number; rain?: number | { '1h'?: number; '3h'?: number }; precipitation?: number }>
): string {
  const validDailyMm = Number.isFinite(dailyMm) ? Math.max(0, dailyMm) : 0;
  // If significant daily rain (>12mm = light rain threshold), use regular description
  if (validDailyMm >= 12) {
    return getRainfallDescription(validDailyMm, 24);
  }
  
  // If no hourly data provided, fall back to daily description
  if (!hourlyData || hourlyData.length === 0) {
    return getRainfallDescription(validDailyMm, 24);
  }
  
  const EPS = 0.05; // filter out float noise, keep meaningful drizzle

  // Find all hours with rain and get the maximum intensity
  const hoursWithRain = hourlyData
    .map(hour => {
      const rainField = hour.rain as unknown as number | { '1h'?: number; '3h'?: number } | undefined;
      let rainAmount: number | undefined;

      if (typeof rainField === 'number' && Number.isFinite(rainField)) {
        rainAmount = rainField;
      } else if (rainField && typeof rainField === 'object') {
        if (typeof rainField['1h'] === 'number' && Number.isFinite(rainField['1h'])) {
          rainAmount = rainField['1h'];
        } else if (typeof rainField['3h'] === 'number' && Number.isFinite(rainField['3h'])) {
          // Normalize 3h total to per-hour average for intensity classification
          rainAmount = rainField['3h'] / 3;
        }
      }

      const precip = typeof hour.precipitation === 'number' && Number.isFinite(hour.precipitation) ? hour.precipitation : 0;
      const amt = Number.isFinite(rainAmount as number) ? (rainAmount as number) : precip;

      return {
        ...hour,
        rainAmount: Math.max(0, amt)
      };
    })
    .filter(hour => hour.rainAmount > EPS);
  
  if (hoursWithRain.length === 0) {
    return validDailyMm > 0 ? getRainfallDescription(validDailyMm, 24) : 'No rain';
  }
  
  // Get the hour with maximum rainfall for intensity assessment
  const maxRainHour = hoursWithRain.reduce((max, current) => 
    current.rainAmount > max.rainAmount ? current : max
  );
  
  // Format time string
  let timeStr = '';
  if (maxRainHour.time) {
    const hour = new Date(maxRainHour.time).getHours();
    timeStr = ` around ${hour.toString().padStart(2, '0')}:00`;
  } else if (maxRainHour.dt) {
    const hour = new Date(maxRainHour.dt * 1000).getHours();
    timeStr = ` around ${hour.toString().padStart(2, '0')}:00`;
  }
  
  // Use standardized thresholds for intensity classification
  const intensity = getRainfallDescription(maxRainHour.rainAmount, 1);
  
  // If multiple hours have rain, don't use "mostly dry" prefix
  if (hoursWithRain.length >= 3) {
    return `Intermittent ${intensity.toLowerCase()}${timeStr ? ` (peak${timeStr})` : ''}`;
  }
  
  // For isolated rain events, use "mostly dry" prefix
  if (intensity === 'Drizzle' || intensity === 'Very light rain') {
    return `Mostly dry, chance of light showers${timeStr}`;
  } else if (intensity === 'Light rain') {
    return `Mostly dry, chance of light rain${timeStr}`;
  } else if (intensity === 'Moderate rain') {
    return `Mostly dry, chance of rain${timeStr}`;
  } else {
    return `Mostly dry, chance of heavy rain${timeStr}`;
  }
}

// Wave/swell height (meters) to description
export function getWaveDescription(meters: number): string {
  if (meters < 0.1) return 'Flat – like glass (perfect for SUP)';
  if (meters < 0.3) return 'Ripples – calm and easy';
  if (meters < 0.6) return 'Tiny waves –  easy paddling';
  if (meters < 1) return 'Knee-high waves – mellow surf';
  if (meters < 1.5) return 'Waist-high waves – small but fun for surfing and managable for most other water users';
  if (meters < 2) return 'Shoulder-high surf – ideal for many surfers but a struggle for other water users';
  if (meters < 3) return 'Head-high to overhead waves – powerful and fun for advanced surfers but too much for pretty much everyone else';
  if (meters < 4) return '⚠️ Well overhead – dangerous conditions';
  return '⚠️ Heavy swell – expert only, potentially dangerous';
}

// Short wave/swell height descriptor (1-2 words)
export function getWaveDescriptionShort(meters: number): string {
  if (meters < 0.1) return 'Flat';
  if (meters < 0.3) return 'Ripples';
  if (meters < 0.6) return 'Tiny';
  if (meters < 1) return 'Knee-high';
  if (meters < 1.5) return 'Waist-high';
  if (meters < 2) return 'Shoulder-high';
  if (meters < 3) return 'Head-high';
  if (meters < 4) return '⚠️ Overhead';
  return '⚠️ Heavy swell';
}

// Complete snow classification system combining depth, active snowfall, and weather conditions
export function getSnowDescription(
  snowDepthCm: number = 0, 
  snowfallRateMmH: number = 0,
  conditions?: {
    visibilityKm?: number;
    windKmh?: number;
    isFlurry?: boolean;
    isShower?: boolean;
    isSquall?: boolean;
    isBlowing?: boolean;
    isBlizzard?: boolean;
  }
): string {
  const {
    visibilityKm = 10,
    windKmh = 0,
    isFlurry = false,
    isShower = false,
    isSquall = false,
    isBlowing = false,
    isBlizzard = false
  } = conditions || {};

  // Priority 1: Severe weather conditions (override everything else)
  if (isBlizzard || (windKmh >= 56 && visibilityKm <= 0.4)) {
    return '⚠️ Blizzard conditions';
  }
  if (isSquall || (windKmh >= 40 && snowfallRateMmH > 2.5)) {
    return '⚠️ Snow squall';
  }
  if (isBlowing || (windKmh >= 30 && (snowfallRateMmH > 0 || snowDepthCm > 0))) {
    return 'Blowing snow';
  }

  // Priority 2: Active snowfall conditions
  if (snowfallRateMmH > 0) {
    let intensityDesc = '';
    
    // Determine base intensity
    if (isFlurry || snowfallRateMmH < 0.5) {
      intensityDesc = 'Snow flurries';
    } else if (isShower || (snowfallRateMmH >= 0.5 && snowfallRateMmH < 2.5)) {
      intensityDesc = 'Light snow showers';
    } else if (snowfallRateMmH < 2.5) {
      intensityDesc = 'Light snowfall';
    } else if (snowfallRateMmH < 10) {
      intensityDesc = 'Moderate snowfall';
    } else {
      intensityDesc = 'Heavy snowfall';
    }

    // Modify based on visibility if significantly reduced
    if (visibilityKm <= 0.5) {
      intensityDesc = intensityDesc.replace('Light', 'Moderate').replace('Moderate', 'Heavy');
      if (!intensityDesc.includes('Heavy')) {
        intensityDesc = 'Heavy ' + intensityDesc.toLowerCase();
      }
    } else if (visibilityKm <= 1 && !intensityDesc.includes('Light')) {
      intensityDesc = 'Moderate to heavy snowfall';
    }

    // Add snow depth context if significant
    if (snowDepthCm >= 30) {
      return intensityDesc + ' on deep snow base';
    } else if (snowDepthCm >= 5) {
      return intensityDesc + ' on existing snow cover';
    }
    
    return intensityDesc;
  }

  // Priority 3: Snow depth descriptions (no active snowfall)
  if (snowDepthCm === 0) {
    return 'No snow';
  } else if (snowDepthCm < 1) {
    return 'Dusting of snow';
  } else if (snowDepthCm < 5) {
    return 'Light snow cover';
  } else if (snowDepthCm < 15) {
    return 'Moderate snow cover';
  } else if (snowDepthCm < 30) {
    return 'Significant snow cover';
  } else if (snowDepthCm < 50) {
    return 'Deep snow';
  } else if (snowDepthCm < 100) {
    return 'Very deep snow';
  } else if (snowDepthCm < 200) {
    return 'Exceptionally deep snow';
  } else {
    return '⚠️ Extreme snow depth';
  }
}

// Simplified function for backwards compatibility and basic use cases
export function getSnowDescriptionSimple(snowDepthCm: number, snowfallRateMmH: number = 0): string {
  return getSnowDescription(snowDepthCm, snowfallRateMmH);
}

// Enhanced snowfall-specific description with meteorological detail
export function getSnowfallDescription({
  snowfallMmH = 0,
  visibilityKm = 10,
  windKmh = 0,
  isFlurry = false,
  isShower = false,
  isSquall = false,
  isBlowing = false,
  isBlizzard = false,
}: {
  snowfallMmH?: number;
  visibilityKm?: number;
  windKmh?: number;
  isFlurry?: boolean;
  isShower?: boolean;
  isSquall?: boolean;
  isBlowing?: boolean;
  isBlizzard?: boolean;
}): string {
  return getSnowDescription(0, snowfallMmH, {
    visibilityKm,
    windKmh,
    isFlurry,
    isShower,
    isSquall,
    isBlowing,
    isBlizzard
  });
}



// Temperature (°C) to comfort description
export function getTemperatureDescription(tempC: number, feelsLikeC?: number): string {
  const t = feelsLikeC ?? tempC;
  if (t >= 35) return 'Scorching hot';
  if (t >= 28) return 'Hot – keep hydrated';
  if (t >= 22) return 'Lovely and warm';
  if (t >= 16) return 'Mild and mellow';
  if (t >= 10) return 'Cool';
  if (t >= 4) return 'Definitely chilly';
  if (t >= -5) return 'Cold – wrap up well';
  if (t < -5) return '⚠️ Freezing – gloves essential';
  return 'Can’t tell the temperature';
}

// Humidity (%) to comfort description
export function getHumidityDescription(humidity: number, temperatureC?: number): string {
  const isCold = temperatureC !== undefined && temperatureC < 10;

  if (humidity >= 85) return isCold ? 'Cold and clammy' : 'Sticky and sweaty';
  if (humidity >= 70) return isCold ? 'Damp and chilly' : 'A bit clammy';
  if (humidity >= 40) return 'Humidity feels fine';
  if (humidity >= 20) return 'Air is a bit on the dry side';
  if (humidity < 20) return 'Air is dry as a bone';
  return 'Humidity unknown';
}

// Water temperature (°C) to comfort/suitability description for marine activities
export function getWaterTemperatureDescription(tempC: number): string {
  if (tempC >= 28) return 'Sea is very warm';
  if (tempC >= 22) return 'Sea is warm';
  if (tempC >= 18) return 'Sea is pleasantly cool';
  if (tempC >= 14) return 'Sea is cool – wetsuit helpful';
  if (tempC >= 8) return 'Sea is cold – full wetsuit needed';
  if (tempC >= 0) return 'Sea is very cold – drysuit advised';
  return '⚠️ Sea is icy';
}
// Swell period and direction analysis for surfers and sea users
export function getSwellMessage({
  periodSeconds,
  swellDirection,
  windDirection,
}: {
  periodSeconds?: number;
  swellDirection?: number; // degrees
  windDirection?: number;  // degrees
}): string | null {
  if (!periodSeconds) return null;

  if (periodSeconds >= 12) {
    return 'Long-period swell – clean and powerful';
  }

  if (periodSeconds < 6) {
    return 'Short-period swell – likely choppy';
  }

  if (
    swellDirection !== undefined &&
    windDirection !== undefined &&
    Math.abs(swellDirection - windDirection) > 60
  ) {
    return 'Cross swell – bumpy and inconsistent';
  }

  return null; // No additional message needed
}

// Visibility (km) to description, with a Go Daisy / WotNow friendly voice
export function getVisibilityDescription(visibilityKm: number): string | null {
  if (visibilityKm < 0.1) return 'Can’t see a thing – wrapped in dense fog!';
  if (visibilityKm < 0.5) return 'Thick fog – shapes just drift out of nowhere';
  if (visibilityKm < 1) return 'Foggy out there – take it steady';
  if (visibilityKm < 4) return 'Hazy view – the world feels a bit blurry';
  if (visibilityKm < 10) return 'Decent visibility – look sharp';
  if (visibilityKm < 20) return 'Clear view – horizons looking good';
  if (visibilityKm >= 20) return 'Crystal clear – see for miles and miles!';
  return null; // Skip if in-between ranges we don’t need to call out
}

// Visibility log-scale helpers
export function visibilityPercentLog(valueKm: number, maxKm: number): number {
  const v = Math.max(0, Math.min(maxKm, Number(valueKm) || 0));
  const pct = (Math.log(1 + v) / Math.log(1 + maxKm)) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

export function visibilityPercentLand(valueKm: number): number {
  // OpenWeather typically caps at 10 km
  return visibilityPercentLog(valueKm, 10);
}

export function visibilityPercentMarine(valueKm: number): number {
  // Stormglass commonly reports up to ~24 km
  return visibilityPercentLog(valueKm, 24);
}

export function getWindMessage({
  windSpeed,
  gustSpeed,
  windDirection,
  windDirectionsToday,
  beachOrientation,
  context = 'land',
}: {
  /** Wind speed in m/s (meters per second) - standard internal unit */
  windSpeed?: number;
  /** Gust speed in m/s (meters per second) */
  gustSpeed?: number;
  windDirection?: number;
  windDirectionsToday?: number[];
  beachOrientation?: number;
  context?: 'land' | 'marine';
}): string | null {
  return context === 'marine'
    ? buildWindMessageMarine({ windSpeed, gustSpeed, windDirection, windDirectionsToday, beachOrientation })
    : buildWindMessageLand({ windSpeed, gustSpeed, windDirection, windDirectionsToday });
}

export function getCompassDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(degrees / 45) % 8;
  return directions[idx];
}

function getOnshoreOffshoreLabel(
  windDeg: number,
  beachDeg: number
): 'onshore' | 'offshore' | 'cross-shore' {
  // Smallest angular difference 0..180
  const diff = Math.abs(((windDeg - beachDeg + 540) % 360) - 180);
  if (diff <= 30) return 'onshore';
  if (diff >= 150) return 'offshore';
  return 'cross-shore';
}

function buildWindMessageLand({
  windSpeed,
  gustSpeed,
  windDirection,
  windDirectionsToday,
}: {
  /** Wind speed in m/s (meters per second) */
  windSpeed?: number,
  /** Gust speed in m/s (meters per second) */
  gustSpeed?: number,
  windDirection?: number,
  windDirectionsToday?: number[],
}): string | null {
  if (!windSpeed) return null;

  // windSpeed is now in m/s, pass directly to getBeaufortDescription
  const base = getBeaufortDescription(windSpeed);
  const direction = typeof windDirection === 'number'
    ? `from the ${getCompassDirection(windDirection)}`
    : '';

  let gustEmoji = '';
  let gustText = '';
  if (gustSpeed && gustSpeed > windSpeed * 1.5) {
    gustEmoji = '🌬️';
    gustText = ' – gusty conditions';
  }

  let shiftEmoji = '';
  let shiftText = '';
  if (windDirectionsToday && windDirectionsToday.length > 1) {
    const min = Math.min(...windDirectionsToday);
    const max = Math.max(...windDirectionsToday);
    const swing = max - min;
    if (swing > 90) {
      shiftEmoji = '🔄';
      shiftText = ' – changing direction';
    }
  }

  // Convert m/s to km/h for threshold check
  const kmh = windSpeed * 3.6;
  if (kmh < 6) return '🌬️ Light air – flat calm';

  const warnEmoji = kmh >= 62 ? '⚠️ ' : '';
  const emojiPrefix = `${warnEmoji}${shiftEmoji}${gustEmoji}`.trim();
  const prefix = emojiPrefix ? `${emojiPrefix} ` : '';
  const suffix = `${shiftText}${gustText}`.trim();

  return `${prefix}${base} ${direction}${suffix ? ` ${suffix}` : ''}`.trim();
}

function buildWindMessageMarine({
  windSpeed,
  gustSpeed,
  windDirection,
  windDirectionsToday,
  beachOrientation
}: {
  /** Wind speed in m/s (meters per second) */
  windSpeed?: number,
  /** Gust speed in m/s (meters per second) */
  gustSpeed?: number,
  windDirection?: number,
  windDirectionsToday?: number[],
  beachOrientation?: number
}): string | null {
  if (!windSpeed) return null;

  // windSpeed is now in m/s, pass directly to getBeaufortDescription
  const base = getBeaufortDescription(windSpeed);
  const direction = typeof windDirection === 'number'
    ? `from the ${getCompassDirection(windDirection)}`
    : '';

  let gustEmoji = '';
  let gustText = '';
  if (gustSpeed && gustSpeed > windSpeed * 1.3) {
    gustEmoji = '🌬️';
    gustText = ' – gusts could affect handling';
  }

  let shiftEmoji = '';
  let shiftText = '';
  if (windDirectionsToday && windDirectionsToday.length > 1) {
    const min = Math.min(...windDirectionsToday);
    const max = Math.max(...windDirectionsToday);
    const swing = max - min;
    if (swing > 60) {
      shiftEmoji = '🔄';
      shiftText = ' – variable direction';
    }
  }

  // Orientation suffix, e.g. (onshore)
  const orientationSuffix = (typeof windDirection === 'number' && typeof beachOrientation === 'number')
    ? ` (${getOnshoreOffshoreLabel(windDirection, beachOrientation)})`
    : '';

  // Convert m/s to km/h for threshold check
  const kmh = windSpeed * 3.6;
  if (kmh < 6) return `🌬️ Light air – smooth seas${orientationSuffix}`.trim();

  const warnEmoji = kmh >= 62 ? '⚠️ ' : '';
  const emojiPrefix = `${warnEmoji}${shiftEmoji}${gustEmoji}`.trim();
  const prefix = emojiPrefix ? `${emojiPrefix} ` : '';
  const suffix = `${shiftText}${gustText}`.trim();

  return `${prefix}${base} ${direction}${suffix ? ` ${suffix}` : ''}${orientationSuffix}`.trim();
}
