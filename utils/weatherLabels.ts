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
  if (windKmh < 62) return 'Near gale';
  if (windKmh < 75) return 'Gale';
  if (windKmh < 89) return 'Severe gale';
  if (windKmh < 103) return 'Storm';
  if (windKmh < 118) return 'Violent storm';
  return 'Hurricane';
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
    return 'Violent rain';
  }

  // Daily gradations
  if (mm < 0.1) return 'No rain';
  if (mm < 1) return 'Very light rain';
  if (mm < 10) return 'Light rain';
  if (mm < 30) return 'Moderate rain';
  if (mm < 70) return 'Heavy rain';
  if (mm < 150) return 'Very heavy rain';
  if (mm < 151) return 'Extremely heavy rain';
  return 'Violent rain';
}

// Wave/swell height (meters) to description
export function getWaveDescription(meters: number): string {
  if (meters < 0.1) return 'Flat';
  if (meters < 2) return 'Low waves';
  if (meters < 4) return 'Moderate waves';
  return 'Heavy waves';
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
    return 'Blizzard';
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
    return 'Heavy snow';
  }
  return mm === 0 ? 'No snow' : 'Snow';
}

// Temperature (°C) to comfort description
export function getTemperatureDescription(tempC: number, feelsLikeC?: number): string {
  const t = feelsLikeC ?? tempC;
  if (t >= 35) return 'Heatwave';
  if (t >= 28) return 'Very hot';
  if (t >= 22) return 'Warm and pleasant';
  if (t >= 16) return 'Mild';
  if (t >= 10) return 'Cool';
  if (t >= 4) return 'Chilly';
  if (t >= -5) return 'Cold';
  if (t < -5) return 'Freezing';
  return 'Unknown temperature';
}

// Humidity (%) to comfort description
export function getHumidityDescription(humidity: number): string {
  if (humidity >= 85) return 'Very humid';
  if (humidity >= 70) return 'Humid';
  if (humidity >= 40) return 'Comfortable humidity';
  if (humidity >= 20) return 'Dry air';
  if (humidity < 20) return 'Very dry air';
  return 'Unknown humidity';
}

// Water temperature (°C) to comfort/suitability description for marine activities
export function getWaterTemperatureDescription(tempC: number): string {
  if (tempC >= 28) return 'Very warm water';
  if (tempC >= 22) return 'Warm water';
  if (tempC >= 18) return 'Mild water';
  if (tempC >= 14) return 'Cool water (wetsuit recommended)';
  if (tempC >= 8) return 'Cold water (full wetsuit needed)';
  if (tempC >= 0) return 'Very cold water (dry suit advised)';
  return 'Freezing water';
}