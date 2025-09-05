// Enhanced diagnostic script to check Google Maps API setup
const checkGoogleMapsAPI = () => {
  console.log('=== Google Maps API Diagnostic ===');
  
  // Check if Google Maps API is loaded
  if (typeof google === 'undefined') {
    console.error('❌ Google Maps API not loaded');
    return false;
  }
  
  console.log('✅ Google Maps API loaded');
  
  // Check if Places API is available
  if (typeof google.maps === 'undefined') {
    console.error('❌ google.maps not available');
    return false;
  }
  
  console.log('✅ google.maps available');
  
  // Check if Places library is loaded
  if (typeof google.maps.places === 'undefined') {
    console.error('❌ google.maps.places not available');
    return false;
  }
  
  console.log('✅ google.maps.places available');
  
  // Check for AutocompleteService (deprecated)
  if (typeof google.maps.places.AutocompleteService !== 'undefined') {
    console.warn('⚠️ AutocompleteService is available but deprecated');
  }
  
  // Check for new AutocompleteSuggestion
  if (typeof google.maps.places.AutocompleteSuggestion !== 'undefined') {
    console.log('✅ AutocompleteSuggestion available (recommended)');
  } else {
    console.warn('⚠️ AutocompleteSuggestion not available');
  }
  
  // Check API key
  const apiKey = process?.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('❌ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set');
    return false;
  }
  
  console.log('✅ API key configured');
  
  return true;
};

// Enhanced geolocation testing with detailed diagnostics
const testGeolocation = () => {
  console.log('=== Enhanced Geolocation Diagnostic ===');
  
  if (!navigator.geolocation) {
    console.error('❌ Geolocation not supported');
    return;
  }
  
  console.log('✅ Geolocation supported');
  
  // Detect platform
  const userAgent = navigator.userAgent;
  const isMacOS = /Mac|iPhone|iPad|iPod/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  
  console.log(`🖥️ Platform: ${isMacOS ? 'macOS/iOS' : 'Other'}`);
  console.log(`🌐 Browser: ${isChrome ? 'Chrome' : isSafari ? 'Safari' : isFirefox ? 'Firefox' : 'Other'}`);
  
  if (isMacOS) {
    console.warn('⚠️ macOS detected - may have CoreLocation issues');
  }
  
  // Test permissions
  if ('permissions' in navigator) {
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      console.log(`📍 Geolocation permission: ${result.state}`);
      
      if (result.state === 'denied') {
        console.error('❌ Geolocation permission denied');
      } else if (result.state === 'prompt') {
        console.log('⏳ Geolocation permission will prompt user');
      }
      
      // Listen for permission changes
      result.addEventListener('change', () => {
        console.log(`📍 Permission changed to: ${result.state}`);
      });
    }).catch(err => {
      console.warn('Could not check geolocation permission:', err);
    });
  }
  
  // Test basic geolocation
  console.log('🧪 Testing basic geolocation...');
  const testStart = Date.now();
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const duration = Date.now() - testStart;
      console.log(`✅ Basic geolocation successful in ${duration}ms`);
      console.log(`📍 Coordinates: ${position.coords.latitude}, ${position.coords.longitude}`);
      console.log(`🎯 Accuracy: ${position.coords.accuracy}m`);
      console.log(`⏰ Timestamp: ${new Date(position.timestamp).toISOString()}`);
    },
    (error) => {
      const duration = Date.now() - testStart;
      console.error(`❌ Basic geolocation failed in ${duration}ms`);
      console.error(`Error code: ${error.code} - ${error.message}`);
      
      switch (error.code) {
        case 1:
          console.error('🚫 Permission denied - user blocked location access');
          break;
        case 2:
          console.error('📍 Position unavailable - CoreLocation/network/GPS issues');
          if (isMacOS) {
            console.error('💡 macOS CoreLocation Issue Detected:');
            console.error('   • Check System Preferences > Security & Privacy > Location Services');
            console.error('   • Ensure browser has location permission');
            console.error('   • Try connecting to a different Wi-Fi network');
            console.error('   • Consider using IP-based fallback');
          }
          break;
        case 3:
          console.error('⏰ Timeout - location request took too long');
          if (isMacOS) {
            console.warn('💡 macOS timeout is common - consider using watchPosition or IP fallback');
          }
          break;
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 60000
    }
  );
  
  // Test watchPosition on macOS
  if (isMacOS) {
    console.log('🧪 Testing watchPosition for macOS...');
    
    let watchTestComplete = false;
    const watchTimeout = setTimeout(() => {
      if (!watchTestComplete) {
        console.warn('⏰ watchPosition test timeout');
        watchTestComplete = true;
      }
    }, 15000);
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!watchTestComplete) {
          watchTestComplete = true;
          clearTimeout(watchTimeout);
          navigator.geolocation.clearWatch(watchId);
          
          console.log('✅ watchPosition successful on macOS');
          console.log(`📍 Watch coordinates: ${position.coords.latitude}, ${position.coords.longitude}`);
          console.log(`🎯 Watch accuracy: ${position.coords.accuracy}m`);
        }
      },
      (error) => {
        if (!watchTestComplete) {
          watchTestComplete = true;
          clearTimeout(watchTimeout);
          navigator.geolocation.clearWatch(watchId);
          
          console.error('❌ watchPosition failed on macOS');
          console.error(`Watch error: ${error.code} - ${error.message}`);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  }
  
  // Test IP geolocation fallback
  console.log('🧪 Testing IP geolocation fallback...');
  testIpGeolocation();
};

// Test IP geolocation services
const testIpGeolocation = async () => {
  const services = [
    { name: 'ipapi.co', url: 'https://ipapi.co/json/' },
    { name: 'ipinfo.io', url: 'https://ipinfo.io/json' }
  ];
  
  for (const service of services) {
    try {
      console.log(`🧪 Testing ${service.name}...`);
      const response = await fetch(service.url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${service.name} successful`);
        
        if (service.name === 'ipapi.co') {
          console.log(`📍 IP Location: ${data.city}, ${data.region}, ${data.country_name}`);
          console.log(`🌐 Coordinates: ${data.latitude}, ${data.longitude}`);
        } else if (service.name === 'ipinfo.io') {
          console.log(`📍 IP Location: ${data.city}, ${data.region}, ${data.country}`);
          console.log(`🌐 Coordinates: ${data.loc}`);
        }
      } else {
        console.warn(`⚠️ ${service.name} returned HTTP ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ ${service.name} failed:`, error);
    }
  }
};

// Check localStorage and failure tracking
const checkLocationStorage = () => {
  console.log('=== Location Storage Diagnostic ===');
  
  try {
    const recentLocations = localStorage.getItem('recentCoastalLocations');
    console.log(`📍 Recent locations: ${recentLocations ? JSON.parse(recentLocations).length : 0} stored`);
    
    const hasLocationIssues = localStorage.getItem('hasLocationIssues');
    console.log(`⚠️ Has location issues flag: ${hasLocationIssues || 'not set'}`);
    
    const geolocationCache = localStorage.getItem('advancedGeolocationCache');
    console.log(`💾 Geolocation cache: ${geolocationCache ? 'present' : 'none'}`);
    
    const ipCache = localStorage.getItem('ipGeolocationCache');
    console.log(`🌐 IP geolocation cache: ${ipCache ? 'present' : 'none'}`);
    
    const failureCount = localStorage.getItem('geolocationFailureCount');
    console.log(`❌ Failure count: ${failureCount || '0'}`);
    
  } catch (error) {
    console.error('❌ localStorage not available:', error);
  }
};

// Run comprehensive diagnostics
const runComprehensiveDiagnostics = () => {
  console.log('🔧 Running comprehensive location diagnostics...');
  console.log('====================================================');
  
  checkGoogleMapsAPI();
  console.log('');
  
  testGeolocation();
  console.log('');
  
  checkLocationStorage();
  console.log('');
  
  console.log('✅ Diagnostics complete. Check console for detailed results.');
};

// Run diagnostics when page loads
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      checkGoogleMapsAPI();
      testGeolocation();
    }, 1000);
  });
}

export { checkGoogleMapsAPI, testGeolocation, testIpGeolocation, checkLocationStorage, runComprehensiveDiagnostics };
