/**
 * Air Quality utilities for health-aware recommendations
 * Based on US EPA Air Quality Index (AQI) standards
 */

export enum AirQualityLevel {
  NONE = 0,           // No data
  GOOD = 1,           // 0-50: Air quality satisfactory
  MODERATE = 2,       // 51-100: Acceptable, mild risk for sensitive people
  UNHEALTHY_SENSITIVE = 3, // 101-150: Asthma, elderly, children affected
  UNHEALTHY = 4,      // 151-200: Everyone may feel effects
  VERY_UNHEALTHY = 5, // 201-300: Health alert, emergency conditions
  HAZARDOUS = 6       // 301-500: Serious health effects for entire population
}

export interface AirQualitySummary {
  overall?: number;    // Overall AQI
  pm2_5?: number;      // PM2.5 particulate matter
  pm10?: number;       // PM10 particulate matter  
  no2?: number;        // Nitrogen dioxide
  o3?: number;         // Ozone
  so2?: number;        // Sulfur dioxide
  co?: number;         // Carbon monoxide
}

export interface AirQualityAssessment {
  overall: AirQualityLevel;
  pm2_5: AirQualityLevel;
  pm10: AirQualityLevel;
  no2: AirQualityLevel;
  o3: AirQualityLevel;
  so2: AirQualityLevel;
  co: AirQualityLevel;
  warnings: string[];
}

/**
 * Convert AQI value to Air Quality Level
 */
export function getAirQualityLevel(aqi: number | undefined): AirQualityLevel {
  if (aqi === undefined || aqi < 0) return AirQualityLevel.NONE;
  
  if (aqi <= 50) return AirQualityLevel.GOOD;
  if (aqi <= 100) return AirQualityLevel.MODERATE;
  if (aqi <= 150) return AirQualityLevel.UNHEALTHY_SENSITIVE;
  if (aqi <= 200) return AirQualityLevel.UNHEALTHY;
  if (aqi <= 300) return AirQualityLevel.VERY_UNHEALTHY;
  return AirQualityLevel.HAZARDOUS;
}

/**
 * Get human-readable description for air quality level
 */
export function getAirQualityLevelDescription(level: AirQualityLevel): string {
  switch (level) {
    case AirQualityLevel.NONE: return 'No data';
    case AirQualityLevel.GOOD: return 'Good';
    case AirQualityLevel.MODERATE: return 'Moderate';
    case AirQualityLevel.UNHEALTHY_SENSITIVE: return 'Unhealthy for Sensitive Groups';
    case AirQualityLevel.UNHEALTHY: return 'Unhealthy';
    case AirQualityLevel.VERY_UNHEALTHY: return 'Very Unhealthy';
    case AirQualityLevel.HAZARDOUS: return 'Hazardous';
    default: return 'Unknown';
  }
}

/**
 * Get AQI index value for display
 */
export function getAirQualityIndex(aqi: number | undefined): number {
  return Math.round(aqi || 0);
}

/**
 * Assess air quality conditions and provide warnings
 */
export function assessAirQualityConditions(airQuality: AirQualitySummary): AirQualityAssessment {
  const assessment: AirQualityAssessment = {
    overall: getAirQualityLevel(airQuality.overall),
    pm2_5: getAirQualityLevel(airQuality.pm2_5),
    pm10: getAirQualityLevel(airQuality.pm10),
    no2: getAirQualityLevel(airQuality.no2),
    o3: getAirQualityLevel(airQuality.o3),
    so2: getAirQualityLevel(airQuality.so2),
    co: getAirQualityLevel(airQuality.co),
    warnings: []
  };

  // Generate warnings based on levels
  if (assessment.overall >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    if (assessment.overall === AirQualityLevel.UNHEALTHY_SENSITIVE) {
      assessment.warnings.push('Air quality may affect sensitive individuals (asthma, elderly, children)');
    } else if (assessment.overall === AirQualityLevel.UNHEALTHY) {
      assessment.warnings.push('Air quality may cause health effects for everyone');
    } else if (assessment.overall === AirQualityLevel.VERY_UNHEALTHY) {
      assessment.warnings.push('Health alert: Emergency conditions for sensitive groups');
    } else if (assessment.overall === AirQualityLevel.HAZARDOUS) {
      assessment.warnings.push('Health emergency: Serious effects for entire population');
    }
  }

  // Specific pollutant warnings
  if (assessment.pm2_5 >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    assessment.warnings.push('High PM2.5 levels may affect breathing');
  }
  if (assessment.pm10 >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    assessment.warnings.push('High PM10 levels may irritate airways');
  }
  if (assessment.o3 >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    assessment.warnings.push('High ozone levels may affect outdoor activities');
  }
  if (assessment.no2 >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    assessment.warnings.push('High NO2 levels may affect respiratory system');
  }

  return assessment;
}

/**
 * Build air quality advice for activities
 */
export function buildAirQualityAdvice(assessment: AirQualityAssessment): string[] {
  const advice: string[] = [];
  
  if (assessment.overall >= AirQualityLevel.UNHEALTHY_SENSITIVE) {
    advice.push(`Air quality is ${getAirQualityLevelDescription(assessment.overall).toLowerCase()}`);
    
    if (assessment.overall >= AirQualityLevel.UNHEALTHY) {
      advice.push('Consider indoor activities or wearing a mask outdoors');
    } else {
      advice.push('Sensitive individuals should limit outdoor activities');
    }
  }

  return advice;
}

/**
 * Check if air quality should exclude certain activities
 */
export function shouldExcludeForAirQuality(
  assessment: AirQualityAssessment, 
  activityType: string
): boolean {
  // Don't show air quality warnings for indoor activities
  const indoorActivities = ['museums', 'shopping', 'cinema', 'restaurants', 'galleries'];
  if (indoorActivities.some(indoor => activityType.toLowerCase().includes(indoor))) {
    return true;
  }

  // Don't show for activities that are already location-constrained
  const locationConstrainedActivities = ['marine', 'diving', 'snorkeling'];
  if (locationConstrainedActivities.some(constrained => activityType.toLowerCase().includes(constrained))) {
    return true;
  }

  return false;
}
