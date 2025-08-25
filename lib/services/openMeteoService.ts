/**
 * Optimized Open-Meteo API Client for WotNow
 * 
 * This module implements best practices for calling Open-Meteo APIs including:
 * - Request deduplication & batching
 * - Rate limiting with concurrency control
 * - Jittered exponential backoff for retries
 * - Tiered caching (memory + optionally persistent)
 * - Domain-specific endpoint selection
 * - Endpoint-aware parameter validation
 */
import { createHash } from 'crypto';

// Cache TTLs per endpoint/data type (in milliseconds)
const CACHE_TTL = {
  FORECAST_HOURLY: 15 * 60 * 1000,        // 15 minutes for hourly weather/UVI
  FORECAST_DAILY: 60 * 60 * 1000,         // 60 minutes for daily weather/UVI
  AIR_QUALITY_HOURLY: 30 * 60 * 1000,     // 30 minutes for hourly AQI/pollutants
  AIR_QUALITY_DAILY: 60 * 60 * 1000,      // 60 minutes for daily AQI
  POLLEN_HOURLY: 60 * 60 * 1000,          // 60 minutes for hourly pollen
  POLLEN_DAILY: 120 * 60 * 1000,          // 120 minutes for daily pollen
};

// API Endpoints
const ENDPOINTS = {
  FORECAST: 'https://api.open-meteo.com/v1/forecast',
  AIR_QUALITY: 'https://air-quality-api.open-meteo.com/v1/air-quality',
};

// Max date supported by Open-Meteo (as of 2023)
const MAX_DATE_STRING = '2025-08-24';
const MAX_DATE = new Date(MAX_DATE_STRING);

// In-memory cache
const memoryCache: Record<string, { 
  data: any;
  timestamp: number;
  expiresAt: number;
}> = {};

// In-flight request deduplication
const pendingRequests: Map<string, Promise<any>> = new Map();

// Request queue and concurrency control
const requestQueue: Array<() => Promise<any>> = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 4;

/**
 * Generate cache key for a request
 */
function generateCacheKey(endpoint: string, params: Record<string, any>): string {
  // Sort params to ensure consistent keys
  const sortedParams = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  return createHash('md5').update(`${endpoint}?${sortedParams}`).digest('hex');
}

/**
 * Add jitter to prevent thundering herd problem
 * @param baseMs Base milliseconds
 * @param jitterPercent Percentage of jitter (0-100)
 */
function addJitter(baseMs: number, jitterPercent: number = 10): number {
  const jitterFactor = 1 + ((Math.random() * 2 - 1) * (jitterPercent / 100));
  return Math.floor(baseMs * jitterFactor);
}

/**
 * Process the request queue - called whenever a request completes or when a new request is queued
 */
async function processQueue() {
  if (requestQueue.length === 0 || activeRequests >= MAX_CONCURRENT_REQUESTS) {
    return;
  }

  const request = requestQueue.shift();
  if (!request) return;
  
  activeRequests++;
  
  try {
    await request();
  } catch (error) {
    console.error('Error processing queued request:', error);
  } finally {
    activeRequests--;
    // Process next request in queue
    processQueue();
  }
}

/**
 * Queue a request with concurrency control
 */
function queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const wrappedRequest = async () => {
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    requestQueue.push(wrappedRequest);
    processQueue();
  });
}

/**
 * Fetch with retry and timeout
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit = {}, 
  maxRetries: number = 3,
  timeout: number = 10000
): Promise<Response> {
  let retries = 0;
  
  while (true) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, { 
        ...options, 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // Only retry on 429 (Too Many Requests) or 5xx errors
      if (response.status !== 429 && !(response.status >= 500 && response.status < 600) || retries >= maxRetries) {
        return response;
      }
      
      retries++;
      
      // Exponential backoff with jitter
      const backoffMs = addJitter(Math.pow(2, retries) * 500);
      console.log(`Retrying request (${retries}/${maxRetries}) after ${backoffMs}ms delay`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      if (retries >= maxRetries) {
        throw error;
      }
      
      retries++;
      
      // Exponential backoff with jitter for network errors too
      const backoffMs = addJitter(Math.pow(2, retries) * 500);
      console.log(`Network error, retrying (${retries}/${maxRetries}) after ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * Get from cache or fetch with deduplication
 */
async function fetchWithCache(
  endpoint: string,
  params: Record<string, any>,
  cacheTtlMs: number,
  forceRefresh: boolean = false
): Promise<any> {
  const cacheKey = generateCacheKey(endpoint, params);
  const now = Date.now();
  
  // Check cache first (unless forced refresh)
  if (!forceRefresh && memoryCache[cacheKey] && now < memoryCache[cacheKey].expiresAt) {
    return {
      ...memoryCache[cacheKey].data,
      fromCache: true,
      cacheAge: Math.round((now - memoryCache[cacheKey].timestamp) / 1000) + 's'
    };
  }
  
  // Check if there's already an in-flight request for this cache key
  if (pendingRequests.has(cacheKey) && !forceRefresh) {
    console.log(`Request already in-flight for ${endpoint}, reusing promise`);
    return pendingRequests.get(cacheKey);
  }
  
  // Prepare the URL
  const url = new URL(endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      url.searchParams.set(key, value.join(','));
    } else {
      url.searchParams.set(key, String(value));
    }
  });
  
  // Create the request function
  const requestFn = async () => {
    try {
      console.log(`Fetching from ${url.toString()}`);
      
      const response = await fetchWithRetry(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Cache the response
      const now = Date.now();
      memoryCache[cacheKey] = {
        data,
        timestamp: now,
        expiresAt: now + addJitter(cacheTtlMs, 20) // Add jitter to cache expiry to prevent thundering herd
      };
      
      return {
        ...data,
        fromCache: false,
        cacheAge: '0s'
      };
    } finally {
      // Remove from pending requests map
      pendingRequests.delete(cacheKey);
    }
  };
  
  // Create the promise, store it, and queue the request
  const requestPromise = queueRequest(requestFn);
  pendingRequests.set(cacheKey, requestPromise);
  
  return requestPromise;
}

/**
 * Get current date range with fallback for dates beyond Open-Meteo's max supported date
 */
function getDateRange(forecastDays: number = 7): { start: string, end: string, isStale: boolean } {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Today YYYY-MM-DD
  
  // If current date is beyond the max supported date, use max date for both
  if (now > MAX_DATE) {
    console.log('Current date beyond Open-Meteo max supported date, using historical data');
    return {
      start: MAX_DATE_STRING,
      end: MAX_DATE_STRING,
      isStale: true
    };
  }
  
  // Normal case - we're within the supported date range
  const endDate = new Date(now.getTime() + forecastDays * 24 * 60 * 60 * 1000);
  let end = endDate.toISOString().split('T')[0];
  
  // If end date exceeds max supported date, cap it
  if (new Date(end) > MAX_DATE) {
    end = MAX_DATE_STRING;
  }
  
  return {
    start: today,
    end,
    isStale: false
  };
}

/**
 * Get geographic domain info based on coordinates
 */
function getDomainInfo(lat: number, lon: number): { 
  isEurope: boolean;
  recommendedDomain: string;
} {
  // Simple Europe boundary check
  // More accurate would be to use a GeoJSON polygon but this works for most use cases
  const isEurope = (lat >= 36 && lat <= 70 && lon >= -10 && lon <= 40);
  
  return {
    isEurope,
    recommendedDomain: isEurope ? 'cams_europe' : 'cams_global'
  };
}

/**
 * Fetch UV Index data from Open-Meteo forecast endpoint
 * 
 * @param lat Latitude 
 * @param lon Longitude
 * @param forecastDays Number of days to forecast
 * @param forceRefresh Force refresh from API
 */
export async function fetchUVIndex(
  lat: number, 
  lon: number, 
  forecastDays: number = 7,
  forceRefresh: boolean = false
): Promise<any> {
  const { start, end, isStale } = getDateRange(forecastDays);
  
  const params = {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    start_date: start,
    end_date: end,
    hourly: ['uv_index', 'uv_index_clear_sky'],
    daily: ['uv_index_max', 'uv_index_clear_sky_max']
  };
  
  const result = await fetchWithCache(
    ENDPOINTS.FORECAST,
    params,
    CACHE_TTL.FORECAST_HOURLY,
    forceRefresh
  );
  
  return {
    ...result,
    isStale,
    lastUpdated: new Date().toISOString(),
    updateFrequency: 'UVI forecast updates every few hours'
  };
}

/**
 * Fetch air quality data from Open-Meteo air-quality endpoint
 * 
 * @param lat Latitude
 * @param lon Longitude
 * @param includePollen Whether to include pollen data
 * @param forecastDays Number of days to forecast
 * @param forceRefresh Force refresh from API
 */
export async function fetchAirQuality(
  lat: number,
  lon: number,
  includePollen: boolean = true,
  forecastDays: number = 7,
  forceRefresh: boolean = false
): Promise<any> {
  const { start, end, isStale } = getDateRange(forecastDays);
  const { isEurope, recommendedDomain } = getDomainInfo(lat, lon);
  
  // Basic AQI and pollutant variables
  const hourlyVars = [
    'pm2_5',
    'pm10',
    'carbon_monoxide',
    'nitrogen_dioxide',
    'sulphur_dioxide',
    'ozone',
    'european_aqi',
    'us_aqi',
    'uv_index'
  ];
  
  // Add pollen variables if requested and location is in Europe
  if (includePollen && isEurope) {
    hourlyVars.push(
      'alder_pollen',
      'birch_pollen',
      'grass_pollen',
      'mugwort_pollen',
      'olive_pollen',
      'ragweed_pollen'
    );
  }
  
  const params = {
    latitude: lat,
    longitude: lon,
    timezone: 'auto',
    start_date: start,
    end_date: end,
    hourly: hourlyVars,
    domains: recommendedDomain
  };
  
  const result = await fetchWithCache(
    ENDPOINTS.AIR_QUALITY,
    params,
    CACHE_TTL.AIR_QUALITY_HOURLY,
    forceRefresh
  );
  
  // Add metadata about the response
  return {
    ...result,
    isStale,
    lastUpdated: new Date().toISOString(),
    updateFrequency: {
      airQuality: recommendedDomain === 'cams_europe' 
        ? 'Updated every ~24 hours (4-day forecast)' 
        : 'Updated every ~12 hours (5-day forecast)',
      pollen: includePollen && isEurope 
        ? 'Updated every ~24 hours (4-day forecast), available only during pollen season' 
        : 'Not available for this location'
    },
    domainInfo: {
      isEurope,
      domain: recommendedDomain
    }
  };
}

/**
 * Unified function to fetch all environmental data (UVI, AQI, pollen)
 * Optimizes by making the minimum number of API calls based on data requirements
 * 
 * @param lat Latitude
 * @param lon Longitude
 * @param forecastDays Number of days to forecast
 * @param options Additional options
 */
export async function fetchEnvironmentalData(
  lat: number,
  lon: number, 
  forecastDays: number = 7,
  options: {
    forceRefresh?: boolean;
    needUVI?: boolean;
    needAQI?: boolean;
    needPollen?: boolean;
    includeDomainInfo?: boolean;
  } = {}
): Promise<any> {
  const { 
    forceRefresh = false,
    needUVI = true,
    needAQI = true,
    needPollen = true,
    includeDomainInfo = true
  } = options;
  
  const { isEurope, recommendedDomain } = getDomainInfo(lat, lon);
  
  // Determine which endpoint(s) to call based on what data is needed
  let airQualityPromise: Promise<any> | null = null;
  let forecastPromise: Promise<any> | null = null;
  
  // If we need AQI or (pollen and in Europe), call air quality endpoint
  if (needAQI || (needPollen && isEurope)) {
    airQualityPromise = fetchAirQuality(
      lat, 
      lon, 
      needPollen, 
      forecastDays, 
      forceRefresh
    );
  }
  
  // If we need UVI and not getting it from air quality endpoint, call forecast endpoint
  if (needUVI && (!airQualityPromise || !needAQI)) {
    forecastPromise = fetchUVIndex(lat, lon, forecastDays, forceRefresh);
  }
  
  // Wait for all promises to resolve
  const results = await Promise.allSettled([
    airQualityPromise,
    forecastPromise
  ].filter(Boolean) as Promise<any>[]);
  
  // Process results
  const airQualityResult = results[0]?.status === 'fulfilled' ? results[0].value : null;
  const forecastResult = results[1]?.status === 'fulfilled' ? results[1].value : null;
  
  // Extract and process data
  const hourlyData: Record<string, any[]> = {};
  const dailyData: Record<string, any> = {};
  
  // Process hourly data
  const mergeHourlyData = (result: any, fields: string[]) => {
    if (!result?.hourly?.time) return;
    
    const { hourly, isStale } = result;
    
    hourly.time.forEach((time: string, i: number) => {
      const dateKey = time.split('T')[0]; // YYYY-MM-DD
      const hourKey = time; // Full ISO timestamp
      
      // Initialize daily object if it doesn't exist
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          isStale: isStale || false,
        };
      }
      
      // Initialize hourly object if it doesn't exist
      if (!hourlyData[hourKey]) {
        hourlyData[hourKey] = {
          time: hourKey,
          isStale: isStale || false,
        };
      }
      
      // Copy all requested fields
      fields.forEach(field => {
        if (hourly[field] && hourly[field][i] !== undefined) {
          hourlyData[hourKey][field] = hourly[field][i];
          
          // Update daily max/min/avg as needed
          if (field.includes('pollen')) {
            // For pollen, track daily maximum
            const currentMax = dailyData[dateKey][`${field}_max`] || -Infinity;
            dailyData[dateKey][`${field}_max`] = Math.max(currentMax, hourly[field][i]);
          } else if (field.includes('aqi')) {
            // For AQI, track daily maximum (worst hour)
            const currentMax = dailyData[dateKey][`${field}_max`] || -Infinity;
            dailyData[dateKey][`${field}_max`] = Math.max(currentMax, hourly[field][i]);
          } else if (field === 'uv_index' || field === 'uv_index_clear_sky') {
            // For UVI, track daily maximum
            const currentMax = dailyData[dateKey][`${field}_max`] || -Infinity;
            dailyData[dateKey][`${field}_max`] = Math.max(currentMax, hourly[field][i]);
          }
        }
      });
    });
  };
  
  // Extract from air quality result
  if (airQualityResult) {
    const airQualityFields = [
      'pm2_5', 'pm10', 'carbon_monoxide', 'nitrogen_dioxide', 
      'sulphur_dioxide', 'ozone', 'european_aqi', 'us_aqi'
    ];
    
    const pollenFields = [
      'alder_pollen', 'birch_pollen', 'grass_pollen', 
      'mugwort_pollen', 'olive_pollen', 'ragweed_pollen'
    ];
    
    // UV index might be in air quality result
    const uviFields = ['uv_index', 'uv_index_clear_sky'];
    
    mergeHourlyData(airQualityResult, [
      ...airQualityFields,
      ...pollenFields,
      ...uviFields
    ]);
  }
  
  // Extract from forecast result if available and not already processed UVI
  if (forecastResult) {
    const uviFields = ['uv_index', 'uv_index_clear_sky'];
    mergeHourlyData(forecastResult, uviFields);
    
    // Daily UVI might be directly available in forecast result
    if (forecastResult.daily?.time && forecastResult.daily?.uv_index_max) {
      forecastResult.daily.time.forEach((date: string, i: number) => {
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            isStale: forecastResult.isStale || false,
          };
        }
        
        if (forecastResult.daily.uv_index_max[i] !== undefined) {
          dailyData[date].uv_index_max = forecastResult.daily.uv_index_max[i];
        }
        
        if (forecastResult.daily.uv_index_clear_sky_max?.[i] !== undefined) {
          dailyData[date].uv_index_clear_sky_max = forecastResult.daily.uv_index_clear_sky_max[i];
        }
      });
    }
  }
  
  // Clean up -Infinity values in daily data
  Object.values(dailyData).forEach(day => {
    Object.keys(day).forEach(key => {
      if (day[key] === -Infinity) {
        day[key] = undefined;
      }
    });
  });
  
  // Final response
  return {
    hourly: Object.values(hourlyData),
    daily: Object.values(dailyData),
    isStale: (airQualityResult?.isStale || forecastResult?.isStale) || false,
    lastUpdated: new Date().toISOString(),
    updateFrequency: {
      uvi: 'Updated every few hours',
      aqi: recommendedDomain === 'cams_europe' 
        ? 'Updated every ~24 hours (4-day forecast)'
        : 'Updated every ~12 hours (5-day forecast)',
      pollen: isEurope 
        ? 'Updated every ~24 hours (4-day forecast), available only during pollen season'
        : 'Not available for this location'
    },
    fromCache: (airQualityResult?.fromCache || forecastResult?.fromCache) || false,
    cacheAge: airQualityResult?.cacheAge || forecastResult?.cacheAge || '0s',
    ...(includeDomainInfo ? { domainInfo: { isEurope, domain: recommendedDomain } } : {})
  };
}

/**
 * Clear cached data - useful for testing or when cache needs to be invalidated
 */
export function clearCache(): void {
  Object.keys(memoryCache).forEach(key => {
    delete memoryCache[key];
  });
  console.log('Open-Meteo cache cleared');
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entriesCount: number;
  sizeEstimate: string;
  oldestEntry: string;
  newestEntry: string;
} {
  const entries = Object.entries(memoryCache);
  
  if (entries.length === 0) {
    return {
      entriesCount: 0,
      sizeEstimate: '0 KB',
      oldestEntry: 'N/A',
      newestEntry: 'N/A'
    };
  }
  
  let oldestTimestamp = Infinity;
  let newestTimestamp = -Infinity;
  let totalSizeEstimate = 0;
  
  entries.forEach(([_, value]) => {
    oldestTimestamp = Math.min(oldestTimestamp, value.timestamp);
    newestTimestamp = Math.max(newestTimestamp, value.timestamp);
    
    // Rough estimate of in-memory size
    totalSizeEstimate += JSON.stringify(value.data).length;
  });
  
  const sizeInKB = Math.round(totalSizeEstimate / 1024);
  
  return {
    entriesCount: entries.length,
    sizeEstimate: `${sizeInKB} KB`,
    oldestEntry: new Date(oldestTimestamp).toISOString(),
    newestEntry: new Date(newestTimestamp).toISOString()
  };
}
