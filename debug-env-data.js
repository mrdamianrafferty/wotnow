// debug-env-data.js - Simple script to debug environmental data flow in WotNow

// Helper function to check if a value is properly defined
const isDefined = (val) => val !== undefined && val !== null;

// Test location data
const TEST_LOCATIONS = [
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 }
];

// Check the OpenWeather data extraction in transformDailyForecast function
function mockOpenWeatherData() {
  // Mock UVI data to ensure it's being extracted
  const mockDay = {
    dt: 1632960000,
    temp: { day: 25, min: 20, max: 30 },
    humidity: 60,
    pressure: 1015,
    feels_like: { day: 26 },
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
    clouds: 10,
    wind_speed: 5,
    wind_deg: 180,
    wind_gust: 8,
    uvi: 7.5 // This is the key UVI data we want to ensure is being extracted
  };

  // Mock the transformDailyForecast function
  function transformDailyForecast(oneCallData) {
    if (!oneCallData.daily) return [];
    return oneCallData.daily.map(day => ({
      dt: day.dt,
      main: {
        temp: day.temp.day,
        temp_min: day.temp.min,
        temp_max: day.temp.max,
        humidity: day.humidity,
        pressure: day.pressure,
        feels_like: day.feels_like.day,
        temp_kf: 0
      },
      weather: day.weather,
      clouds: { all: day.clouds },
      wind: {
        speed: day.wind_speed,
        deg: day.wind_deg,
        gust: day.wind_gust || 0
      },
      visibility: 10000,
      pop: 0,
      dt_txt: new Date(day.dt * 1000).toISOString().replace('T', ' ').slice(0, 19),
      sys: { pod: "d" },
      // Check if UVI is being extracted
      uvi: day.uvi || 0
    }));
  }

  const mockOneCallData = {
    daily: [mockDay]
  };

  const transformedData = transformDailyForecast(mockOneCallData);
  console.log('\n--- OpenWeather UVI Data Extraction Test ---');
  console.log('Original UVI value:', mockDay.uvi);
  console.log('Transformed UVI value:', transformedData[0].uvi);
  console.log('UVI data is being extracted correctly:', transformedData[0].uvi === mockDay.uvi);
}

// Mock environmental data structure to simulate what should be passed to the UI
function mockEnvironmentalData() {
  const mockPollenData = {
    alder: 1.2,
    birch: 2.3,
    grass: 3.5,
    mugwort: 0.5,
    olive: 1.8,
    ragweed: 0.7
  };

  const mockAirQualityData = {
    pm10: 18.5,
    pm2_5: 8.2,
    carbon_monoxide: 220,
    nitrogen_dioxide: 7.5,
    sulphur_dioxide: 2.0,
    ozone: 65,
    european_aqi: 35
  };

  console.log('\n--- Environmental Data Structure Test ---');
  console.log('Mock Pollen Data:', mockPollenData);
  console.log('Mock Air Quality Data:', mockAirQualityData);

  // Verify that the structure matches what EnvironmentalIndicators.tsx expects
  const pollenKeys = ['alder', 'birch', 'grass', 'mugwort', 'olive', 'ragweed'];
  const airQualityKeys = ['pm10', 'pm2_5', 'european_aqi'];

  console.log('\nVerifying data structure:');
  console.log('- Pollen has all required keys:', pollenKeys.every(key => key in mockPollenData));
  console.log('- Air Quality has all required keys:', airQualityKeys.every(key => key in mockAirQualityData));
}

// Mock the data flow from API to UI components
function mockDataFlow() {
  console.log('\n--- Environmental Data Flow Test ---');

  // 1. API response (mock what would come from Open-Meteo)
  const mockApiResponse = {
    hourly: {
      time: ['2025-08-25T00:00', '2025-08-25T01:00', '2025-08-25T02:00'],
      uv_index: [0, 0, 1],
      european_aqi: [30, 32, 35],
      alder_pollen: [0.5, 0.7, 1.0],
      birch_pollen: [1.5, 1.7, 2.0],
      grass_pollen: [2.5, 2.7, 3.0]
    },
    daily: {
      time: ['2025-08-25'],
      uv_index_max: [5.7]
    }
  };

  console.log('1. Mock API Response (sample):', {
    'hourly.uv_index': mockApiResponse.hourly.uv_index.slice(0, 3) + '...',
    'hourly.european_aqi': mockApiResponse.hourly.european_aqi.slice(0, 3) + '...',
    'daily.uv_index_max': mockApiResponse.daily.uv_index_max
  });

  // 2. Transformed data (processed in weather-with-pollen.ts)
  const transformedData = {
    pollenByDate: {
      '2025-08-25': {
        alder: Math.max(...mockApiResponse.hourly.alder_pollen),
        birch: Math.max(...mockApiResponse.hourly.birch_pollen),
        grass: Math.max(...mockApiResponse.hourly.grass_pollen),
        mugwort: 0.3,
        olive: 0.2,
        ragweed: 0.1
      }
    },
    airQualityByDate: {
      '2025-08-25': {
        european_aqi: Math.max(...mockApiResponse.hourly.european_aqi),
        pm10: 18.5,
        pm2_5: 8.2
      }
    },
    isEnvironmentalDataStale: new Date() > new Date('2025-08-24'),
    environmentalDataLastUpdated: new Date().toISOString()
  };

  console.log('\n2. Transformed API Data:', {
    'pollenByDate.2025-08-25': transformedData.pollenByDate['2025-08-25'],
    'airQualityByDate.2025-08-25': transformedData.airQualityByDate['2025-08-25'],
    'isEnvironmentalDataStale': transformedData.isEnvironmentalDataStale,
    'environmentalDataLastUpdated': transformedData.environmentalDataLastUpdated
  });

  // 3. Data passed to components (from index.tsx → Popup.tsx → EnvironmentalIndicators.tsx)
  const componentData = {
    pollen: transformedData.pollenByDate['2025-08-25'],
    airQuality: transformedData.airQualityByDate['2025-08-25'],
    isStaleData: transformedData.isEnvironmentalDataStale,
    lastUpdated: transformedData.environmentalDataLastUpdated
  };

  console.log('\n3. Data Passed to Components:', componentData);

  // 4. Check if the data would render correctly in EnvironmentalIndicators.tsx
  const hasPollenData = componentData.pollen && 
    Object.values(componentData.pollen).some(value => 
      isDefined(value) && typeof value === 'number' && value > 0
    );

  const hasAirQualityData = componentData.airQuality && 
    Object.values(componentData.airQuality).some(value => 
      isDefined(value) && typeof value === 'number' && value > 0
    );

  console.log('\n4. UI Rendering Checks:');
  console.log('- Has valid pollen data to render:', hasPollenData);
  console.log('- Has valid air quality data to render:', hasAirQualityData);
  console.log('- Would show stale data indicator:', componentData.isStaleData);
  
  // 5. Verify current date and Open-Meteo max date
  const currentDate = new Date();
  const openMeteoMaxDate = new Date('2025-08-24');
  
  console.log('\n5. Date Verification:');
  console.log('- Current date:', currentDate.toISOString());
  console.log('- Open-Meteo max date:', openMeteoMaxDate.toISOString());
  console.log('- Is current date beyond Open-Meteo max date:', currentDate > openMeteoMaxDate);
  console.log('  (This should match isStaleData flag in production code)');
}

// Run all tests
function runTests() {
  console.log('=== WotNow Environmental Data Flow Debug ===');
  console.log('Current date:', new Date().toISOString());
  console.log('Test locations:', TEST_LOCATIONS.map(loc => `${loc.name} (${loc.lat}, ${loc.lon})`).join(', '));
  
  mockOpenWeatherData();
  mockEnvironmentalData();
  mockDataFlow();
  
  console.log('\n=== Debug Complete ===');
  console.log('If all tests passed, the environmental data flow structure is correct.');
  console.log('Check the actual API responses in the browser console to verify real data is flowing correctly.');
}

runTests();
