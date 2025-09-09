const OPENWEATHER_BASE_3 = 'https://api.openweathermap.org/data/3.0/onecall';
const OPENWEATHER_BASE_2_5 = 'https://api.openweathermap.org/data/2.5/forecast';

async function testOneCall3() {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
  
  if (!apiKey) {
    console.error('❌ API key not found');
    return;
  }
  
  const lat = '37.7749'; // San Francisco
  const lon = '-122.4194';
  
  console.log('🔑 API Key available:', apiKey ? `${apiKey.substring(0, 8)}...` : 'NO');
  
  // Test One Call 3.0
  const params3 = new URLSearchParams({
    lat,
    lon,
    appid: apiKey,
    units: 'metric',
    exclude: '',
  });
  
  const url3 = `${OPENWEATHER_BASE_3}?${params3.toString()}`;
  console.log('🌡️ Testing One Call 3.0:', url3.replace(apiKey, 'API_KEY'));
  
  try {
    const response3 = await fetch(url3);
    const data3 = await response3.json();
    
    console.log('📊 One Call 3.0 Response:');
    console.log('  Status:', response3.status);
    console.log('  OK:', response3.ok);
    
    if (!response3.ok) {
      console.log('  Error data:', data3);
    } else {
      console.log('  Has current:', !!data3.current);
      console.log('  Has hourly:', !!data3.hourly);
      console.log('  Has daily:', !!data3.daily);
      console.log('  Hourly count:', data3.hourly?.length || 0);
      console.log('  Daily count:', data3.daily?.length || 0);
    }
  } catch (error) {
    console.error('❌ One Call 3.0 fetch error:', error);
  }
  
  // Test 2.5 as fallback
  const url25 = `${OPENWEATHER_BASE_2_5}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  console.log('\n🌤️ Testing 2.5 Forecast:', url25.replace(apiKey, 'API_KEY'));
  
  try {
    const response25 = await fetch(url25);
    const data25 = await response25.json();
    
    console.log('📊 2.5 Forecast Response:');
    console.log('  Status:', response25.status);
    console.log('  OK:', response25.ok);
    
    if (!response25.ok) {
      console.log('  Error data:', data25);
    } else {
      console.log('  Has list:', !!data25.list);
      console.log('  List count:', data25.list?.length || 0);
    }
  } catch (error) {
    console.error('❌ 2.5 Forecast fetch error:', error);
  }
}

testOneCall3().catch(console.error);
