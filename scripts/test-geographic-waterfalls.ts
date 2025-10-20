#!/usr/bin/env tsx
/**
 * Test Geographic API Waterfalls
 * 
 * Tests the waterfall behavior across different geographic locations:
 * - San Francisco (US West Coast) - Should use NWS + NOAA tides
 * - New York (US East Coast) - Should use NWS + NOAA tides
 * - Mumbai (India) - Should use Open-Meteo + WorldTides
 */

const TEST_LOCATIONS = [
  {
    name: 'San Francisco, CA (US West Coast)',
    lat: 37.7749,
    lon: -122.4194,
    expectedWeather: 'NWS',
    expectedTides: 'WorldTides or NOAA',
    expectedPollen: 'NWS'
  },
  {
    name: 'New York, NY (US East Coast)',
    lat: 40.7128,
    lon: -74.0060,
    expectedWeather: 'NWS',
    expectedTides: 'WorldTides or NOAA',
    expectedPollen: 'NWS'
  },
  {
    name: 'Denver, CO (US Inland)',
    lat: 39.7392,
    lon: -104.9903,
    expectedWeather: 'NWS',
    expectedTides: 'None (landlocked)',
    expectedPollen: 'NWS'
  },
  {
    name: 'Mumbai, India',
    lat: 19.0760,
    lon: 72.8777,
    expectedWeather: 'Open-Meteo',
    expectedTides: 'WorldTides',
    expectedPollen: 'Open-Meteo'
  }
];

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

interface TestResult {
  location: string;
  endpoint: string;
  success: boolean;
  source?: string;
  error?: string;
  responseTime?: number;
  cached?: boolean;
}

const results: TestResult[] = [];

async function testWeatherEndpoint(location: typeof TEST_LOCATIONS[0]): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const url = `${BASE_URL}/api/unified-weather?lat=${location.lat}&lon=${location.lon}`;
    console.log(`\n🌤️  Testing weather: ${location.name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const source = data.weather?.source || data.source || 'unknown';
    
    console.log(`   ✅ Source: ${source} (${responseTime}ms)`);
    
    return {
      location: location.name,
      endpoint: 'weather',
      success: true,
      source,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      location: location.name,
      endpoint: 'weather',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime
    };
  }
}

async function testTidesEndpoint(location: typeof TEST_LOCATIONS[0]): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const url = `${BASE_URL}/api/tides?lat=${location.lat}&lon=${location.lon}`;
    console.log(`\n🌊 Testing tides: ${location.name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const source = data.source || 'unknown';
    const cached = data.cached || false;
    const dataCount = Array.isArray(data.data) ? data.data.length : 0;
    
    console.log(`   ✅ Source: ${source} (${responseTime}ms) ${cached ? '[CACHED]' : ''}`);
    console.log(`   📊 Tide extremes: ${dataCount}`);
    
    return {
      location: location.name,
      endpoint: 'tides',
      success: true,
      source,
      responseTime,
      cached
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      location: location.name,
      endpoint: 'tides',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime
    };
  }
}

async function testPollenEndpoint(location: typeof TEST_LOCATIONS[0]): Promise<TestResult> {
  const startTime = Date.now();
  try {
    const url = `${BASE_URL}/api/weather-with-pollen?lat=${location.lat}&lon=${location.lon}`;
    console.log(`\n🌸 Testing pollen: ${location.name}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const responseTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const source = data.source || 'unknown';
    const hasPollenData = data.pollenByDate && Object.keys(data.pollenByDate).length > 0;
    const hasAirQuality = data.airQualityByDate && Object.keys(data.airQualityByDate).length > 0;
    
    console.log(`   ✅ Weather source: ${source} (${responseTime}ms)`);
    console.log(`   📊 Pollen data: ${hasPollenData ? 'YES' : 'NO'}`);
    console.log(`   📊 Air quality: ${hasAirQuality ? 'YES' : 'NO'}`);
    
    return {
      location: location.name,
      endpoint: 'pollen',
      success: true,
      source,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    
    return {
      location: location.name,
      endpoint: 'pollen',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime
    };
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Geographic API Waterfall Tests');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Locations: ${TEST_LOCATIONS.length}`);
  console.log('═══════════════════════════════════════════════════════════');

  for (const location of TEST_LOCATIONS) {
    console.log(`\n\n┌─────────────────────────────────────────────────────────┐`);
    console.log(`│ 📍 ${location.name.padEnd(55)}│`);
    console.log(`│    Coordinates: ${location.lat}, ${location.lon}`.padEnd(60) + '│');
    console.log(`│    Expected Weather: ${location.expectedWeather}`.padEnd(60) + '│');
    console.log(`│    Expected Tides: ${location.expectedTides}`.padEnd(60) + '│');
    console.log(`└─────────────────────────────────────────────────────────┘`);

    // Test all endpoints for this location
    const weatherResult = await testWeatherEndpoint(location);
    results.push(weatherResult);
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    
    const tidesResult = await testTidesEndpoint(location);
    results.push(tidesResult);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const pollenResult = await testPollenEndpoint(location);
    results.push(pollenResult);
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay between locations
  }

  // Print summary
  console.log('\n\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════════');
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`\nTotal tests: ${results.length}`);
  console.log(`✅ Passed: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log(`📈 Success rate: ${((successCount / results.length) * 100).toFixed(1)}%`);
  
  // Group results by location
  console.log('\n\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 📋 Detailed Results by Location                        │');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  for (const location of TEST_LOCATIONS) {
    console.log(`\n📍 ${location.name}:`);
    const locationResults = results.filter(r => r.location === location.name);
    
    for (const result of locationResults) {
      const status = result.success ? '✅' : '❌';
      const source = result.source || 'N/A';
      const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      const cached = result.cached ? ' [CACHED]' : '';
      
      console.log(`  ${status} ${result.endpoint.padEnd(10)} → ${source.padEnd(15)} (${time})${cached}`);
      
      if (!result.success && result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
  }
  
  // API Source Distribution
  console.log('\n\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ 🌍 API Source Distribution                              │');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  const sourceCounts: Record<string, number> = {};
  for (const result of results.filter(r => r.success && r.source)) {
    const source = result.source!;
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  }
  
  const sortedSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
  
  for (const [source, count] of sortedSources) {
    const percentage = ((count / successCount) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count * 3));
    console.log(`  ${source.padEnd(15)} ${bar} ${count} (${percentage}%)`);
  }
  
  // Performance Summary
  console.log('\n\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ ⚡ Performance Summary                                  │');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  const successfulResults = results.filter(r => r.success && r.responseTime);
  if (successfulResults.length > 0) {
    const times = successfulResults.map(r => r.responseTime!);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`\n  Average response time: ${avgTime.toFixed(0)}ms`);
    console.log(`  Fastest response: ${minTime}ms`);
    console.log(`  Slowest response: ${maxTime}ms`);
  }
  
  // Expected vs Actual
  console.log('\n\n┌─────────────────────────────────────────────────────────┐');
  console.log('│ ✓ Expected vs Actual Sources                           │');
  console.log('└─────────────────────────────────────────────────────────┘');
  
  for (const location of TEST_LOCATIONS) {
    console.log(`\n📍 ${location.name}:`);
    
    const weatherResult = results.find(r => r.location === location.name && r.endpoint === 'weather');
    const tidesResult = results.find(r => r.location === location.name && r.endpoint === 'tides');
    const pollenResult = results.find(r => r.location === location.name && r.endpoint === 'pollen');
    
    const checkMatch = (actual: string | undefined, expected: string) => {
      if (!actual) return '❓';
      if (expected.includes('or')) {
        // Handle "WorldTides or NOAA" case
        const options = expected.toLowerCase().split(' or ').map(s => s.trim());
        return options.some(opt => actual.toLowerCase().includes(opt)) ? '✅' : '⚠️';
      }
      return actual.toLowerCase().includes(expected.toLowerCase()) ? '✅' : '⚠️';
    };
    
    console.log(`  Weather:  ${checkMatch(weatherResult?.source, location.expectedWeather)} Expected ${location.expectedWeather}, got ${weatherResult?.source || 'N/A'}`);
    console.log(`  Tides:    ${checkMatch(tidesResult?.source, location.expectedTides)} Expected ${location.expectedTides}, got ${tidesResult?.source || 'N/A'}`);
    console.log(`  Pollen:   ${checkMatch(pollenResult?.source, location.expectedPollen)} Expected ${location.expectedPollen}, got ${pollenResult?.source || 'N/A'}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✨ Test Complete!');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Exit with error code if there were failures
  if (failureCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
