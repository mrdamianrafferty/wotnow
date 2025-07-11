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