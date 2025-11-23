#!/usr/bin/env tsx
/**
 * Test predictions API with a known ICES rectangle to verify it works
 */

const API_BASE = 'https://wotnow-9bo3pmvaq-damians-projects-06bbadaa.vercel.app';

async function testICES() {
  console.log('🧪 Testing Predictions API with ICES Rectangle\n');
  console.log('Testing rectangle: 31F2 (North Sea)\n');

  const url = `${API_BASE}/api/findr/predictions`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rectangleCode: '31F2',
        language: 'en',
      }),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (!response.ok) {
      console.log(`\n❌ Error:`, data);
      return;
    }

    if (data.predictions && Array.isArray(data.predictions)) {
      console.log(`\n✅ Success! Found ${data.predictions.length} predictions\n`);
      console.log('Top 10 species:');
      data.predictions.slice(0, 10).forEach((pred: any, idx: number) => {
        console.log(`  ${idx + 1}. ${pred.name_en} (${pred.confidence_score?.toFixed(0)}%)`);
      });
    } else {
      console.log('\n⚠️  Unexpected response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log(`\n❌ Fetch error: ${error instanceof Error ? error.message : error}`);
  }
}

testICES();
