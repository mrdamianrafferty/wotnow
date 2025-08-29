/**
 * OpenWeather API Service Module
 *
 * This module provides robust, typed functions for accessing OpenWeather's One Call 3.0 API endpoints.
 * It supports current, forecast, historical, daily summary, overview, and weather assistant features.
 *
 * See: https://openweathermap.org/api/one-call-3
 *
 * Endpoints supported:
 * - /onecall: Current, minutely, hourly, daily forecasts, alerts, air pollution
 * - /onecall/timemachine: Historical weather data for a given time
 * - /onecall/day_summary: Daily aggregated weather data
 * - /onecall/overview: Human-readable weather summary
 * - /weather-assistant: Weather advice and friendly summaries (web interface)
 *
 * All functions handle errors and return parsed JSON responses.
 */
// Uses global fetch (available in Next.js API routes and modern Node.js)

// API endpoint constants
const OPENWEATHER_BASE_3 = 'https://api.openweathermap.org/data/3.0/onecall'; // Current, forecast, alerts, air pollution
const OPENWEATHER_BASE_2_5 = 'https://api.openweathermap.org/data/2.5/forecast'; // Fallback for legacy 5-day forecast
const OPENWEATHER_BASE_TIMEMACHINE = 'https://api.openweathermap.org/data/3.0/onecall/timemachine'; // Historical data
const OPENWEATHER_BASE_DAYSUMMARY = 'https://api.openweathermap.org/data/3.0/onecall/day_summary'; // Daily aggregation
const OPENWEATHER_BASE_OVERVIEW = 'https://api.openweathermap.org/data/3.0/onecall/overview'; // Human-readable summary
const OPENWEATHER_WEATHER_ASSISTANT_WEB = 'https://openweathermap.org/weather-assistant'; // Weather assistant web interface
/**
 * Get current weather and forecast (up to 8 days, plus hourly/minutely/current/alerts/air pollution)
 * Docs: https://openweathermap.org/api/one-call-3#example
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @param options Optional: units, exclude blocks
 */
export async function getCurrentAndForecast({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
    units: options?.units || 'metric',
    exclude: options?.exclude || '',
  });
  const url = `${OPENWEATHER_BASE_3}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

/**
 * Get historical weather data for a given UNIX timestamp (dt)
 * Docs: https://openweathermap.org/api/one-call-3#history
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param dt UNIX timestamp (seconds)
 * @param apiKey OpenWeather API key
 */
export async function getHistoricalWeather({ lat, lon, dt, apiKey }: { lat: number|string, lon: number|string, dt: number|string, apiKey: string }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    dt: String(dt),
    appid: apiKey,
  });
  const url = `${OPENWEATHER_BASE_TIMEMACHINE}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

/**
 * Get daily aggregated weather data for a specific date (YYYY-MM-DD)
 * Docs: https://openweathermap.org/api/one-call-3#aggregation
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param date Date string (YYYY-MM-DD)
 * @param apiKey OpenWeather API key
 */
export async function getDailySummary({ lat, lon, date, apiKey }: { lat: number|string, lon: number|string, date: string, apiKey: string }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    date,
    appid: apiKey,
  });
  const url = `${OPENWEATHER_BASE_DAYSUMMARY}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

/**
 * Get weather overview (human-readable summary for current and forecast)
 * Docs: https://openweathermap.org/api/one-call-3#overview
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 */
export async function getWeatherOverview({ lat, lon, apiKey }: { lat: number|string, lon: number|string, apiKey: string }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    appid: apiKey,
  });
  const url = `${OPENWEATHER_BASE_OVERVIEW}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

/**
 * Build weather assistant web interface URL (for human-friendly advice and summaries)
 * Docs: https://openweathermap.org/api/weather-assistant
 *
 * @param apiKey OpenWeather API key
 * @returns URL string
 */
export function getWeatherAssistantWebUrl(apiKey: string) {
  return `${OPENWEATHER_WEATHER_ASSISTANT_WEB}?apikey=${apiKey}`;
}


/**
 * Options for OpenWeather API calls
 * - units: 'metric', 'imperial', etc.
 * - exclude: comma-separated blocks to exclude (e.g. 'minutely,hourly')
 */
type WeatherOptions = {
  units?: string;
  exclude?: string;
};

/**
 * Get One Call 3.0 data with fallback to 2.5 forecast API (legacy)
 * Returns unified structure for daily forecasts and city info.
 *
 * - If One Call 3.0 succeeds, returns up to 8 days of daily forecast, current, hourly, minutely, alerts, air pollution, etc.
 * - If fallback, returns 2.5 API data as-is.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @param options Optional: units, exclude blocks
 */
export async function getOneCallData({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }) {
  if (!lat || !lon || !apiKey) throw new Error('Missing parameters or API key');
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    units: options?.units || 'metric',
    appid: apiKey,
    exclude: options?.exclude || '',
  });
  const url = `${OPENWEATHER_BASE_3}?${params.toString()}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      throw { status: response.status, data };
    }
    return { source: 'onecall3', data };
  } catch (err) {
    // Fallback to 2.5 API
    const url2 = `${OPENWEATHER_BASE_2_5}?lat=${lat}&lon=${lon}&units=${options?.units || 'metric'}&appid=${apiKey}`;
    const response2 = await fetch(url2);
    const data2 = await response2.json();
    if (!response2.ok) {
      throw { status: response2.status, data: data2 };
    }
    return { source: 'forecast2.5', data: data2 };
  }
}

/**
 * Transform One Call API daily data to a unified forecast structure (up to 8 days)
 * - Returns array of daily forecast objects compatible with legacy 2.5 API consumers
 */
export function transformDailyForecast(oneCallData: any) {
  if (!oneCallData.daily) return [];
  return oneCallData.daily.slice(0, 8).map((day: any) => ({
    dt: day.dt,
    main: {
      temp: day.temp.day,
      temp_min: day.temp.min,
      temp_max: day.temp.max,
      humidity: day.humidity,
      pressure: day.pressure,
      feels_like: day.feels_like.day,
      temp_kf: 0
    },
    weather: day.weather,
    clouds: { all: day.clouds },
    wind: {
      speed: day.wind_speed,
      deg: day.wind_deg,
      gust: day.wind_gust || 0
    },
    visibility: 10000,
    pop: day.pop || 0,
    rain: day.rain ? { "3h": day.rain } : undefined,
    snow: day.snow ? { "3h": day.snow } : undefined,
    dt_txt: new Date(day.dt * 1000).toISOString().replace('T', ' ').slice(0, 19),
    sys: { pod: "d" }
  }));
}

/**
 * Transform One Call API city/meta data to a unified city structure
 */
export function transformCity(oneCallData, lat, lon) {
  return {
    id: 0,
    name: "Location",
    coord: { lat: parseFloat(lat), lon: parseFloat(lon) },
    country: "",
    population: 0,
    timezone: oneCallData.timezone_offset || 0,
    sunrise: oneCallData.current?.sunrise || 0,
    sunset: oneCallData.current?.sunset || 0
  };
}

// TODO: Add more feature functions here, e.g. getAlerts, getAirPollution, etc.

/**
 * Get full weather data with fallback and unified structure
 * - Returns daily, current, hourly, minutely, alerts, air pollution, city info, etc.
 * - Fallbacks to 2.5 API if One Call 3.0 fails
 */
export async function getFullWeather({ lat, lon, apiKey, options = {} }) {
  const result = await getOneCallData({ lat, lon, apiKey, options });
  if (result.source === 'onecall3') {
    return {
      cod: "200",
      message: 0,
      cnt: result.data.daily?.length || 8,
      list: transformDailyForecast(result.data),
      city: transformCity(result.data, lat, lon),
      alerts: result.data.alerts || [],
      current: result.data.current || {},
      hourly: result.data.hourly || [],
      minutely: result.data.minutely || [],
      source: 'onecall3',
    };
  } else {
    // Return 2.5 API data as-is
    return { ...result.data, source: 'forecast2.5' };
  }
}
