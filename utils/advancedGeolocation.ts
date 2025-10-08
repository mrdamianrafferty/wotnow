/**
 * Advanced Geolocation Utility with Multiple Fallback Strategies
 * 
 * This utility provides robust geolocation with:
 * - Progressive fallback from high accuracy to low accuracy geolocation
 * - watchPosition for improved accuracy on macOS
 * - IP-based geolocation as ultimate fallback
 * - Smart caching and retry logic
 * - macOS-specific optimizations
 */
import { roundCoord } from './coordinatePrecision';

export interface LocationResult {
  lat: number;
  lon: number;
  accuracy?: number;
  method: 'gps-high' | 'gps-low' | 'gps-cached' | 'watch' | 'ip' | 'manual';
  city?: string;
  region?: string;
  country?: string;
  name?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  useWatchPosition?: boolean;
  enableIpFallback?: boolean;
  ipApiKey?: string;
  abortSignal?: AbortSignal;
}

class AdvancedGeolocationService {
  private watchId: number | null = null;
  private readonly CACHE_KEY = 'advancedGeolocationCache';
  private readonly FAILURE_KEY = 'geolocationFailureCount';
  private readonly IP_CACHE_KEY = 'ipGeolocationCache';
  
  /**
   * Get user location with progressive fallback strategies
   */
  async getLocation(options: GeolocationOptions = {}): Promise<LocationResult> {
    const {
      enableHighAccuracy = true,
      timeout = 10000,
      maximumAge = 300000, // 5 minutes
      useWatchPosition = false,
      enableIpFallback = true,
      ipApiKey,
      abortSignal
    } = options;

    // Check if already aborted
    if (abortSignal?.aborted) {
      throw new Error('Geolocation was aborted before starting');
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.log('Geolocation not supported, trying IP fallback');
      if (enableIpFallback) {
        return this.getIpLocation(ipApiKey, abortSignal);
      }
      throw new Error('Geolocation not supported and IP fallback disabled');
    }

    // Detect macOS and persistent failures
    const isMacOS = this.isMacOS();
    const failureCount = this.getFailureCount();
    
    // Special handling for macOS Sequoia (15.6+) which has stricter location policies
    const isSequoia = isMacOS && /macOS.*1[5-9]|macOS.*[2-9][0-9]/.test(navigator.userAgent);
    
    // For macOS Sequoia, skip GPS entirely and go straight to IP fallback or fail gracefully
    if (isSequoia) {
      console.log('macOS Sequoia detected - GPS unreliable, trying IP fallback only');
      if (enableIpFallback) {
        try {
          const ipResult = await this.getIpLocation(ipApiKey, abortSignal);
          console.log('IP location successful');
          return ipResult;
        } catch {
          console.log('IP fallback failed, encouraging manual search');
        }
      }
      // Always fail gracefully for Sequoia - no warnings needed
      throw new Error('automatic_location_unavailable');
    }
    
    // For older macOS with any failures, skip GPS and use IP fallback
    if (isMacOS && failureCount >= 1 && enableIpFallback) {
      console.log('macOS with previous failures detected, skipping GPS and using IP fallback');
      try {
        const ipResult = await this.getIpLocation(ipApiKey, abortSignal);
        console.log('IP fallback successful');
        return ipResult;
      } catch {
        console.log('IP fallback failed, encouraging manual search');
        throw new Error('automatic_location_unavailable');
      }
    }
    
    // If we're on macOS with previous failures, prefer watchPosition or IP fallback
    if (isMacOS && failureCount >= 2) {
      console.log('macOS with previous failures detected, trying advanced strategies');
      
      if (useWatchPosition) {
        try {
          return await this.getLocationWithWatch(timeout, enableHighAccuracy, abortSignal);
        } catch (watchError) {
          console.warn('watchPosition failed:', this.getErrorMessage(watchError as GeolocationPositionError));
        }
      }
    }

    // Try progressive geolocation fallback
    try {
      return await this.getLocationProgressive(enableHighAccuracy, timeout, maximumAge, abortSignal);
    } catch (error) {
      const errorMsg = this.getErrorMessage(error as GeolocationPositionError);
      console.warn('Progressive geolocation failed:', errorMsg);
      
      // For macOS CoreLocation errors, definitely try IP fallback
      const isCorLocationError = isMacOS && (error as GeolocationPositionError).code === 2;
      
      if (isCorLocationError) {
        console.log('macOS CoreLocation error detected, prioritizing IP fallback');
      }
      
      this.incrementFailureCount();
      
      // Final fallback to IP location
      if (enableIpFallback) {
        console.log('All geolocation methods failed, using IP fallback');
        try {
          // For IP fallback, don't use the abort signal if the error was due to user abort
          // This allows IP location to succeed even if user started typing
          const useAbortSignal = error instanceof Error && error.message.includes('aborted') ? undefined : abortSignal;
          return await this.getIpLocation(ipApiKey, useAbortSignal);
        } catch (ipError) {
          console.error('IP fallback also failed:', ipError);
          // For macOS users, fail gracefully to encourage manual search
          if (isMacOS) {
            throw new Error('automatic_location_unavailable');
          }
          throw new Error(`All location methods failed. Last GPS error: ${errorMsg}`);
        }
      }
      
      // If no IP fallback enabled, fail gracefully on macOS
      if (isMacOS) {
        throw new Error('automatic_location_unavailable');
      }
      
      throw error;
    }
  }

  /**
   * Progressive geolocation with multiple accuracy levels
   */
  private async getLocationProgressive(
    _enableHighAccuracy: boolean,
    _timeout: number,
    _maximumAge: number,
    abortSignal?: AbortSignal
  ): Promise<LocationResult> {
    const isMacOS = this.isMacOS();
    
    // For macOS, use very conservative settings and fail fast
    const strategies = isMacOS ? [
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }, // Single quick network-based attempt
    ] : [
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 }
    ];

    let lastError: Error | GeolocationPositionError | undefined;

    for (let i = 0; i < strategies.length; i++) {
      // Check if aborted before each strategy
      if (abortSignal?.aborted) {
        throw new Error('Geolocation was aborted');
      }

      const strategy = strategies[i];
      const method = isMacOS ? 'gps-low' : (i === 0 ? 'gps-high' : i === 1 ? 'gps-low' : 'gps-cached');
      
      try {
        console.log(`Trying geolocation strategy ${i + 1}${isMacOS ? ' (macOS optimized)' : ''}:`, strategy);
        const position = await this.getCurrentPositionPromise(strategy, abortSignal);
        
        const result = await this.processGeolocationResult(position, method);
        this.resetFailureCount(); // Success, reset failure count
        this.cacheLocation(result);
        return result;
      } catch (error) {
        const errorMsg = this.getErrorMessage(error as GeolocationPositionError);
        console.log(`Geolocation strategy ${i + 1} failed: ${errorMsg}`);
        lastError = error as Error | GeolocationPositionError;
        
        // If aborted, throw immediately instead of trying next strategy
        if (error instanceof Error && error.message.includes('aborted')) {
          throw error;
        }
        
        // For macOS CoreLocation errors (error code 2), try IP fallback earlier
        if (isMacOS && (error as GeolocationPositionError).code === 2) {
          console.log('macOS CoreLocation error detected, considering early IP fallback');
          // Continue to next strategy first, but this helps decide on IP fallback
        }
      }
    }

    throw lastError || new Error('Unknown geolocation error');
  }

  /**
   * Use watchPosition for potentially better accuracy on macOS
   */
  private async getLocationWithWatch(
    timeout: number, 
    _enableHighAccuracy: boolean, 
    abortSignal?: AbortSignal
  ): Promise<LocationResult> {
    return new Promise<LocationResult>((resolve, reject) => {
      // Check if already aborted
      if (abortSignal?.aborted) {
        reject(new Error('watchPosition was aborted'));
        return;
      }

      let resolved = false;
      const timeoutId = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
          }
          reject(new Error('watchPosition timeout'));
        }
      }, timeout);

      // Handle abort signal
      const onAbort = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
          }
          reject(new Error('watchPosition was aborted'));
        }
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort);
      }

      this.watchId = navigator.geolocation.watchPosition(
        async (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            if (abortSignal) {
              abortSignal.removeEventListener('abort', onAbort);
            }
            if (this.watchId !== null) {
              navigator.geolocation.clearWatch(this.watchId);
              this.watchId = null;
            }
            
            try {
              const result = await this.processGeolocationResult(position, 'watch');
              this.resetFailureCount();
              this.cacheLocation(result);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        },
        (error) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            if (abortSignal) {
              abortSignal.removeEventListener('abort', onAbort);
            }
            if (this.watchId !== null) {
              navigator.geolocation.clearWatch(this.watchId);
              this.watchId = null;
            }
            reject(error);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeout / 2, // Use half timeout for individual position
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Get location using IP-based geolocation services
   */
  private async getIpLocation(apiKey?: string, abortSignal?: AbortSignal): Promise<LocationResult> {
    // Check if already aborted
    if (abortSignal?.aborted) {
      throw new Error('IP geolocation was aborted');
    }

    // Check cache first
    const cached = this.getCachedIpLocation();
    if (cached) {
      console.log('Using cached IP location');
      return cached;
    }

    // Try multiple IP geolocation services
    const services = [
      // Free services first
      { name: 'ipapi.co', url: 'https://ipapi.co/json/', needsKey: false },
      { name: 'ipinfo.io', url: 'https://ipinfo.io/json', needsKey: false },
      // Paid services if API key available
      ...(apiKey ? [
        { name: 'ipgeolocation.io', url: `https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`, needsKey: true }
      ] : [])
    ];

    let lastError: Error | undefined;

    for (const service of services) {
      // Check if aborted before each service
      if (abortSignal?.aborted) {
        throw new Error('IP geolocation was aborted');
      }

      if (service.needsKey && !apiKey) continue;

      try {
        console.log(`Trying IP geolocation service: ${service.name}`);
        
        // Create a combined abort signal for both external abort and timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        if (abortSignal) {
          abortSignal.addEventListener('abort', () => controller.abort());
        }

        const response = await fetch(service.url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const result = this.processIpLocationResult(data, service.name);
        
        // Cache successful result
        this.cacheIpLocation(result);
        
        return result;
      } catch (error) {
        console.warn(`IP service ${service.name} failed:`, error);
        lastError = error as Error;
        
        // If aborted, throw immediately instead of trying next service
        if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
          throw new Error('IP geolocation was aborted');
        }
      }
    }

    throw new Error(`All IP geolocation services failed. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Process geolocation API result
   */
  private async processGeolocationResult(position: GeolocationPosition, method: LocationResult['method']): Promise<LocationResult> {
    const { latitude, longitude, accuracy } = position.coords;
    
    // Try to get location name using reverse geocoding
    try {
      const locationInfo = await this.reverseGeocode(latitude, longitude);
      return {
        lat: latitude,
        lon: longitude,
        accuracy,
        method,
        confidence: accuracy && accuracy < 100 ? 'high' : accuracy && accuracy < 1000 ? 'medium' : 'low',
        ...locationInfo
      };
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return {
        lat: latitude,
        lon: longitude,
        accuracy,
        method,
        confidence: accuracy && accuracy < 100 ? 'high' : accuracy && accuracy < 1000 ? 'medium' : 'low',
        name: `Location (${roundCoord(latitude)}, ${roundCoord(longitude)})`
      };
    }
  }

  /**
   * Process IP geolocation result
   */
  private processIpLocationResult(data: Record<string, unknown>, serviceName: string): LocationResult {
    let lat: number, lon: number, city: string, region: string, country: string;

    // Handle different service response formats
    if (serviceName === 'ipapi.co') {
      lat = parseFloat(String(data.latitude));
      lon = parseFloat(String(data.longitude));
      city = String(data.city);
      region = String(data.region);
      country = String(data.country_name);
    } else if (serviceName === 'ipinfo.io') {
      const [latStr, lonStr] = String(data.loc).split(',');
      lat = parseFloat(latStr);
      lon = parseFloat(lonStr);
      city = String(data.city);
      region = String(data.region);
      country = String(data.country);
    } else if (serviceName === 'ipgeolocation.io') {
      lat = parseFloat(String(data.latitude));
      lon = parseFloat(String(data.longitude));
      city = String(data.city);
      region = String(data.state_prov);
      country = String(data.country_name);
    } else {
      throw new Error(`Unknown service format: ${serviceName}`);
    }

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error('Invalid coordinates received from IP service');
    }

    const name = [city, region, country].filter(Boolean).join(', ');

    return {
      lat,
      lon,
      method: 'ip',
      confidence: 'low',
      city,
      region,
      country,
      name: name || `IP Location (${roundCoord(lat)}, ${roundCoord(lon)})`
    };
  }

  /**
   * Reverse geocode coordinates to location name
   */
  private async reverseGeocode(lat: number, lon: number): Promise<{ city?: string; region?: string; country?: string; name: string }> {
    const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (!apiKey) {
      throw new Error('No API key for reverse geocoding');
    }

    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`,
      {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      throw new Error('No reverse geocoding results');
    }

    const location = data[0];
    let name = location.name || 'Unknown Location';
    
    if (location.state && location.state !== name) {
      name += `, ${location.state}`;
    }
    
    if (location.country && !name.includes(location.country)) {
      name += `, ${location.country}`;
    }

    return {
      city: location.name,
      region: location.state,
      country: location.country,
      name
    };
  }

  /**
   * Convert navigator.geolocation.getCurrentPosition to Promise with abort support
   */
  private getCurrentPositionPromise(
    options: PositionOptions, 
    abortSignal?: AbortSignal
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      // Check if already aborted
      if (abortSignal?.aborted) {
        reject(new Error('Geolocation was aborted'));
        return;
      }

      // Handle abort signal
      const onAbort = () => {
        reject(new Error('Geolocation was aborted by user'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort);
      }

      // Start the geolocation request
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', onAbort);
          }
          resolve(position);
        },
        (error) => {
          if (abortSignal) {
            abortSignal.removeEventListener('abort', onAbort);
          }
          reject(error);
        },
        options
      );
    });
  }

  /**
   * Detect if running on macOS
   */
  private isMacOS(): boolean {
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }

  /**
   * Cache management
   */
  private cacheLocation(result: LocationResult): void {
    try {
      const cache = {
        result,
        timestamp: Date.now(),
        expires: Date.now() + 600000 // 10 minutes
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache location:', error);
    }
  }

  private getCachedLocation(): LocationResult | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const cache = JSON.parse(cached);
      if (cache.expires < Date.now()) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }

      return cache.result;
    } catch (error) {
      console.warn('Failed to get cached location:', error);
      return null;
    }
  }

  private cacheIpLocation(result: LocationResult): void {
    try {
      const cache = {
        result,
        timestamp: Date.now(),
        expires: Date.now() + 3600000 // 1 hour for IP location
      };
      localStorage.setItem(this.IP_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to cache IP location:', error);
    }
  }

  private getCachedIpLocation(): LocationResult | null {
    try {
      const cached = localStorage.getItem(this.IP_CACHE_KEY);
      if (!cached) return null;

      const cache = JSON.parse(cached);
      if (cache.expires < Date.now()) {
        localStorage.removeItem(this.IP_CACHE_KEY);
        return null;
      }

      return cache.result;
    } catch (error) {
      console.warn('Failed to get cached IP location:', error);
      return null;
    }
  }

  /**
   * Failure tracking
   */
  private getFailureCount(): number {
    try {
      const count = localStorage.getItem(this.FAILURE_KEY);
      return count ? parseInt(count, 10) : 0;
    } catch {
      return 0;
    }
  }

  private incrementFailureCount(): void {
    try {
      const count = this.getFailureCount() + 1;
      localStorage.setItem(this.FAILURE_KEY, count.toString());
    } catch (error) {
      console.warn('Failed to increment failure count:', error);
    }
  }

  private resetFailureCount(): void {
    try {
      localStorage.removeItem(this.FAILURE_KEY);
    } catch (error) {
      console.warn('Failed to reset failure count:', error);
    }
  }

  /**
   * Get human-readable error message for geolocation errors
   */
  private getErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case 1:
        return 'Permission denied - user blocked location access';
      case 2:
        return 'Position unavailable - CoreLocation/network/GPS issues';
      case 3:
        return 'Timeout - location request took too long';
      default:
        return `Unknown error (code: ${error.code}) - ${error.message}`;
    }
  }

  /**
   * Cleanup method
   */
  cleanup(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

// Export singleton instance
export const advancedGeolocation = new AdvancedGeolocationService();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    advancedGeolocation.cleanup();
  });
}
