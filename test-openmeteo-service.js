/**
 * OpenMeteo Service Example Usage
 * 
 * This script demonstrates how to use the optimized OpenMeteo service
 * to fetch environmental data (UVI, AQI, and pollen) with proper caching,
 * rate limiting, and retry logic.
 * 
 * Run with: node test-openmeteo-service.js
 */
// Mock implementations for demonstration purposes
const mockServices = {
  fetchUVIndex: async (lat, lon, forecastDays = 7, forceRefresh = false) => {
    console.log(`[MOCK] Fetching UVI for ${lat}, ${lon}`);
    await new Promise(r => setTimeout(r, 500)); // Simulate API call
    return {
      daily: {
        time: ['2025-08-25'],
        uv_index_max: [7],
        uv_index_clear_sky_max: [8]
      },
      hourly: {
        time: ['2025-08-25T12:00:00Z'],
        uv_index: [6],
        uv_index_clear_sky: [7]
      },
      isStale: true,
      lastUpdated: new Date().toISOString(),
      updateFrequency: 'UVI forecast updates every few hours',
      fromCache: false
    };
  },
  
  fetchAirQuality: async (lat, lon, includePollen = true, forecastDays = 7, forceRefresh = false) => {
    const isEurope = (lat >= 36 && lat <= 70 && lon >= -10 && lon <= 40);
    const recommendedDomain = isEurope ? 'cams_europe' : 'cams_global';
    
    console.log(`[MOCK] Fetching AQI for ${lat}, ${lon} (${recommendedDomain})`);
    await new Promise(r => setTimeout(r, 700)); // Simulate API call
    
    return {
      hourly: {
        time: ['2025-08-25T12:00:00Z'],
        us_aqi: [45],
        european_aqi: [25],
        pm2_5: [12.5],
        pm10: [22.3],
        ...(includePollen && isEurope ? {
          grass_pollen: [2.5],
          birch_pollen: [1.2],
          alder_pollen: [0.5],
          ragweed_pollen: [0.2]
        } : {})
      },
      isStale: true,
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
      },
      fromCache: false
    };
  },
  
  fetchEnvironmentalData: async (lat, lon, forecastDays = 7, options = {}) => {
    const { 
      forceRefresh = false,
      needUVI = true,
      needAQI = true,
      needPollen = true,
      includeDomainInfo = true
    } = options;
    
    const isEurope = (lat >= 36 && lat <= 70 && lon >= -10 && lon <= 40);
    
    console.log(`[MOCK] Fetching all environmental data for ${lat}, ${lon}`);
    await new Promise(r => setTimeout(r, 900)); // Simulate API call
    
    return {
      hourly: [
        {
          time: '2025-08-25T12:00:00Z',
          uv_index: 6,
          us_aqi: 45,
          pm2_5: 12.5,
          ...(isEurope ? { grass_pollen: 2.5 } : {})
        }
      ],
      daily: [
        {
          date: '2025-08-25',
          uv_index_max: 7,
          us_aqi_max: 50,
          ...(isEurope ? { grass_pollen_max: 3.2 } : {})
        }
      ],
      isStale: true,
      lastUpdated: new Date().toISOString(),
      updateFrequency: {
        uvi: 'Updated every few hours',
        aqi: 'Updated every ~24 hours (4-day forecast)',
        pollen: isEurope 
          ? 'Updated every ~24 hours (4-day forecast), available only during pollen season'
          : 'Not available for this location'
      },
      fromCache: false,
      ...(includeDomainInfo ? { 
        domainInfo: { 
          isEurope, 
          domain: isEurope ? 'cams_europe' : 'cams_global' 
        } 
      } : {})
    };
  },
  
  getCacheStats: () => {
    return {
      entriesCount: 5,
      sizeEstimate: '25 KB',
      oldestEntry: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      newestEntry: new Date().toISOString()
    };
  },
  
  clearCache: () => {
    console.log('[MOCK] Cache cleared');
  }
};

// Use our mock implementations for testing the API design
const { 
  fetchUVIndex, 
  fetchAirQuality, 
  fetchEnvironmentalData,
  getCacheStats,
  clearCache
} = mockServices;

async function testOpenMeteoService() {
  // Test locations - European vs non-European
  const locations = [
    { name: 'London', lat: 51.5074, lon: -0.1278, isEurope: true },
    { name: 'Paris', lat: 48.8566, lon: 2.3522, isEurope: true },
    { name: 'New York', lat: 40.7128, lon: -74.006, isEurope: false },
    { name: 'Tokyo', lat: 35.6762, lon: 139.6503, isEurope: false },
  ];

  console.log('📊 Testing OpenMeteo Service with optimized fetching and caching\n');

  // Example 1: Fetch UVI only for a location (minimal API load)
  console.log('🔍 Example 1: Fetch UVI only for London');
  try {
    console.time('UVI fetch');
    const uviData = await fetchUVIndex(locations[0].lat, locations[0].lon);
    console.timeEnd('UVI fetch');
    
    console.log(`  ✓ UVI max for today: ${uviData.daily?.uv_index_max?.[0] || 'N/A'}`);
    console.log(`  ✓ Data freshness: ${uviData.isStale ? 'Using historical data (stale)' : 'Current forecast'}`);
    console.log(`  ✓ Cache status: ${uviData.fromCache ? 'From cache' : 'Fresh fetch'}`);
    console.log(`  ✓ Update frequency: ${uviData.updateFrequency}`);
  } catch (error) {
    console.error('  ✗ Error fetching UVI:', error.message);
  }

  console.log('\n');

  // Example 2: Fetch air quality with pollen data for Paris
  console.log('🔍 Example 2: Fetch AQI and pollen for Paris');
  try {
    console.time('AQI fetch');
    const aqiData = await fetchAirQuality(locations[1].lat, locations[1].lon, true);
    console.timeEnd('AQI fetch');
    
    // Print first day AQI
    const firstDayAqi = aqiData.hourly?.us_aqi?.[0] || 'N/A';
    console.log(`  ✓ Current US AQI: ${firstDayAqi}`);
    
    // Check if pollen data is available (depends on season and location)
    const hasPollenData = 
      aqiData.hourly?.grass_pollen?.[0] !== undefined || 
      aqiData.hourly?.birch_pollen?.[0] !== undefined;
    
    console.log(`  ✓ Pollen data available: ${hasPollenData ? 'Yes' : 'No (might be off-season)'}`);
    console.log(`  ✓ Domain used: ${aqiData.domainInfo?.domain}`);
    console.log(`  ✓ Cache status: ${aqiData.fromCache ? 'From cache' : 'Fresh fetch'}`);
  } catch (error) {
    console.error('  ✗ Error fetching AQI:', error.message);
  }

  console.log('\n');

  // Example 3: Fetch all environmental data in optimized way
  console.log('🔍 Example 3: Fetch all environmental data for New York (optimized)');
  try {
    console.time('Environmental data fetch');
    const envData = await fetchEnvironmentalData(locations[2].lat, locations[2].lon);
    console.timeEnd('Environmental data fetch');
    
    console.log(`  ✓ Data points fetched: ${envData.hourly?.length || 0} hourly, ${envData.daily?.length || 0} daily`);
    console.log(`  ✓ Location region: ${envData.domainInfo?.isEurope ? 'Europe' : 'Non-Europe'}`);
    console.log(`  ✓ Domain selected: ${envData.domainInfo?.domain}`);
    console.log(`  ✓ Cache status: ${envData.fromCache ? 'From cache' : 'Fresh fetch'}`);
    
    // Print first day data
    if (envData.daily?.length > 0) {
      const today = envData.daily[0];
      console.log(`  ✓ Today's data (${today.date}):`);
      console.log(`    • Max UVI: ${today.uv_index_max ?? 'N/A'}`);
      console.log(`    • Max US AQI: ${today.us_aqi_max ?? 'N/A'}`);
      
      // Pollen data will be undefined for non-European locations
      if (today.grass_pollen_max !== undefined) {
        console.log(`    • Max Grass Pollen: ${today.grass_pollen_max}`);
      }
    }
  } catch (error) {
    console.error('  ✗ Error fetching environmental data:', error.message);
  }

  console.log('\n');

  // Example 4: Demonstrate cache reuse
  console.log('🔍 Example 4: Demonstrate cache reuse for London (same as Example 1)');
  try {
    // Should be cached from Example 1
    console.time('Cached UVI fetch');
    const uviData = await fetchUVIndex(locations[0].lat, locations[0].lon);
    console.timeEnd('Cached UVI fetch');
    
    console.log(`  ✓ Cache status: ${uviData.fromCache ? 'From cache ✓' : 'Fresh fetch ✗ (expected cache hit)'}`);
    console.log(`  ✓ Cache age: ${uviData.cacheAge || 'N/A'}`);
    
    // Print cache stats
    const stats = getCacheStats();
    console.log('  ✓ Cache statistics:');
    console.log(`    • Total entries: ${stats.entriesCount}`);
    console.log(`    • Memory usage: ${stats.sizeEstimate}`);
    console.log(`    • Oldest entry: ${stats.oldestEntry}`);
    console.log(`    • Newest entry: ${stats.newestEntry}`);
  } catch (error) {
    console.error('  ✗ Error demonstrating cache:', error.message);
  }

  console.log('\n');

  // Example 5: Force refresh (bypass cache)
  console.log('🔍 Example 5: Force refresh data for London (bypass cache)');
  try {
    console.time('Force refresh');
    const uviData = await fetchUVIndex(locations[0].lat, locations[0].lon, 7, true);
    console.timeEnd('Force refresh');
    
    console.log(`  ✓ Cache status: ${uviData.fromCache ? 'From cache ✗ (expected fresh)' : 'Fresh fetch ✓'}`);
    
    // Fetch again, should be cached now
    console.time('After refresh');
    const cachedData = await fetchUVIndex(locations[0].lat, locations[0].lon);
    console.timeEnd('After refresh');
    
    console.log(`  ✓ Second fetch: ${cachedData.fromCache ? 'From cache ✓' : 'Fresh fetch ✗ (expected cache hit)'}`);
  } catch (error) {
    console.error('  ✗ Error with force refresh:', error.message);
  }

  console.log('\n');

  // Example 6: Request deduplication for concurrent requests
  console.log('🔍 Example 6: Request deduplication for concurrent requests');
  try {
    console.log('  Making 3 identical requests concurrently...');
    
    console.time('Concurrent requests');
    const [result1, result2, result3] = await Promise.all([
      fetchEnvironmentalData(locations[3].lat, locations[3].lon), // Tokyo
      fetchEnvironmentalData(locations[3].lat, locations[3].lon), // Tokyo (same)
      fetchEnvironmentalData(locations[3].lat, locations[3].lon), // Tokyo (same)
    ]);
    console.timeEnd('Concurrent requests');
    
    // If deduplication works, all 3 should have the same data and only 1 API call made
    console.log(`  ✓ All requests completed`);
    console.log(`  ✓ Request 1 cache status: ${result1.fromCache ? 'From cache' : 'Fresh fetch'}`);
    console.log(`  ✓ Request 2 cache status: ${result2.fromCache ? 'From cache' : 'Fresh fetch'}`);
    console.log(`  ✓ Request 3 cache status: ${result3.fromCache ? 'From cache' : 'Fresh fetch'}`);
    
    // Cache stats after all tests
    const stats = getCacheStats();
    console.log('\n📊 Final cache statistics:');
    console.log(`  • Total entries: ${stats.entriesCount}`);
    console.log(`  • Memory usage: ${stats.sizeEstimate}`);
  } catch (error) {
    console.error('  ✗ Error with concurrent requests:', error.message);
  }

  console.log('\n✅ Testing complete');
}

// Run the test
testOpenMeteoService().catch(error => {
  console.error('Error running test script:', error);
});
