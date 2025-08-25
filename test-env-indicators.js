// test-env-indicators.js
// A simple script to test environmental indicators data flow
// Uses fetch to call the Next.js API routes directly

// IIFE to allow async/await
(async () => {
  try {
    console.log('🔍 Testing Environmental Indicators Data Flow');
    console.log('-------------------------------------------');
    
    // Test location (Barcelona, Spain)
    const lat = 41.3874;
    const lon = 2.1686;
    
    console.log(`Testing location: ${lat}, ${lon} (Barcelona)`);
    console.log('\n1. Fetching environmental data from API...');
    
    // Call the weather-with-pollen API endpoint
    const url = `http://localhost:3000/api/weather-with-pollen?lat=${lat}&lon=${lon}`;
    console.log(`Calling API: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ Successfully fetched environmental data');
    
    // Check if environmental data exists
    if (data.pollen) {
      console.log('\n2. Pollen data received:', data.pollen);
    } else {
      console.log('❌ No pollen data received');
    }
    
    if (data.airQuality) {
      console.log('\n3. Air Quality data received:', data.airQuality);
    } else {
      console.log('❌ No air quality data received');
    }
    
    if (data.uvi) {
      console.log('\n4. UV Index data received:', data.uvi);
    } else {
      console.log('❌ No UVI data received');
    }
    
    // Check data freshness
    if (data.lastUpdated) {
      console.log('\n5. Data freshness:');
      console.log(`Last updated: ${new Date(data.lastUpdated).toLocaleString()}`);
      console.log(`Is stale data: ${data.isStale ? 'Yes' : 'No'}`);
    }
    
    console.log('\n🎉 Environmental indicators smoke test completed');
  } catch (error) {
    console.error('❌ Error testing environmental indicators:', error);
  }
})();
