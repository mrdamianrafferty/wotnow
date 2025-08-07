// Utility functions for weather descriptions: wind, rain, wave/swell

// Wind speed (km/h) to Beaufort description
export function getBeaufortDescription(windKmh: number): string {
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
export function getRainfallDescription(mm: number, hours: number = 1): string {
  if (mm === 0) return 'No rain';
  const mmPerHour = mm / hours;

  // Hourly/short period gradations
  if (hours <= 3) {
    if (mmPerHour < 0.1) return 'Drizzle';
    if (mmPerHour < 1) return 'Very light rain';
    if (mmPerHour < 2.5) return 'Light rain';
    if (mmPerHour < 7.6) return 'Moderate rain';
    if (mmPerHour < 50) return 'Heavy rain';
    return '⚠️ Violent rain';
  }

  // Daily gradations
  if (mm < 0.1) return 'No rain';
  if (mm < 1) return 'Very light rain';
  if (mm < 10) return 'Light rain';
  if (mm < 30) return 'Moderate rain';
  if (mm < 70) return 'Heavy rain';
  if (mm < 150) return '⚠️ Very heavy rain';
  if (mm < 151) return '⚠️ Extremely heavy rain';
  return '⚠️ Violent rain';
}

// Wave/swell height (meters) to description
export function getWaveDescription(meters: number): string {
  if (meters < 0.1) return 'Flat – like glass (perfect for SUP)';
  if (meters < 0.3) return 'Ripples – calm and easy';
  if (meters < 0.6) return 'Tiny waves – good for beginners or easy paddling';
  if (meters < 1) return 'Knee-high waves – mellow surf';
  if (meters < 1.5) return 'Waist-high waves – small but fun';
  if (meters < 2) return 'Shoulder-high surf – ideal for many surfers';
  if (meters < 3) return 'Head-high to overhead waves – powerful and fun';
  if (meters < 4) return '⚠️ Well overhead – advanced conditions';
  return '⚠️ Heavy swell – expert only, potentially dangerous';
}

// Snowfall intensity and winter conditions
export function getSnowfallDescription({
  mm = 0,
  visibilityKm = 10,
  windKmh = 0,
  isFlurry = false,
  isShower = false,
  isSquall = false,
  isBlowing = false,
  isBlizzard = false,
}: {
  mm?: number;           // Snowfall amount (mm)
  visibilityKm?: number; // Visibility in km
  windKmh?: number;      // Wind speed in km/h
  isFlurry?: boolean;
  isShower?: boolean;
  isSquall?: boolean;
  isBlowing?: boolean;
  isBlizzard?: boolean;
}): string {
  if (isBlizzard || (windKmh >= 56 && visibilityKm <= 0.4)) {
    return '⚠️ Blizzard';
  }
  if (isSquall || (windKmh >= 40 && mm > 5)) {
    return 'Snow squall';
  }
  if (isBlowing || (windKmh >= 30 && mm > 0)) {
    return 'Blowing snow';
  }
  if (isFlurry || (mm > 0 && mm < 1 && !isShower)) {
    return 'Snow flurries';
  }
  if (isShower || (mm >= 1 && mm < 5)) {
    return 'Snow showers';
  }
  if (visibilityKm > 1) {
    return 'Light snow';
  }
  if (visibilityKm > 0.5) {
    return 'Moderate snow';
  }
  if (visibilityKm <= 0.5) {
    return '⚠️ Heavy snow';
  }
  return mm === 0 ? 'No snow' : 'Snow';
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
  if (humidity >= 20) return 'A bit dry';
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