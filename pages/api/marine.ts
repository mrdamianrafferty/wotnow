// /pages/api/marine.ts
/**
 * Marine Weather Data API
 * 
 * Data Source Priority:
 * 1. Copernicus Database (free, comprehensive European waters)
 * 2. Met.no Ocean Forecast (free, Nordic seas & North Atlantic)
 * 3. NOAA CO-OPS (free, North American coastal waters)
 * 4. Open-Meteo Marine (free, global basic data)
 * 5. Stormglass (paid, last resort only)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { weatherMetrics } from '../../lib/monitoring/weatherMetrics';
import { getSupabaseServerClient } from '../../lib/supabase/serverClient';
import { round3dp, createCacheKey, COORDINATE_PRECISION } from '../../lib/utils/coordinates';
import { withRateLimit } from '../../lib/utils/apiMiddleware';

const coordKey3dp = (lat: number, lon: number) => createCacheKey(lat, lon, COORDINATE_PRECISION.STANDARD);

const STORMGLASS_API = 'https://api.stormglass.io/v2/weather/point';
const METNO_OCEAN_API = 'https://api.met.no/weatherapi/oceanforecast/2.0/complete';
const NOAA_COOPS_API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
const OPENMETEO_MARINE_API = 'https://marine-api.open-meteo.com/v1/marine';

// Marine data response structure
interface MarineDataHour {
  time: string;
  waterTemperature?: { value: number | null };
  waveHeight?: { value: number | null };
  waveDirection?: { value: number | null };
  wavePeriod?: { value: number | null };
  currentSpeed?: { value: number | null };
  currentDirection?: { value: number | null };
  salinity?: { value: number | null };
  windSpeed?: { value: number | null };
  windDirection?: { value: number | null };
  swellHeight?: { value: number | null };
  swellDirection?: { value: number | null };
  swellPeriod?: { value: number | null };
  visibility?: { value: number | null };
  gust?: { value: number | null };
}

interface MarineDataResponse {
  hours: MarineDataHour[];
  source: string;
}

// ---------------------------------------------------------------------------

// In-memory cache: key = lat_lon_bucket, for up to 12hrs, split into AM/PM
const cache = new Map<string, { timestamp: number; ttlMs: number; data: unknown }>();
// Returns "am" or "pm" to split bucket windows
const getTimeBucket = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'am' : 'pm';
};

// Export for testing
export const clearCache = () => cache.clear();

// ---------------------------------------------------------------------------

/**
 * Returns dynamic TTL based on model cycle timing
 */
function getDynamicTTL(): number {
  const now = new Date();
  const hour = now.getUTCHours();
  
  // Model updates typically at 00, 06, 12, 18 UTC
  // Fresh data: 3h cache, Stale data approaching update: 1h cache
  const hoursUntilNextUpdate = ((6 - (hour % 6)) % 6) || 6;
  
  if (hoursUntilNextUpdate > 3) {
    return 3 * 60 * 60 * 1000; // 3 hours - fresh data
  } else {
    return 1 * 60 * 60 * 1000; // 1 hour - approaching model update
  }
}

// ---------------------------------------------------------------------------

/**
 * Try to fetch marine data from Copernicus database
 * Returns data if available and recent (< 3 days old)
 */
async function fetchFromCopernicus(lat: number, lon: number, _startISO: string, _endISO: string): Promise<MarineDataResponse | null> {
  try {
    const supabase = getSupabaseServerClient();
    
    // Query copernicus_data table for nearest rectangle
    // For now, we'll use a simple distance-based query
    // In production, you might want to use PostGIS or pre-computed rectangle lookups
    const { data, error } = await supabase
      .from('copernicus_data')
      .select('*')
      .gte('data_date', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // Last 3 days
      .order('data_date', { ascending: false })
      .limit(100); // Get recent data points
    
    if (error || !data || data.length === 0) {
      console.log('📊 Copernicus DB: No data found');
      return null;
    }

    // Find nearest rectangle by simple lat/lon distance
    // This is a simplified approach - production should use proper geospatial queries
    let nearest = data[0];
    let minDist = Infinity;
    
    for (const row of data) {
      if (!row.rectangle_center_lat || !row.rectangle_center_lon) continue;
      const dlat = row.rectangle_center_lat - lat;
      const dlon = row.rectangle_center_lon - lon;
      const dist = Math.sqrt(dlat * dlat + dlon * dlon);
      if (dist < minDist) {
        minDist = dist;
        nearest = row;
      }
    }

    // Convert Copernicus data to marine API format
    const hours = [{
      time: nearest.data_date || new Date().toISOString(),
      waterTemperature: { value: nearest.sea_temp_c || null },
      waveHeight: { value: nearest.significant_wave_height_m || null },
      currentSpeed: { value: nearest.current_speed_ms || null },
      currentDirection: { value: nearest.current_direction_deg || null },
      salinity: { value: nearest.salinity_psu || null },
      windSpeed: { value: nearest.wind_speed_ms ? nearest.wind_speed_ms * 1.94384 : null }, // Convert m/s to knots
      windDirection: { value: nearest.wind_direction_deg || null },
    }];

    console.log('✅ Copernicus DB: Data found', { rectangle: nearest.rectangle_code, distance: minDist.toFixed(3) });
    return { hours, source: 'copernicus' };
  } catch (error) {
    console.error('❌ Copernicus DB error:', error);
    return null;
  }
}

/**
 * Try to fetch marine data from Met.no Ocean Forecast
 * Coverage: Mainly Nordic seas and North Atlantic
 */
async function fetchFromMetNo(lat: number, lon: number, _startISO: string, _endISO: string): Promise<MarineDataResponse | null> {
  try {
    const url = `${METNO_OCEAN_API}?lat=${lat}&lon=${lon}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'WotNow/1.0 (contact@wotnow.app)', // Met.no requires User-Agent
      },
    });

    if (!response.ok) {
      console.log(`📊 Met.no: Response ${response.status} (likely outside coverage area)`);
      return null;
    }

    const data = await response.json();
    
    // Parse Met.no ocean forecast format
    // This is a simplified parser - you may need to adjust based on actual Met.no response
    if (!data.properties?.timeseries) {
      return null;
    }

    const timeseries = data.properties.timeseries as Array<{
      time: string;
      data?: {
        instant?: {
          details?: {
            sea_water_temperature?: number;
            sea_water_speed?: number;
            sea_water_to_direction?: number;
          };
        };
      };
    }>;

    const hours = timeseries.slice(0, 48).map((ts) => ({
      time: ts.time,
      waterTemperature: { value: ts.data?.instant?.details?.sea_water_temperature ?? null },
      currentSpeed: { value: ts.data?.instant?.details?.sea_water_speed ?? null },
      currentDirection: { value: ts.data?.instant?.details?.sea_water_to_direction ?? null },
    }));

    console.log('✅ Met.no: Ocean data found');
    return { hours, source: 'metno' };
  } catch (error) {
    console.error('❌ Met.no error:', error);
    return null;
  }
}

/**
 * Check if coordinates are in North American coastal region
 */
function isNorthAmericanCoastal(lat: number, lon: number): boolean {
  // North America coastal regions (approximate bounding boxes)
  // Atlantic coast: 24°N-47°N, 97°W-65°W
  // Pacific coast: 32°N-60°N, 130°W-117°W
  // Gulf of Mexico: 24°N-31°N, 98°W-80°W
  // Alaska: 51°N-71°N, 180°W-130°W
  
  const isAtlanticCoast = lat >= 24 && lat <= 47 && lon >= -97 && lon <= -65;
  const isPacificCoast = lat >= 32 && lat <= 60 && lon >= -130 && lon <= -117;
  const isGulfCoast = lat >= 24 && lat <= 31 && lon >= -98 && lon <= -80;
  const isAlaska = lat >= 51 && lat <= 71 && lon >= -180 && lon <= -130;
  
  return isAtlanticCoast || isPacificCoast || isGulfCoast || isAlaska;
}

/**
 * Find nearest NOAA CO-OPS station
 * Returns station ID if found within reasonable distance (~50km)
 */
async function findNearestNOAAStation(lat: number, lon: number): Promise<string | null> {
  // Major NOAA CO-OPS stations (sample - in production, query from database or API)
  // Format: [stationId, lat, lon, name]
  const stations: Array<[string, number, number, string]> = [
    // Atlantic Coast
    ['8454000', 41.807, -71.400, 'Providence, RI'],
    ['8461490', 41.361, -72.089, 'New London, CT'],
    ['8510560', 40.467, -74.009, 'Montauk, NY'],
    ['8518750', 40.463, -74.009, 'The Battery, NY'],
    ['8534720', 38.787, -74.959, 'Atlantic City, NJ'],
    ['8557380', 36.967, -76.330, 'Lewisetta, VA'],
    ['8570283', 36.967, -76.013, 'Ocean City Inlet, MD'],
    ['8594900', 36.967, -76.113, 'Wilmington, NC'],
    ['8665530', 32.033, -80.903, 'Charleston, SC'],
    ['8720218', 27.760, -82.627, 'Mayport, FL'],
    ['8724580', 27.760, -82.627, 'Key West, FL'],
    
    // Pacific Coast
    ['9410170', 32.715, -117.173, 'San Diego, CA'],
    ['9410660', 32.867, -117.257, 'Los Angeles, CA'],
    ['9411340', 33.721, -118.272, 'Santa Monica, CA'],
    ['9414290', 37.807, -122.465, 'San Francisco, CA'],
    ['9432780', 43.350, -124.322, 'Charleston, OR'],
    ['9440910', 45.544, -122.598, 'Toke Point, WA'],
    ['9447130', 47.601, -122.339, 'Seattle, WA'],
    
    // Alaska
    ['9450460', 58.438, -134.647, 'Juneau, AK'],
    ['9454050', 57.050, -135.341, 'Sitka, AK'],
    
    // Gulf of Mexico
    ['8729108', 29.310, -94.793, 'Galveston, TX'],
    ['8761724', 29.723, -93.343, 'Grand Isle, LA'],
    ['8764227', 30.033, -90.198, 'New Orleans, LA'],
  ];
  
  let nearestStation: string | null = null;
  let minDistance = Infinity;
  
  for (const [stationId, stationLat, stationLon, name] of stations) {
    const dlat = stationLat - lat;
    const dlon = stationLon - lon;
    // Simple Euclidean distance (good enough for finding nearest)
    const distance = Math.sqrt(dlat * dlat + dlon * dlon);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestStation = stationId;
      console.log(`📍 NOAA: Found nearby station ${stationId} (${name}) - distance: ${distance.toFixed(3)}°`);
    }
  }
  
  // Only use station if within ~0.5 degrees (~50km)
  if (minDistance > 0.5) {
    console.log('📊 NOAA: No stations within 50km');
    return null;
  }
  
  return nearestStation;
}

/**
 * Try to fetch marine data from NOAA CO-OPS
 * Coverage: North American coastal waters (US East, West, Gulf, Alaska)
 */
async function fetchFromNOAA(lat: number, lon: number, startISO: string, _endISO: string): Promise<MarineDataResponse | null> {
  try {
    // Check if in North American coastal region
    if (!isNorthAmericanCoastal(lat, lon)) {
      console.log('📊 NOAA: Outside North American coastal coverage');
      return null;
    }
    
    // Find nearest station
    const stationId = await findNearestNOAAStation(lat, lon);
    if (!stationId) {
      return null;
    }
    
    // Parse start date for NOAA API format (YYYYMMDD)
    const startDate = new Date(startISO);
    const dateStr = startDate.toISOString().split('T')[0]!.replace(/-/g, '');
    
    // Fetch multiple products in parallel
    const [waterTempData, windData, airTempData] = await Promise.all([
      fetchNOAAProduct(stationId, 'water_temperature', dateStr),
      fetchNOAAProduct(stationId, 'wind', dateStr),
      fetchNOAAProduct(stationId, 'air_temperature', dateStr),
    ]);
    
    // If we got at least some data, format it
    if (!waterTempData && !windData && !airTempData) {
      console.log('📊 NOAA: No data available from station');
      return null;
    }
    
    // Combine data into hourly format
    const hours: MarineDataHour[] = [];
    const baseTime = startDate.getTime();
    
    for (let i = 0; i < 48; i++) {
      const hourTime = new Date(baseTime + i * 60 * 60 * 1000).toISOString();
      hours.push({
        time: hourTime,
        waterTemperature: waterTempData ? { value: waterTempData.temp ?? null } : undefined,
        windSpeed: windData ? { value: windData.speed ?? null } : undefined,
        windDirection: windData ? { value: windData.direction ?? null } : undefined,
      });
    }
    
    console.log(`✅ NOAA CO-OPS: Data found from station ${stationId}`);
    return { hours, source: 'noaa' };
  } catch (error) {
    console.error('❌ NOAA error:', error);
    return null;
  }
}

/**
 * Fetch specific product from NOAA CO-OPS API
 */
async function fetchNOAAProduct(
  stationId: string, 
  product: string, 
  dateStr: string
): Promise<{ temp?: number; speed?: number; direction?: number } | null> {
  try {
    const url = new URL(NOAA_COOPS_API);
    url.searchParams.set('station', stationId);
    url.searchParams.set('product', product);
    url.searchParams.set('begin_date', dateStr);
    url.searchParams.set('range', '48'); // 48 hours
    url.searchParams.set('time_zone', 'gmt');
    url.searchParams.set('units', 'metric');
    url.searchParams.set('format', 'json');
    url.searchParams.set('application', 'WotNow');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Parse based on product type
    if (product === 'water_temperature' && data.data?.[0]?.v) {
      return { temp: parseFloat(data.data[0].v) };
    } else if (product === 'wind' && data.data?.[0]) {
      return { 
        speed: data.data[0].s ? parseFloat(data.data[0].s) * 0.514444 : undefined, // Convert knots to m/s
        direction: data.data[0].d ? parseFloat(data.data[0].d) : undefined 
      };
    } else if (product === 'air_temperature' && data.data?.[0]?.v) {
      return { temp: parseFloat(data.data[0].v) };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to fetch marine data from Open-Meteo
 * Coverage: Global, but basic data only
 */
async function fetchFromOpenMeteo(lat: number, lon: number, _startISO: string, _endISO: string): Promise<MarineDataResponse | null> {
  try {
    const url = `${OPENMETEO_MARINE_API}?latitude=${lat}&longitude=${lon}&hourly=wave_height,wave_direction,wave_period&timezone=UTC&forecast_days=7`;
    
    const response = await fetch(url);

    if (!response.ok) {
      console.log(`📊 Open-Meteo: Response ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.hourly) {
      return null;
    }

    const hours = data.hourly.time.map((time: string, i: number) => ({
      time,
      waveHeight: { value: data.hourly.wave_height?.[i] || null },
      waveDirection: { value: data.hourly.wave_direction?.[i] || null },
      wavePeriod: { value: data.hourly.wave_period?.[i] || null },
    }));

    console.log('✅ Open-Meteo: Marine data found');
    return { hours, source: 'openmeteo' };
  } catch (error) {
    console.error('❌ Open-Meteo error:', error);
    return null;
  }
}

/**
 * LAST RESORT: Fetch from Stormglass (paid API)
 * Only used when all free sources fail
 * Uses 1dp rounding (~11km) to minimize paid API calls
 */
async function fetchFromStormglass(lat: number, lon: number, startISO: string, endISO: string, apiKey: string): Promise<{ hours: MarineDataHour[] } | null> {
  const params = [
    'windSpeed',
    'windDirection',
    'gust',
    'currentSpeed',
    'currentDirection',
    'waveHeight',
    'waveDirection',
    'wavePeriod',
    'swellHeight',
    'swellDirection',
    'swellPeriod',
    'waterTemperature',
    'visibility'
  ].join(',');
  
  // Import at top of file would be better, but avoiding for minimal change
  const round1dp = (n: number) => Math.round(n * 10) / 10;
  const rlat = round1dp(lat);
  const rlon = round1dp(lon);
  
  const url = `${STORMGLASS_API}?lat=${rlat}&lng=${rlon}&params=${params}&start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`;
  
  const span = weatherMetrics.start('stormglass', 'marine', JSON.stringify({ lat: rlat, lon: rlon }));
  
  try {
    const sgRes = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });
    
    if (!sgRes.ok) {
      const errorText = await sgRes.text();
      console.error('❌ Stormglass API Response:', errorText);
      span?.failure(new Error(`HTTP ${sgRes.status}`), { status: sgRes.status });
      return null;
    }

    const data = await sgRes.json();

    if ((data as { errors?: unknown; message?: unknown })?.errors || (data as { message?: unknown })?.message) {
      console.error('❌ Stormglass API returned an error:', (data as { errors?: unknown; message?: unknown }).errors || (data as { message?: unknown }).message);
      span?.failure(new Error('Stormglass API error payload'), { status: sgRes.status });
      return null;
    }

    console.log('⚠️  Stormglass: PAID API used (all free sources failed)');
    span?.success({ status: sgRes.status });
    return data;
  } catch (error) {
    const err = error as Error;
    console.error('❌ Stormglass API Error:', err.stack || String(error));
    span?.failure(err);
    return null;
  }
}

// ---------------------------------------------------------------------------

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lon, start, end } = req.query;

  // Parse + snap to 3dp
  const latNum = typeof lat === 'string' ? parseFloat(lat) : Array.isArray(lat) ? parseFloat(lat[0]!) : NaN;
  const lonNum = typeof lon === 'string' ? parseFloat(lon) : Array.isArray(lon) ? parseFloat(lon[0]!) : NaN;
  const rlat = round3dp(latNum);
  const rlon = round3dp(lonNum);

  // Normalise start/end to strings
  const startISO = typeof start === 'string' ? start : Array.isArray(start) ? start[0]! : '';
  const endISO = typeof end === 'string' ? end : Array.isArray(end) ? end[0]! : '';

  console.log('🌍 Incoming request (rounded):', { lat: rlat, lon: rlon, start: startISO, end: endISO });

  if (!isFinite(rlat) || !isFinite(rlon) || !startISO || !endISO) {
    return res.status(400).json({ error: 'Missing or invalid lat/lon/start/end params' });
  }

  // Cache key now includes rounded coord key + time bucket + time range
  const locationKey = `${coordKey3dp(rlat, rlon)}_${getTimeBucket()}_${startISO}_${endISO}`;
  const now = Date.now();

  // ✅ Return cached response if fresh
  const cached = cache.get(locationKey);
  if (cached && now - cached.timestamp < cached.ttlMs) {
    console.log(`✅ Cache hit for ${coordKey3dp(rlat, rlon)} (${getTimeBucket()}) ttl=${Math.round(cached.ttlMs/60000)}m`);
    return res.status(200).json(cached.data);
  }

  // 🌊 WATERFALL: Try data sources in order of preference (free → paid)
  console.log('🔄 Cache miss - trying data sources in order...');
  
  // 1. Try Copernicus Database (free, comprehensive European waters)
  let result = await fetchFromCopernicus(rlat, rlon, startISO, endISO);
  
  // 2. Try Met.no Ocean Forecast (free, Nordic seas & North Atlantic)
  if (!result) {
    result = await fetchFromMetNo(rlat, rlon, startISO, endISO);
  }
  
  // 3. Try NOAA CO-OPS (free, North American coastal waters)
  if (!result) {
    result = await fetchFromNOAA(rlat, rlon, startISO, endISO);
  }
  
  // 4. Try Open-Meteo Marine (free, global basic data)
  if (!result) {
    result = await fetchFromOpenMeteo(rlat, rlon, startISO, endISO);
  }
  
  // 5. LAST RESORT: Try Stormglass (paid, only when all free sources fail)
  if (!result) {
    const apiKey = process.env.STORMGLASS_SECRET_KEY;
    if (!apiKey) {
      console.error('❌ No data from free sources and Stormglass API key missing');
      return res.status(500).json({ error: 'No marine data available' });
    }
    
    const sgData = await fetchFromStormglass(rlat, rlon, startISO, endISO, apiKey);
    if (sgData) {
      result = { hours: sgData.hours || [], source: 'stormglass-paid' };
    }
  }

  // If we still have no data, return error
  if (!result || !result.hours) {
    console.error('❌ All data sources failed');
    return res.status(503).json({ error: 'Unable to fetch marine data from any source' });
  }

  // Calculate dynamic TTL based on data freshness
  const ttlMs = getDynamicTTL();
  
  // Cache the result
  cache.set(locationKey, {
    timestamp: now,
    ttlMs,
    data: { 
      ...result, 
      cached: false,
      source: result.source // Include source in response for debugging
    }
  });

  console.log(`✅ Marine data fetched from ${result.source}, cached with ttl=${Math.round(ttlMs/60000)}m`);
  
  // Set cache headers
  res.setHeader('Cache-Control', `s-maxage=${Math.round(ttlMs/1000)}, stale-while-revalidate=43200`);
  res.setHeader('X-Marine-Data-Source', result.source);
  
  return res.status(200).json({
    ...result,
    cached: false
  });
}

// Rate limit: 30 requests per minute (lenient for public marine data)
export default withRateLimit(handler, 'lenient');
