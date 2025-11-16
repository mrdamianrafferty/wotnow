import { SUPABASE_ANON_KEY, buildEdgeFunctionUrl } from '../supabase/env';

type PermissionAwareWindow = typeof window & {
  __googleMapsPermissionError?: boolean;
};

const hasGlobalPermissionError = () =>
  typeof window !== 'undefined' && Boolean((window as PermissionAwareWindow).__googleMapsPermissionError);

const setGlobalPermissionError = () => {
  if (typeof window !== 'undefined') {
    (window as PermissionAwareWindow).__googleMapsPermissionError = true;
  }
};

/**
Google Maps Utilities

Lazy-loading helpers for Google Maps JavaScript API
 */

let googleMapsPromise: Promise<typeof google> | null = null;
let isLoading = false;
let cachedApiKey: string | null = null;
let hasPermissionError = false;

// Global error handler for Google Maps API errors
if (typeof window !== 'undefined') {
  // Listen for Google Maps API errors
  const originalConsoleError = console.error;
  console.error = function(...args: unknown[]) {
    // ⚠️ FIX NEEDED: Replace 'any[]' with 'unknown[]'
    const errorStr = args.join(' ');
    
    // Detect RefererNotAllowedMapError
    if (errorStr.includes('RefererNotAllowedMapError') || 
        errorStr.includes('referer-not-allowed-map-error')) {
  hasPermissionError = true;
  setGlobalPermissionError();
      // ⚠️ FIX NEEDED: Replace 'any' with 'Record<string, unknown>'
      
      // Remove the Google Maps script to prevent further errors
      const script = document.getElementById('google-maps-script');
      if (script) {
        script.remove();
      }
      
      // Reset the promise so it doesn't try again
      googleMapsPromise = null;
      isLoading = false;
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔴 GOOGLE MAPS API ERROR: RefererNotAllowedMapError');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('⚠️  Falling back to OpenStreetMap (no configuration needed)');
      console.log('');
      console.log('🔧 To enable Google Maps (optional):');
      console.log('   1. Go to: https://console.cloud.google.com/google/maps-apis/credentials');
      console.log('   2. Click your API key');
      console.log('   3. Under "Application restrictions" → Select "HTTP referrers"');
      console.log('   4. Add these referrers:');
      console.log('      • https://figma.site/*');
      console.log('      • https://.figma.site/');
      console.log('      • https://-figmaiframepreview.figma.site/');
      console.log('   5. Save and wait 1-2 minutes');
      console.log('   6. Hard refresh this page (Ctrl+Shift+R or Cmd+Shift+R)');
      console.log('');
      console.log('✅ Your app works perfectly with OpenStreetMap!');
      console.log('   ✅ Interactive map picker');
      console.log('   ✅ "Current Location" button (GPS)');
      console.log('   ✅ Manual location entry');
      console.log('   ✅ Recent locations');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Don't call original console.error for this specific error
      // to avoid cluttering the console
      return;
    }
    
    // Call original console.error
    originalConsoleError.apply(console, args);
  };
}

/**
Load Google Maps JavaScript API with Places library
Returns a promise that resolves when the API is ready
 */
export async function loadGoogleMapsAPI(): Promise<typeof google> {
  // Check for permission error first
  if (hasPermissionError || hasGlobalPermissionError()) {
    throw new Error('Google Maps API has permission errors. Using fallback.');
  }

  // If already loaded, return immediately
  if (typeof window !== 'undefined' && window.google?.maps) {
    return window.google;
  }

  // If already loading, return the existing promise
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  // Start loading
  isLoading = true;
  googleMapsPromise = new Promise(async (resolve, reject) => {
    // Check for permission error again
  if (hasPermissionError || hasGlobalPermissionError()) {
      isLoading = false;
      reject(new Error('Google Maps API has permission errors. Using fallback.'));
      return;
    }

    // Check if script already exists
    if (document.getElementById('google-maps-script')) {
      // Check if there's an error on the existing script
  if (hasPermissionError || hasGlobalPermissionError()) {
        isLoading = false;
        reject(new Error('Google Maps API has permission errors. Using fallback.'));
        return;
      }
      
      // Wait for it to load
      const checkInterval = setInterval(() => {
        // Check for errors during loading
  if (hasPermissionError || hasGlobalPermissionError()) {
          clearInterval(checkInterval);
          isLoading = false;
          reject(new Error('Google Maps API has permission errors. Using fallback.'));
          return;
        }
        
        if (window.google?.maps) {
          clearInterval(checkInterval);
          isLoading = false;
          resolve(window.google);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!window.google?.maps) {
          isLoading = false;
          reject(new Error('Google Maps API load timeout'));
        }
      }, 10000);
      return;
    }

    // Get API key from cache or fetch from backend
    let apiKey = cachedApiKey;
    
    // If no API key yet, try fetching from backend
    if (!apiKey) {
      try {
        const response = await fetch(
          buildEdgeFunctionUrl('config/google-maps-key'),
          {
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json() as { key?: string };
          // ⚠️ FIX NEEDED: Add type assertion
          if (data.key) {
            apiKey = data.key;
            cachedApiKey = data.key;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch Google Maps API key from backend:', err);
      }
    }
    
    if (!apiKey) {
      isLoading = false;
      reject(new Error('Google Maps API key not configured. Using fallback location methods.'));
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      isLoading = false;
      if (window.google?.maps) {
        resolve(window.google);
      } else {
        reject(new Error('Google Maps API loaded but not available'));
      }
    };

    script.onerror = () => {
      isLoading = false;
      reject(new Error('Failed to load Google Maps API. Check your API key and internet connection.'));
    };

    document.head.appendChild(script);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (isLoading) {
        isLoading = false;
        reject(new Error('Google Maps API load timeout. Check your internet connection.'));
      }
    }, 10000);
  });

  return googleMapsPromise;
}

/**
Check if Google Maps API is loaded
 */
export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && !!window.google?.maps;
}

/**
Check if there's a permission error with Google Maps API
 */
export function hasGoogleMapsPermissionError(): boolean {
  return hasPermissionError;
}

/**
Reset the loading state (useful for testing)
 */
export function resetGoogleMapsLoader(): void {
  googleMapsPromise = null;
  isLoading = false;
  hasPermissionError = false;
}
