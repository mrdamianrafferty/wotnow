export interface MarineHour {
  time: string;
  waveHeight?: { noaa?: number };
  waterTemperature?: { noaa?: number };
  swellHeight?: { noaa?: number };
  swellPeriod?: { noaa?: number };
  windSpeed?: { noaa?: number };
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
  wind_speed?: number;
  clouds?: number;
  humidity?: number;
  visibility?: number;

  marine?: MarineHour[];
}

console.log('date:', date, 'marineHour.time:', marineHours[0]?.time);



