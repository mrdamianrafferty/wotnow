export type WeatherForecastDay = {
  date: string;
  tempMax: number;
  tempMin: number;
  temperature: number;
  condition: string;
  description: string;
  icon: string;
  wind_speed: number;
  rain: number;
  snow: number;
  clouds: number | null;
  humidity: number;
  visibility: number | null;
  totalRain: number;
  rainDetails: string[];
};

export type WeatherCondition =
  | 'sunny'
  | 'clear'
  | 'rain'
  | 'cloudy'
  | 'clouds'
  | 'snow'
  | 'thunderstorm'
  | 'fog'
  | 'mist'
  | 'drizzle'
  | 'unknown';

  export interface MarineWeatherData {
  time: string;
  waterTemperature?: number;
  waveHeight?: number;
  windSpeed?: number;
  windDirection?: number;
  swellHeight?: number;
  swellDirection?: number;
  swellPeriod?: number;
}

// Extend your per-day forecast type:
export interface WeatherForecastDay {
  // your existing props...
  marine?: MarineWeatherData[];
}
