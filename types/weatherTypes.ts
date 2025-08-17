/**
 * All windSpeed fields are in m/s (meters per second) throughout the pipeline.
 * Only convert to knots or km/h for display/UI.
 */
export interface MarineHour {
  time: string;
  waveHeight?: { noaa?: number };
  waterTemperature?: { noaa?: number };
  swellHeight?: { noaa?: number };
  swellPeriod?: { noaa?: number };
  windSpeed?: { noaa?: number }; // m/s
  windDirection?: { noaa?: number };
  windGust?: { noaa?: number };
  swellDirection?: { noaa?: number };
  visibility?: { noaa?: number };
  precipitation?: { noaa?: number };
  currentSpeed?: { noaa?: number };
  currentDirection?: { noaa?: number };
  [key: string]: any; // Allow additional fields
}
// ...add any other fields you use


export interface WeatherForecastDay {
  date: number;
  temperature: number;
  tempMax?: number;
  tempMin?: number;
  condition?: string;
  description?: string;
  icon?: string;
  rain?: number;
  /** Wind speed in m/s (meters per second) - standard internal unit */
  wind_speed?: number;
  /** Gust speed in m/s (meters per second) - standard internal unit */
  gust_speed?: number;
  wind_direction?: number; 
  clouds?: number;
  humidity?: number;
  visibility?: number;
  
  // Marine-specific properties when available
  waterTemperature?: number;
  waveHeight?: number;
  swellHeight?: number;
  swellPeriod?: number;

  marine?: MarineHour[];
}



