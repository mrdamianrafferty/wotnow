// Test the actual /api/findr/predictions endpoint
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.fishfindr.eu';

const TEST_RECTANGLES = [
  { code: '31F2', name: 'English Channel' },
  { code: '28E6', name: 'Celtic Sea' },
  { code: '39F4', name: 'North Sea' },
];

async function testPredictionsAPI() {
  console.log('🎣 Testing Findr Predictions API\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  for (const rect of TEST_RECTANGLES) {
    console.log(`\n═══ Testing ${rect.code} (${rect.name}) ═══`);

    try {
      const url = `${BASE_URL}/api/findr/predictions`;
      const requestBody = {
        rectangleCode: rect.code,
        predictionDate: new Date().toISOString().split('T')[0],
        language: 'en',
        bypassCache: true
      };

      console.log(`URL: ${url}`);
      console.log(`Body:`, requestBody);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      console.log(`Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ Error Response: ${errorText.substring(0, 200)}`);
        continue;
      }

      const data = await response.json();

      if (data.error) {
        console.log(`❌ API Error: ${data.error}`);
        continue;
      }

      if (!data.predictions || data.predictions.length === 0) {
        console.log(`⚠️  No predictions returned`);
        console.log(`   Environmental Factors:`, data.environmentalFactors || 'N/A');
        continue;
      }

      console.log(`✅ ${data.predictions.length} species predictions returned`);
      console.log(`   Avg confidence: ${(data.predictions.reduce((sum, p) => sum + p.confidenceScore, 0) / data.predictions.length).toFixed(1)}%`);

      // Show top 3
      console.log('\n   Top 3 species:');
      data.predictions.slice(0, 3).forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.commonName}: ${p.confidenceScore}% (bite: ${p.biteScore || 'N/A'})`);
      });

      // Check environmental factors
      if (data.environmentalFactors) {
        console.log('\n   Environmental Factors:');
        const factors = data.environmentalFactors;
        if (factors.temperature) {
          console.log(`      Temperature: ${factors.temperature.actual}°C (${factors.temperature.impact})`);
        }
        if (factors.salinity) {
          console.log(`      Salinity: ${factors.salinity.actual} ppt`);
        }
        if (factors.depth) {
          console.log(`      Depth: ${factors.depth.actual}m`);
        }
      }

    } catch (error) {
      console.log(`❌ Exception: ${error.message}`);
    }
  }

  console.log('\n\n✅ API test complete\n');
}

testPredictionsAPI();
