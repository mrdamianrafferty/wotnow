// test-api-caching.js
// Simple script to test the caching behavior of the weather-with-pollen API

const fetch = require('node-fetch');

async function testApiCaching() {
  const baseUrl = 'http://localhost:3000/api/weather-with-pollen';
  const params = {
    lat: 51.5074,
    lon: -0.1278 // London coordinates
  };
  const url = `${baseUrl}?lat=${params.lat}&lon=${params.lon}`;

  console.log('Testing API caching behavior...');
  console.log('URL:', url);

  // First request (should be a cache miss)
  console.log('\n1. First request (should be a cache miss):');
  const start1 = Date.now();
  const response1 = await fetch(url);
  const data1 = await response1.json();
  const time1 = Date.now() - start1;
  
  console.log(`Response time: ${time1}ms`);
  console.log('From cache:', data1.fromCache || false);
  console.log('Cache age:', data1.cacheAge || 'N/A');
  console.log('Environmental data last updated:', data1.environmentalDataLastUpdated);
  console.log('Is environmental data stale:', data1.isEnvironmentalDataStale);

  // Small delay
  console.log('\nWaiting 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Second request (should be a cache hit)
  console.log('\n2. Second request (should be a cache hit):');
  const start2 = Date.now();
  const response2 = await fetch(url);
  const data2 = await response2.json();
  const time2 = Date.now() - start2;
  
  console.log(`Response time: ${time2}ms`);
  console.log('From cache:', data2.fromCache || false);
  console.log('Cache age:', data2.cacheAge || 'N/A');
  console.log('Environmental data last updated:', data2.environmentalDataLastUpdated);

  // Force refresh
  console.log('\n3. Force refresh request (should bypass cache):');
  const start3 = Date.now();
  const response3 = await fetch(`${url}&forceRefresh=true`);
  const data3 = await response3.json();
  const time3 = Date.now() - start3;
  
  console.log(`Response time: ${time3}ms`);
  console.log('From cache:', data3.fromCache || false);
  console.log('Cache age:', data3.cacheAge || 'N/A');
  console.log('Environmental data last updated:', data3.environmentalDataLastUpdated);

  // Summary
  console.log('\nSummary:');
  console.log(`First request: ${time1}ms`);
  console.log(`Second request: ${time2}ms (${Math.round((time1 - time2) / time1 * 100)}% faster)`);
  console.log(`Force refresh: ${time3}ms`);
}

testApiCaching().catch(err => {
  console.error('Error testing API caching:', err);
});
