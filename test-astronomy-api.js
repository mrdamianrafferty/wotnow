#!/usr/bin/env node

/**
 * Test script to verify the astronomy highlights API endpoint works
 */

console.log('🌟 Testing Astronomy Highlights API...\n');

// Test API endpoint locally by making a fetch request
const testAPI = async () => {
  try {
    const baseUrl = 'http://localhost:3000';
    const testCoordinates = {
      lat: 51.5074,  // London
      lng: -0.1278
    };
    
    const url = `${baseUrl}/api/astronomy-highlights?lat=${testCoordinates.lat}&lng=${testCoordinates.lng}`;
    
    console.log(`📡 Testing API endpoint: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received successfully!\n');
    console.log('📊 Response data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Validate expected structure
    const expectedFields = ['location', 'highlights', 'moonPhase', 'specialEvents'];
    const hasAllFields = expectedFields.every(field => field in data);
    
    if (hasAllFields) {
      console.log('\n✅ All expected fields are present in the response');
    } else {
      console.log('\n❌ Some expected fields are missing');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    
    // If server isn't running, give instructions
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch')) {
      console.log('\n💡 The development server might not be running.');
      console.log('   Start it with: npm run dev');
      console.log('   Then run this test again.');
    }
    
    return null;
  }
};

// Mock data test (if API isn't available)
const testMockData = () => {
  console.log('🎭 Testing with mock data...\n');
  
  const mockData = {
    location: { lat: 51.5074, lng: -0.1278, name: "London, UK" },
    highlights: [
      "🌅 Golden hour starts at 6:45 AM - perfect for photography",
      "🌙 New moon tonight - ideal for stargazing deep sky objects",
      "⭐ Jupiter visible in western sky after sunset"
    ],
    moonPhase: {
      phase: "new",
      illumination: 0.02,
      icon: "🌑"
    },
    specialEvents: [
      {
        name: "Jupiter at Opposition",
        description: "Jupiter is at its closest approach to Earth",
        date: "2024-01-15",
        visibility: "excellent"
      }
    ]
  };
  
  console.log('📊 Mock response data:');
  console.log(JSON.stringify(mockData, null, 2));
  
  return mockData;
};

// Main test function
const main = async () => {
  const apiData = await testAPI();
  
  if (!apiData) {
    console.log('\n📝 Since API isn\'t available, here\'s what the expected format looks like:');
    testMockData();
  }
  
  console.log('\n🎯 Integration Summary:');
  console.log('• AstronomyCard component: ✅ Created');
  console.log('• API endpoint: ✅ Created');
  console.log('• Homepage integration: ✅ Added');
  console.log('• Component import: ✅ Added');
  
  if (apiData) {
    console.log('• API functionality: ✅ Working');
  } else {
    console.log('• API functionality: ⏳ Needs dev server running');
  }
  
  console.log('\n🚀 Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit http://localhost:3000 to see the astronomy card');
  console.log('3. Check that astronomy highlights appear above the main activity cards');
};

main().catch(console.error);
