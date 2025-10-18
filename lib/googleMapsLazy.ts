/**
 * Lazy-load Google Maps API on demand
 *
 * This avoids blocking initial page render with Google Maps script.
 * The API is only loaded when CoastalLocationDialog opens for the first time.
 */

// Get API key at module level so Next.js can inline it at build time
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

let loadPromise: Promise<void> | null = null;
let isLoaded = false;

export function loadGoogleMapsAPI(): Promise<void> {
  // Already loaded
  if (isLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  // Already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = new Promise((resolve, reject) => {
    console.log('🔍 Google Maps API key check:', GOOGLE_MAPS_API_KEY ? 'Found' : 'Missing');

    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_google_maps_api_key') {
      console.error('❌ Google Maps API key missing or not configured');
      console.error('Key value:', GOOGLE_MAPS_API_KEY || '(empty)');
      reject(new Error('Google Maps API key is not configured. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local'));
      return;
    }

    // Check if script already exists (edge case)
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      console.log('✅ Google Maps script already in DOM');
      if (window.google?.maps) {
        isLoaded = true;
        resolve();
      } else {
        // Script exists but not loaded yet - wait for event
        window.addEventListener('googleMapsLoaded', () => {
          isLoaded = true;
          resolve();
        }, { once: true });
      }
      return;
    }

    console.log('🔄 Lazy loading Google Maps API...');

    // Create timeout handler
    const timeoutId = setTimeout(() => {
      console.error('❌ Google Maps failed to load within 15 seconds');
      reject(new Error('Google Maps load timeout - please check your internet connection'));
    }, 15000);

    // Create callback that Google Maps will call when ready
    (window as Window & { initGoogleMaps?: () => void }).initGoogleMaps = () => {
      clearTimeout(timeoutId);
      isLoaded = true;
      console.log('✅ Google Maps API loaded successfully (lazy)');
      resolve();
    };

    // Listen for load event
    window.addEventListener('googleMapsLoaded', () => {
      clearTimeout(timeoutId);
      isLoaded = true;
      resolve();
    }, { once: true });

    // Listen for error event
    window.addEventListener('googleMapsLoadError', () => {
      clearTimeout(timeoutId);
      reject(new Error('Google Maps failed to load'));
    }, { once: true });

    // Create and inject script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async&v=weekly&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;

    console.log('📡 Loading Google Maps from:', script.src.substring(0, 80) + '...');

    script.onerror = () => {
      clearTimeout(timeoutId);
      console.error('❌ Error loading Google Maps script');
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function isGoogleMapsReady(): boolean {
  return isLoaded && window.google?.maps !== undefined;
}
