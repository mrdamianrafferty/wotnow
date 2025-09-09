// Debug script to format pollen data for display in the UI
const fetch = require('node-fetch');

// Mock implementation of pollen utility functions for testing
const PollenLevel = {
  NONE: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  VERY_HIGH: 4,
  EXTREME: 5
};

function getPollenLevelDescription(level) {
  switch (level) {
    case PollenLevel.NONE: return 'None';
    case PollenLevel.LOW: return 'Low';
    case PollenLevel.MODERATE: return 'Moderate';
    case PollenLevel.HIGH: return 'High';
    case PollenLevel.VERY_HIGH: return 'Very High';
    case PollenLevel.EXTREME: return 'Extreme';
    default: return 'Unknown';
  }
}

function classifyPollenLevel(value) {
  if (!value || value < 0) return PollenLevel.NONE;
  if (value <= 0.5) return PollenLevel.LOW;
  if (value <= 2) return PollenLevel.MODERATE;
  if (value <= 4) return PollenLevel.HIGH;
  if (value <= 10) return PollenLevel.VERY_HIGH;
  return PollenLevel.EXTREME; 
}

// This is the function that should be added to the application
function formatPollenForDisplay(pollen) {
  if (!pollen) return {};
  
  return {
    grass_pollen: pollen.grass != null ? getPollenLevelDescription(classifyPollenLevel(pollen.grass)) : undefined,
    tree_pollen: pollen.tree != null ? getPollenLevelDescription(classifyPollenLevel(pollen.tree)) : undefined,
    weed_pollen: pollen.weed != null ? getPollenLevelDescription(classifyPollenLevel(pollen.weed)) : undefined,
    olive_pollen: pollen.olive != null ? getPollenLevelDescription(classifyPollenLevel(pollen.olive)) : undefined,
  };
}

async function fetchAndFormatPollenData() {
  try {
    console.log(`Fetching data from: http://localhost:3000/api/unified-weather?lat=51.5074&lon=-0.1278`);
    console.log('Please make sure Next.js dev server is running!\n');

    const response = await fetch(`http://localhost:3000/api/unified-weather?lat=51.5074&lon=-0.1278`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('=== POLLEN DATA CHECK ===');
    if (data && data.pollenByDate) {
      console.log('✅ Pollen data is present in the API response');
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Get pollen data for today
      const todaysPollen = data.pollenByDate[today];
      
      if (todaysPollen) {
        console.log('\n=== ORIGINAL POLLEN DATA (NUMERIC) ===');
        console.log(JSON.stringify(todaysPollen, null, 2));
        
        // Format pollen data for display in UI
        const formattedPollen = formatPollenForDisplay(todaysPollen);
        
        console.log('\n=== FORMATTED POLLEN DATA (STRINGS) ===');
        console.log(JSON.stringify(formattedPollen, null, 2));
        
        console.log('\n=== IMPLEMENTATION GUIDE ===');
        console.log('To fix the issue, you need to:');
        console.log('1. Add a function like formatPollenForDisplay to transform numeric values to strings');
        console.log('2. Modify the pollenToday declaration in pages/my-new-weather.tsx to:');
        console.log('   const rawPollenToday = useMemo(() => pollenFromWWP ?? today?.pollen, [pollenFromWWP, today?.pollen]);');
        console.log('   const pollenToday = useMemo(() => formatPollenForDisplay(rawPollenToday), [rawPollenToday]);');
        console.log('3. For pollenIdx calculation, use the rawPollenToday object which contains numeric values');
      } else {
        console.log('❌ No pollen data found for today');
      }
    } else {
      console.log('❌ No pollen data found in the API response');
    }

  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchAndFormatPollenData();
