// Quick test to verify our tide service integration in unified weather API
import { fetchTideData } from './lib/findr/tideService.ts';

async function testTideIntegration() {
  console.log('Testing tide service integration...');
  
  try {
    const lat = 43.8;
    const lon = -5.5;
    console.log(`Testing coordinates: ${lat}, ${lon}`);
    
    const result = await fetchTideData(lat, lon);
    console.log('✅ Tide service working!');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.extremes && result.extremes.length > 0) {
      console.log('🌊 Tides found:', result.extremes.length);
      console.log('Source:', result.source);
      console.log('Cache info:', result.cacheInfo);
    }
    
  } catch (error) {
    console.error('❌ Error testing tide service:', error);
  }
}

testTideIntegration();