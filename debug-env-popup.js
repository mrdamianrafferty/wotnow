// Debug script to test the data flow through index.tsx
// This targets the potential problem areas in day data preparation

// First, add console logs to critical functions
const injectDebugLogs = () => {
  console.log('=====================================');
  console.log('🔍 ENVIRONMENTAL INDICATORS DEBUG TOOL');
  console.log('=====================================');
  
  // Check the state of weatherData loaded in index.tsx
  if (typeof window !== 'undefined') {
    // Try to find the weatherData in localStorage (if it's cached there)
    try {
      const weatherDataStr = localStorage.getItem('weatherData');
      if (weatherDataStr) {
        const weatherData = JSON.parse(weatherDataStr);
        console.log('📊 WEATHER DATA FROM LOCALSTORAGE:');
        console.log('- Has pollenByDate:', !!weatherData?.pollenByDate);
        console.log('- Has airQualityByDate:', !!weatherData?.airQualityByDate);
        
        if (weatherData?.pollenByDate) {
          const dateKeys = Object.keys(weatherData.pollenByDate);
          console.log('- Pollen dates available:', dateKeys);
          if (dateKeys.length > 0) {
            const firstDateKey = dateKeys[0];
            console.log('- Sample pollen data:', weatherData.pollenByDate[firstDateKey]);
          }
        }
      } else {
        console.log('❌ No weatherData found in localStorage');
      }
    } catch (err) {
      console.error('Error reading weatherData from localStorage:', err);
    }
  }
  
  // Monkey patch getPopupDay to add debugging
  if (typeof window.getPopupDay === 'function') {
    const originalGetPopupDay = window.getPopupDay;
    window.getPopupDay = function(activityId, day, timeInfo) {
      console.log('🔄 getPopupDay called for activity:', activityId);
      console.log('- Input day has pollen:', !!day?.pollen);
      console.log('- Input day has airQuality:', !!day?.airQuality);
      
      const result = originalGetPopupDay(activityId, day, timeInfo);
      
      console.log('- Output day has pollen:', !!result?.pollen);
      console.log('- Output day has airQuality:', !!result?.airQuality);
      
      return result;
    };
    console.log('✅ Monkey patched getPopupDay for debugging');
  } else {
    console.log('❌ Could not find getPopupDay function to patch');
  }
  
  // Try to find the current date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  console.log('📅 Current date (for matching with environmental data):', dateStr);
  
  // Check if we're beyond the Open-Meteo max date
  const OPEN_METEO_MAX_DATE = new Date('2025-08-24');
  const isBeyondMaxDate = today > OPEN_METEO_MAX_DATE;
  console.log('- Beyond Open-Meteo max date:', isBeyondMaxDate);
  console.log('- Days beyond max:', isBeyondMaxDate ? Math.floor((today - OPEN_METEO_MAX_DATE) / (1000 * 60 * 60 * 24)) : 0);
  
  console.log('=====================================');
  console.log('🔄 Continue using the app to see more debug logs');
  console.log('=====================================');
};

// Execute the debug injection
injectDebugLogs();
