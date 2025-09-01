/**
 * Normalize and merge core weather fields (clouds, rain, snow, etc.) with fallback logic
 *
 * For land locations: OpenWeather > Open-Meteo > Stormglass
 * For marine locations: Stormglass > OpenWeather > Open-Meteo
 *
 * @param openWeatherData OpenWeather response (One Call or Day Summary)
 * @param openMeteoData Open-Meteo response
 * @param stormglassData Stormglass response
 * @param isMarine boolean (true for marine locations)
 * @returns Unified object: { clouds, rain, snow, snowDepth, ... }
 */
function normalizeCoreWeatherFields(openWeatherData, openMeteoData, stormglassData, isMarine) {
  // Helper to pick first valid value from sources
  function pickField(fieldPaths, sources) {
    for (let i = 0; i < fieldPaths.length; i++) {
      const value = fieldPaths[i].reduce((obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined), sources[i]);
      if (value !== undefined && value !== null) return value;
    }
    return null;
  }

  // Source order
  const sources = isMarine
    ? [stormglassData, openWeatherData, openMeteoData]
    : [openWeatherData, openMeteoData, stormglassData];
  // Field paths for each source
  return {
    clouds: pickField([
      ['clouds'], // OpenWeather: %
      ['hourly', 'cloudcover'], // Open-Meteo: %
      ['cloudCover'] // Stormglass: % (if available)
    ], sources),
    rain: pickField([
      ['rain'], // OpenWeather: mm
      ['hourly', 'precipitation'], // Open-Meteo: mm
      ['precipitation'] // Stormglass: mm (if available)
    ], sources),
    snow: pickField([
      ['snow'], // OpenWeather: mm
      ['hourly', 'snowfall'], // Open-Meteo: cm
      ['snow'] // Stormglass: mm (if available)
    ], sources),
    snowDepth: pickField([
      [], // OpenWeather: not available
      ['hourly', 'snow_depth'], // Open-Meteo: cm
      [] // Stormglass: not available
    ], sources),
    // Add more fields as needed
  };
}

/**
 * Get comprehensive weather data for a location
 * Aggregates data from multiple OpenWeather endpoints and handles fallbacks
 * 
 * @param lat Latitude
 * @param lon Longitude
 * @returns Unified weather data object with current, hourly, and daily forecasts
 */
async function getWeatherData(lat: number, lon: number): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  
  if (!apiKey) {
    throw new Error('OpenWeather API key not configured');
  }
  
  try {
    // Get comprehensive weather data
    const weatherData = await getFullWeather({ 
      lat, 
      lon, 
      apiKey, 
      options: { units: 'metric' } 
    });
    
    // Get air pollution data if available
    let airQuality = null;
    try {
      airQuality = await getAirPollution({ lat, lon, apiKey });
    } catch (error) {
      console.warn('Failed to fetch air quality data:', error);
    }
    
    // Get any weather alerts
    let alerts = [];
    try {
      alerts = await getWeatherAlerts({ lat, lon, apiKey });
    } catch (error) {
      console.warn('Failed to fetch weather alerts:', error);
    }
    
    // Combine all data
    return {
      ...weatherData,
      airQuality,
      alerts: alerts.length > 0 ? alerts : weatherData.alerts || [],
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    throw error;
  }
}

/**
 * Fetch weather alerts from OpenWeather One Call 3.0 API
 * Returns array of alert objects (if present) for the given location.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @param options Optional: units, exclude blocks
 * @returns Array of alerts (or empty array)
 *
 * Alert object fields:
 *   - sender_name: string (source of alert)
 *   - event: string (alert type)
 *   - start: UNIX timestamp (seconds)
 *   - end: UNIX timestamp (seconds)
 *   - description: string (detailed info)
 *   - tags: array of strings (categories)
 */
async function getWeatherAlerts({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }) {
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
  // Alerts are in data.alerts (array)
  return data.alerts || [];
}

/**
 * Fetch air pollution data from OpenWeather One Call 3.0 API
 * Returns air quality metrics for the given location.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @returns Air pollution data object
 *
 * Air pollution object fields:
 *   - coord: { lon, lat }
 *   - list: Array of hourly objects:
 *       - dt: UNIX timestamp (seconds)
 *       - main: { aqi: number (1–5, 1=Good, 5=Very Poor) }
 *       - components: { co, no, no2, o3, so2, pm2_5, pm10, nh3 } (µg/m³)
 */
async function getAirPollution({ lat, lon, apiKey }: { lat: number|string, lon: number|string, apiKey: string }) {
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}
/**
 * WotNow Unified Weather Service
 * ---------------------------------------
 * This module centralizes all weather, marine, air quality, pollen, soil, snow, and astronomy API integrations for the app.
 *
 * SOURCES:
 * - OpenWeather (https://openweathermap.org/api)
 *   • One Call 3.0: /onecall (current, minutely, hourly, daily, alerts, air pollution)
 *     - Fields: temp.day, temp.night, humidity (%), pressure (hPa), wind_speed (m/s), wind_deg (deg), weather (array: main, description, icon), clouds (%), pop (precip prob), rain/snow (mm), visibility (m)
 *     - Units: metric (default), imperial, standard
 *   • 2.5 Forecast: /forecast (legacy fallback, 3-hourly slices)
 *   • Timemachine: /onecall/timemachine (historical)
 *   • Day Summary: /onecall/day_summary (daily aggregation)
 *   • Overview: /onecall/overview (human-readable summary)
 *   • Weather Assistant: /weather-assistant (advice/summaries)
 *
 * - Open-Meteo (https://open-meteo.com/en/docs)
 *   • /v1/forecast: General weather, soil, snow, wind
 *     - Fields: temperature_2m (°C), precipitation (mm), windspeed_10m (m/s), soil_temperature_0cm (°C), soil_moisture_0_to_1cm (m³/m³), soil_moisture_1_to_3cm (m³/m³), snowfall (cm), snow_depth (cm), freezing_level_height (m)
 *   • /v1/air-quality: Air quality & pollen
 *     - Fields: alder_pollen, birch_pollen, grass_pollen, ragweed_pollen (unitless, model-dependent, relative exposure), pm2_5, pm10, o3, no2, so2, co (µg/m³), european_aqi, us_aqi (index)
 *
 * - Stormglass (https://docs.stormglass.io/)
 *   • /v2/marine/point: Marine forecast (waves, wind, water temp, etc.)
 *     - Fields: waveHeight (m), waveDirection (deg), windSpeed (m/s), windDirection (deg), waterTemperature (°C), etc.
 *   • /v2/tide/extremes/point: Tide extremes (high/low)
 *     - Fields: time (ISO), type (high/low), height (m)
 *   • /v2/astronomy/point: Astronomy (sunrise, sunset, moonrise, moonset, moon phase)
 *     - Fields: sunrise, sunset, moonrise, moonset (ISO), moonPhase (string)
 *   • /v2/bio/point: Biogeochemical (chlorophyll, dissolved oxygen, nutrients, salinity, SST)
 *     - Fields: chlorophyll (mg/m³), dissolvedOxygen (mg/L), nitrate/phosphate (mmol/m³ or µmol/L), salinity (PSU), sst (°C)
 *
 * UNITS & CONVENTIONS:
 * - Times: ISO strings, local time zone if available
 * - Temperature: °C (default), can be °F (imperial)
 * - Wind: m/s (OpenWeather, Stormglass), knots (app conversion), deg (direction)
 * - Precipitation: mm (OpenWeather, Open-Meteo), cm (Open-Meteo snow)
 * - Pressure: hPa
 * - Humidity: %
 * - Visibility: m
 * - Pollen: unitless, relative exposure
 * - Air quality: µg/m³ (pollutants), index (AQI)
 * - Soil moisture: m³/m³ (0–1)
 * - Snowfall/depth: mm/cm (check API)
 * - Marine bio: see Stormglass docs
 *
 * AGGREGATION POLICY:
 * - Daily: mean/max/min as appropriate (see API docs)
 * - Pollen: daily max
 * - AQI: daily max (worst hour)
 * - Soil: daily mean
 * - Snow: daily total/mean
 * - Marine bio: daily mean
 *
 * All fetch functions below return raw API responses. Merge and normalization should be handled in higher-level logic.
 */
const { NextApiRequest, NextApiResponse } = require('next');

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon } = req.query;
  const apiKey = process.env.STORMGLASS_SECRET_KEY;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=${lat}&lng=${lon}`;

  try {
    console.log('🌊 Fetching tide data from Stormglass');
    const response = await fetch(url, {
      headers: {
        'Authorization': `${apiKey}` // Fixed format
      }
    });
    
    if (!response.ok) {
      console.error('🌊 Tide API response not OK:', response.status);
      return res.status(response.status).json({ 
        error: 'Stormglass API error', 
        status: response.status 
      });
    }
    
    const data = await response.json();
    console.log('🌊 Tide data received', { count: data?.data?.length || 0 });

    if (data && Array.isArray(data.data)) {
      return res.status(200).json(data);
    } else {
      return res.status(500).json({ error: 'Invalid tide data from Stormglass', details: data });
    }
  } catch (err) {
    console.error('🌊 Tide fetch failed', err);
    return res.status(500).json({ error: 'Tide fetch failed', details: err });
  }
}


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
async function getCurrentAndForecast({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }) {
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
 * @param lat Latitude (decimal degrees)
 * @param lon Longitude (decimal degrees)
 * @param dt UNIX timestamp (seconds since epoch, UTC)
 * @param apiKey OpenWeather API key
 * @returns Raw OpenWeather Timemachine API response
 *
 * Response fields:
 *   - current: { temp (°C), humidity (%), pressure (hPa), wind_speed (m/s), wind_deg (deg), weather: [{ main, description, icon }], clouds (%), visibility (m), dt (timestamp) }
 *   - hourly: Array of hourly objects (same fields as current)
 *   - lat, lon: coordinates
 *   - timezone: string
 *   - timezone_offset: seconds
 *
 * Units: metric (default), can be changed via API key settings
 */
async function getHistoricalWeather({ lat, lon, dt, apiKey }: { lat: number|string, lon: number|string, dt: number|string, apiKey: string }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    dt: String(dt),
    appid: apiKey,
  });
  const url = `${OPENWEATHER_BASE_TIMEMACHINE}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  // Fields: current.temp, current.humidity, current.pressure, current.wind_speed, current.wind_deg, current.weather[0].main/description/icon, current.clouds, current.visibility, current.dt
  //         hourly[]: same fields as current
  //         lat, lon, timezone, timezone_offset
  if (!response.ok) throw { status: response.status, data };
  return data;
}

/**
 * Get daily aggregated weather data for a specific date (YYYY-MM-DD)
 * Docs: https://openweathermap.org/api/one-call-3#aggregation
 *
 * @param lat Latitude (decimal degrees)
 * @param lon Longitude (decimal degrees)
 * @param date Date string (YYYY-MM-DD, local time)
 * @param apiKey OpenWeather API key
 * @returns Raw OpenWeather Day Summary API response
 *
 * Response fields:
 *   - date: string (YYYY-MM-DD)
 *   - sunrise, sunset: UNIX timestamps (seconds)
 *   - temp: { min, max, day, night, eve, morn } (°C)
 *   - feels_like: { day, night, eve, morn } (°C)
 *   - pressure (hPa), humidity (%), wind_speed (m/s), wind_deg (deg), wind_gust (m/s)
 *   - weather: [{ main, description, icon }]
 *   - clouds (%), pop (precip prob), rain (mm), snow (mm)
 *   - uvi (UV index)
 *   - moonrise, moonset, moon_phase
 *   - visibility (m)
 *   - dew_point (°C)
 *   - precipitation (mm)
 *   - alerts: array (if present)
 *
 * Units: metric (default), can be changed via API key settings
 */
async function getDailySummary({ lat, lon, date, apiKey }: { lat: number|string, lon: number|string, date: string, apiKey: string }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    date,
    appid: apiKey,
  });
  const url = `${OPENWEATHER_BASE_DAYSUMMARY}?${params.toString()}`;
  const response = await fetch(url);
  const data = await response.json();
  // Field-level comments:
  // data.uvi: UV index (0–11+, daily max, unitless)
  // data.temp: { min, max, day, night, eve, morn } (°C)
  // data.pollen: not present (see Open-Meteo)
  // data.alerts: array of weather alerts
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
async function getWeatherOverview({ lat, lon, apiKey }: { lat: number|string, lon: number|string, apiKey: string }) {
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
function getWeatherAssistantWebUrl(apiKey: string) {
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
async function getOneCallData({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }) {
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
  } catch (_err) {
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
function transformDailyForecast(oneCallData: any): any[] {
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
function transformCity(oneCallData: any, lat: number|string, lon: number|string): any {
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

/**
 * Get weather alerts for a location (OpenWeather One Call 3.0)
 * Alerts may include severe weather, warnings, advisories, etc.
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @returns Array of alert objects, or empty array if none
 *
 * Alert fields: sender_name, event, start, end, description, tags[]
 */
// This function is already defined above with a different signature
// export async function getWeatherAlerts(lat: number, lon: number, apiKey: string): Promise<any[]> {
//   const data = await fetchOpenWeatherOneCall(lat, lon, apiKey);
//   return data.alerts || [];
// }

/**
 * Get air pollution data for a location (OpenWeather Air Pollution API)
 * Docs: https://openweathermap.org/api/air-pollution
 *
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey OpenWeather API key
 * @returns Array of air pollution objects (current, forecast, or historical)
 *
 * Fields: co, no, no2, o3, so2, pm2_5, pm10, nh3 (µg/m³), dt (timestamp)
 */
// This function is already defined above with a different signature
// export async function getAirPollution(lat: number, lon: number, apiKey: string): Promise<any[]> {
//   const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
//   const response = await fetch(url);
//   const data = await response.json();
//   // data.list: array of pollution objects
//   if (!response.ok) throw { status: response.status, data };
//   return data.list || [];
// }

/**
 * Get full weather data with fallback and unified structure
 * - Returns daily, current, hourly, minutely, alerts, air pollution, city info, etc.
 * - Fallbacks to 2.5 API if One Call 3.0 fails
 */
async function getFullWeather({ lat, lon, apiKey, options = {} }: { lat: number|string, lon: number|string, apiKey: string, options?: WeatherOptions }): Promise<any> {
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

// OpenWeather One Call 3.0
async function fetchOpenWeatherOneCall(lat: number, lon: number, apiKey: string, options?: WeatherOptions) {
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

// OpenWeather 2.5 Forecast (fallback)
async function fetchOpenWeatherForecast25(lat: number, lon: number, apiKey: string, options?: WeatherOptions) {
  const url = `${OPENWEATHER_BASE_2_5}?lat=${lat}&lon=${lon}&units=${options?.units || 'metric'}&appid=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw { status: response.status, data };
  return data;
}

// OpenWeather Timemachine
async function fetchOpenWeatherTimemachine(lat: number, lon: number, dt: number, apiKey: string) {
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

// OpenWeather Day Summary
async function fetchOpenWeatherDaySummary(lat: number, lon: number, date: string, apiKey: string) {
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

// OpenWeather Overview
async function fetchOpenWeatherOverview(lat: number, lon: number, apiKey: string) {
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

// OpenWeather Assistant
function getOpenWeatherAssistantUrl(apiKey: string) {
  return `${OPENWEATHER_WEATHER_ASSISTANT_WEB}?apikey=${apiKey}`;
}


/**
 * Fetch general weather, soil, and snow data from Open-Meteo
 * @param lat Latitude
 * @param lon Longitude
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 */
async function fetchOpenMeteoWeather(lat: number, lon: number, startDate: string, endDate: string): Promise<any> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', [
    'temperature_2m',
    'precipitation',
    'windspeed_10m',
    'soil_temperature_0cm',
    'soil_moisture_0_to_1cm',
    'soil_moisture_1_to_3cm',
    'snowfall',
    'snow_depth',
    'freezing_level_height'
  ].join(','));
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    if (!response.ok) throw { status: response.status, data };
    return data;
  } catch (err) {
    throw new Error('Open-Meteo weather fetch failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Fetch air quality and pollen data from Open-Meteo
 * @param lat Latitude
 * @param lon Longitude
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 */
async function fetchOpenMeteoAirPollen(lat: number, lon: number, startDate: string, endDate: string): Promise<any> {
  const url = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', [
    'alder_pollen', // Alder pollen (unitless, relative exposure)
    'birch_pollen', // Birch pollen (unitless, relative exposure)
    'grass_pollen', // Grass pollen (unitless, relative exposure)
    'ragweed_pollen', // Ragweed pollen (unitless, relative exposure)
    'pm2_5', // Particulate matter <2.5µm (µg/m³)
    'pm10', // Particulate matter <10µm (µg/m³)
    'o3', // Ozone (µg/m³)
    'no2', // Nitrogen dioxide (µg/m³)
    'so2', // Sulphur dioxide (µg/m³)
    'co', // Carbon monoxide (µg/m³)
    'european_aqi', // European AQI (index)
    'us_aqi' // US AQI (index)
  ].join(','));
  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    // Field-level comments:
    // data.hourly.alder_pollen, birch_pollen, grass_pollen, ragweed_pollen: unitless, daily max recommended
    // data.hourly.pm2_5, pm10, o3, no2, so2, co: µg/m³
    // data.hourly.european_aqi, us_aqi: index
    if (!response.ok) throw { status: response.status, data };
    return data;
  } catch (err) {
    throw new Error('Open-Meteo air/pollen fetch failed: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Fetch marine data from Stormglass
 * @param lat Latitude
 * @param lon Longitude
 * @param startISO Start ISO datetime
 * @param endISO End ISO datetime
 * @param params Comma-separated variables
 * @param apiKey Stormglass API key
 */
async function fetchStormglassMarine(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  params: string | undefined,
  apiKey: string
): Promise<any | null> {
  // local helpers (kept here to avoid cross-file refactors)
  const withTimeout = async <T>(p: Promise<T>, ms = 10000): Promise<T> =>
    await new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(id); resolve(v); })
       .catch(e => { clearTimeout(id); reject(e); });
    });
  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return null as any; } };

  const url = new URL('https://api.stormglass.io/v2/marine/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set('params', params ?? [
    'waveHeight','waveDirection','wavePeriod',
    'swellHeight','swellDirection','swellPeriod',
    'windWaveHeight','windWaveDirection','windWavePeriod',
    'waterTemperature','currentSpeed','currentDirection',
    'windSpeed','windDirection','gust'
  ].join(','));

  try {
    const res = await withTimeout(fetch(url.toString(), { headers: { Authorization: apiKey } }), 10000);
    if (!res.ok) return null; // graceful failure
    return await safeJson(res);
  } catch {
    return null; // swallow errors and degrade politely
  }
}

/**
 * Fetch tide extremes from Stormglass
 * @param lat Latitude
 * @param lon Longitude
 * @param apiKey Stormglass API key
 */
async function fetchStormglassTides(lat: number, lon: number, apiKey: string): Promise<any | null> {
  const withTimeout = async <T>(p: Promise<T>, ms = 10000): Promise<T> =>
    await new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(id); resolve(v); })
       .catch(e => { clearTimeout(id); reject(e); });
    });
  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return null as any; } };

  const url = new URL('https://api.stormglass.io/v2/tide/extremes/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));

  try {
    const res = await withTimeout(fetch(url.toString(), { headers: { Authorization: apiKey } }), 10000);
    if (!res.ok) return null;
    const data = await safeJson(res);
    if (!data || !Array.isArray(data.data)) return null;
    return data;
  } catch {
    return null;
  }
}
/**
 * Normalize and merge weather features (UVI, pollen, tides) into unified structure for frontend use
 *
 * @param openWeatherDaySummary OpenWeather daily summary response
 * @param openMeteoAirPollen Open-Meteo air/pollen response
 * @param stormglassTides Stormglass tides response
 * @returns Unified object: { uvi, pollen, tides }
 */
function normalizeWeatherFeatures(
  openWeatherDaySummary: any,
  openMeteoAirPollen: any,
  stormglassTides: any,
  stormglassMarine?: any
) {
  const toNum = (v: any): number | null => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // Pollen: use daily max of hourly arrays; fall back to 0 if missing
  const hourly = openMeteoAirPollen?.hourly ?? {};
  const maxOr0 = (arr?: any[]) => Array.isArray(arr) && arr.length
    ? Math.max(...arr.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)))
    : 0;

  // Tides: map safely; return empty array if none
  const tides = Array.isArray(stormglassTides?.data)
    ? stormglassTides.data
        .map((t: any) => ({
          time: new Date(t.time).toISOString(),
          type: String(t.type).toLowerCase().includes('high') ? 'high' : 'low',
          height: toNum(t.height)
        }))
        .sort((a: any, b: any) => a.time.localeCompare(b.time))
    : [];

  // Marine: only include if we have any wave data (waveHeight OR swellHeight OR windWaveHeight)
  let marine: any | undefined;
  const h = stormglassMarine?.hours?.[0];
  if (h) {
    const sg = (k: string) => toNum(h?.[k]?.sg);
    const waveHeight = sg('waveHeight');
    const swellHeight = sg('swellHeight');
    const windWaveHeight = sg('windWaveHeight');

    // If none of the wave-related metrics are present, omit marine entirely
    const hasWave = waveHeight !== null || swellHeight !== null || windWaveHeight !== null;
    if (hasWave) {
      marine = {
        waveHeight,
        waveDirection: sg('waveDirection'),
        wavePeriod: sg('wavePeriod'),
        swellHeight,
        swellDirection: sg('swellDirection'),
        swellPeriod: sg('swellPeriod'),
        windWaveHeight,
        windWaveDirection: sg('windWaveDirection'),
        windWavePeriod: sg('windWavePeriod'),
        waterTemperature: sg('waterTemperature'),
        currentSpeed: sg('currentSpeed'),
        currentDirection: sg('currentDirection'),
        windSpeed: sg('windSpeed'),
        windDirection: sg('windDirection'),
        gust: sg('gust')
      };
    }
  }

  const result: any = {
    uvi: openWeatherDaySummary?.uvi ?? null,
    pollen: {
      alder: maxOr0(hourly.alder_pollen),
      birch: maxOr0(hourly.birch_pollen),
      grass: maxOr0(hourly.grass_pollen),
      ragweed: maxOr0(hourly.ragweed_pollen)
    },
    tides
  };

  if (marine) result.marine = marine; // only add when present

  return result;
}

/**
 * Fetch astronomy data from Stormglass
 * @param lat Latitude
 * @param lon Longitude
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @param apiKey Stormglass API key
 */
async function fetchStormglassAstronomy(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  apiKey: string
): Promise<any | null> {
  const withTimeout = async <T>(p: Promise<T>, ms = 10000): Promise<T> =>
    await new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(id); resolve(v); })
       .catch(e => { clearTimeout(id); reject(e); });
    });
  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return null as any; } };

  const url = new URL('https://api.stormglass.io/v2/astronomy/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);

  try {
    const res = await withTimeout(fetch(url.toString(), { headers: { Authorization: apiKey } }), 10000);
    if (!res.ok) return null;
    return await safeJson(res);
  } catch {
    return null;
  }
}

/**
 * Fetch biogeochemical data from Stormglass
 * @param lat Latitude
 * @param lon Longitude
 * @param startISO Start ISO datetime
 * @param endISO End ISO datetime
 * @param params Comma-separated variables
 * @param apiKey Stormglass API key
 */
export async function fetchStormglassBio(
  lat: number,
  lon: number,
  startISO: string,
  endISO: string,
  params: string | undefined,
  apiKey: string
): Promise<any | null> {
  const withTimeout = async <T>(p: Promise<T>, ms = 10000): Promise<T> =>
    await new Promise((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('timeout')), ms);
      p.then(v => { clearTimeout(id); resolve(v); })
       .catch(e => { clearTimeout(id); reject(e); });
    });
  const safeJson = async (res: Response) => { try { return await res.json(); } catch { return null as any; } };

  const url = new URL('https://api.stormglass.io/v2/bio/point');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lng', String(lon));
  url.searchParams.set('start', startISO);
  url.searchParams.set('end', endISO);
  url.searchParams.set('params', params ?? [
    'chlorophyll','dissolvedOxygen','nitrate','phosphate','salinity','sst'
  ].join(','));

  try {
    const res = await withTimeout(fetch(url.toString(), { headers: { Authorization: apiKey } }), 10000);
    if (!res.ok) return null;
    return await safeJson(res);
  } catch {
    return null;
  }
}

// Export everything using CommonJS syntax
module.exports = {
  normalizeCoreWeatherFields,
  getWeatherData,
  getWeatherAlerts,
  getAirPollution,
  handler,
  getCurrentAndForecast,
  getHistoricalWeather,
  getDailySummary,
  getWeatherOverview,
  getWeatherAssistantWebUrl,
  getOneCallData,
  transformDailyForecast,
  transformCity,
  getFullWeather,
  fetchOpenWeatherOneCall,
  fetchOpenWeatherForecast25,
  fetchOpenWeatherTimemachine,
  fetchOpenWeatherDaySummary,
  fetchOpenWeatherOverview,
  getOpenWeatherAssistantUrl,
  fetchOpenMeteoWeather,
  fetchOpenMeteoAirPollen,
  fetchStormglassMarine,
  fetchStormglassTides,
  normalizeWeatherFeatures,
  fetchStormglassAstronomy,
  fetchStormglassBio
};
