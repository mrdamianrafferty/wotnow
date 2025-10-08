// utils/coordinatePrecision.ts

/**
 * Coordinate precision configuration
 * 
 * Updated Strategy (10,000x - 1,000,000x better caching):
 * - Marine/Beach: 3 decimal places (~111m accuracy)
 * - General Weather: 3 decimal places (~111m accuracy)  
 * - Environmental/Alerts: 2 decimal places (~1.1km accuracy)
 * 
 * Based on Norwegian Met Office recommendation that weather
 * doesn't need more than 4 decimals, we go even further for better caching.
 */

// Precision levels for different data types
export const PRECISION_LEVELS = {
  MARINE: 3,        // ~111m - Good enough for coastal activities
  WEATHER: 3,       // ~111m - Weather doesn't change per building
  ENVIRONMENTAL: 2, // ~1.1km - Pollen, air quality, UV are regional
  ALERTS: 2,        // ~1.1km - Weather alerts cover large areas
  DEFAULT: 3,       // Safe default for general use
} as const;

// Global precision constant for backwards compatibility
export const COORDINATE_PRECISION = PRECISION_LEVELS.DEFAULT;

/**
 * Determine precision based on data type or endpoint
 */
export function getPrecisionForType(dataType?: string): number {
  if (!dataType) return PRECISION_LEVELS.DEFAULT;
  
  const lower = dataType.toLowerCase();
  
  // Environmental indicators (2 decimal precision)
  if (
    lower.includes('pollen') ||
    lower.includes('air') ||
    lower.includes('quality') ||
    lower.includes('aqi') ||
    lower.includes('uv') ||
    lower.includes('alert') ||
    lower.includes('warning') ||
    lower.includes('visibility') ||
    lower.includes('astronomy') ||
    lower.includes('sunrise') ||
    lower.includes('sunset') ||
    lower.includes('moon')
  ) {
    return PRECISION_LEVELS.ENVIRONMENTAL;
  }
  
  // Marine/coastal (3 decimal precision)
  if (
    lower.includes('marine') ||
    lower.includes('wave') ||
    lower.includes('tide') ||
    lower.includes('beach') ||
    lower.includes('coastal') ||
    lower.includes('surf') ||
    lower.includes('ocean') ||
    lower.includes('stormglass')
  ) {
    return PRECISION_LEVELS.MARINE;
  }
  
  // Default to weather precision
  return PRECISION_LEVELS.WEATHER;
}

/**
 * Round a coordinate to the standard precision (backwards compatible)
 * @param coord - Latitude or longitude value
 * @param precision - Optional precision override
 * @returns Rounded coordinate
 */
export function roundCoord(coord: number, precision?: number): number {
  const p = precision ?? COORDINATE_PRECISION;
  return +coord.toFixed(p);
}

/**
 * Round coordinate with automatic precision detection
 * @param coord - Latitude or longitude value
 * @param dataType - Type of data (e.g., 'weather', 'marine', 'pollen')
 * @returns Rounded coordinate
 */
export function roundCoordForType(coord: number, dataType?: string): number {
  const precision = getPrecisionForType(dataType);
  return +coord.toFixed(precision);
}

/**
 * Generate cache key from coordinates (backwards compatible)
 * @param lat - Latitude
 * @param lon - Longitude
 * @param dataType - Optional data type for smart precision
 * @returns Standardized cache key
 */
export function getCacheKey(lat: number, lon: number, dataType?: string): string {
  if (dataType) {
    const precision = getPrecisionForType(dataType);
    const roundedLat = +lat.toFixed(precision);
    const roundedLon = +lon.toFixed(precision);
    return `${dataType}:${roundedLat},${roundedLon}`;
  }
  // Backwards compatible version without dataType
  return `${roundCoord(lat)},${roundCoord(lon)}`;
}

/**
 * Round both coordinates at once (backwards compatible)
 */
export function roundCoordinates(
  lat: number, 
  lon: number, 
  dataType?: string
): { lat: number; lon: number; precision?: number } {
  if (dataType) {
    const precision = getPrecisionForType(dataType);
    return {
      lat: +lat.toFixed(precision),
      lon: +lon.toFixed(precision),
      precision
    };
  }
  // Backwards compatible version
  return {
    lat: roundCoord(lat),
    lon: roundCoord(lon)
  };
}

/**
 * Check if two locations are effectively the same for caching (backwards compatible)
 */
export function isSameLocation(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  dataType?: string
): boolean {
  if (dataType) {
    const precision = getPrecisionForType(dataType);
    return (
      +lat1.toFixed(precision) === +lat2.toFixed(precision) &&
      +lon1.toFixed(precision) === +lon2.toFixed(precision)
    );
  }
  // Backwards compatible version
  return roundCoord(lat1) === roundCoord(lat2) && 
         roundCoord(lon1) === roundCoord(lon2);
}

/**
 * Cache statistics helper
 */
export class CacheStats {
  private static apiCalls = 0;
  private static cacheHits = 0;
  private static startTime = Date.now();
  
  static recordAPICall(): void {
    this.apiCalls++;
    this.logIfMilestone();
  }
  
  static recordCacheHit(): void {
    this.cacheHits++;
    this.logIfMilestone();
  }
  
  static getStats() {
    const total = this.apiCalls + this.cacheHits;
    const hitRate = total > 0 ? (this.cacheHits / total * 100) : 0;
    const runtime = (Date.now() - this.startTime) / 1000 / 60; // minutes
    
    return {
      apiCalls: this.apiCalls,
      cacheHits: this.cacheHits,
      total,
      hitRate: hitRate.toFixed(1) + '%',
      runtime: runtime.toFixed(1) + ' min',
      savingsEstimate: `$${(this.cacheHits * 0.0005).toFixed(2)}` // Assuming $0.0005 per API call saved
    };
  }
  
  static reset(): void {
    this.apiCalls = 0;
    this.cacheHits = 0;
    this.startTime = Date.now();
  }
  
  private static logIfMilestone(): void {
    const total = this.apiCalls + this.cacheHits;
    if (total % 100 === 0) {
      const stats = this.getStats();
      console.log(`📊 Cache Performance: ${stats.hitRate} hit rate | Saved: ${stats.savingsEstimate} | Total: ${total} requests`);
    }
  }
}

/**
 * Migration helper to update precision from old to new
 */
export function migratePrecision(from: number = 4, to: number = 3): void {
  if (typeof window === 'undefined') return;
  
  const migrationKey = `precision_migration_${from}_to_${to}`;
  if (localStorage.getItem(migrationKey)) {
    console.log('Migration already completed');
    return;
  }
  
  console.log(`🔄 Migrating coordinate precision from ${from} to ${to} decimals...`);
  
  const keysToMigrate = [
    'wotnow.coast.orientation.v1',
    'cachedBeaches',
    'recentCoastalLocations',
    'weatherCache',
    'marineCache'
  ];
  
  let migrated = 0;
  
  keysToMigrate.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      
      const data = JSON.parse(raw);

      type LatLonRecord = { lat: number; lon: number; [key: string]: unknown };

      const processItem = (item: unknown): unknown => {
        if (
          item &&
          typeof item === 'object' &&
          'lat' in item &&
          'lon' in item &&
          typeof (item as { lat: unknown }).lat === 'number' &&
          typeof (item as { lon: unknown }).lon === 'number'
        ) {
          const coords = item as LatLonRecord;
          return {
            ...coords,
            lat: +coords.lat.toFixed(to),
            lon: +coords.lon.toFixed(to)
          };
        }
        return item;
      };

      const updated = Array.isArray(data)
        ? data.map((entry) => processItem(entry))
        : processItem(data);
      
      localStorage.setItem(key, JSON.stringify(updated));
      migrated++;
    } catch (e) {
      console.error(`Failed to migrate ${key}:`, e);
    }
  });
  
  localStorage.setItem(migrationKey, new Date().toISOString());
  console.log(`✅ Migration complete! Updated ${migrated} cache keys.`);
}

/**
 * Example usage in your code:
 * 
 * // For weather data (3 decimals):
 * const weatherKey = getCacheKey(lat, lon, 'weather');
 * 
 * // For environmental data (2 decimals):
 * const pollenKey = getCacheKey(lat, lon, 'pollen');
 * 
 * // For marine data (3 decimals):
 * const marineKey = getCacheKey(lat, lon, 'marine');
 * 
 * // Check cache performance:
 * console.log(CacheStats.getStats());
 */

// Auto-migrate from 4 to 3 decimals on first load
if (typeof window !== 'undefined' && !localStorage.getItem('precision_migration_4_to_3')) {
  // Delay migration slightly to not block initial load
  setTimeout(() => migratePrecision(4, 3), 1000);
}