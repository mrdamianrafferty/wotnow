#!/usr/bin/env tsx
/**
 * Test actual species predictions for US waters
 *
 * Makes real API calls to /api/findr/predictions with grid cell codes
 */

import { findNearestGridCellId, getWaterRegion } from '../lib/findr/gridCellLookup';

const API_BASE = 'https://wotnow-10r20okd8-damians-projects-06bbadaa.vercel.app';

// Test locations
const testLocations = [
  { name: 'New York Harbor', lat: 40.7128, lon: -74.0060, water: 'Atlantic' },
  { name: 'Miami Beach', lat: 25.7617, lon: -80.1918, water: 'Atlantic/Gulf' },
  { name: 'Los Angeles Coast', lat: 33.7401, lon: -118.2651, water: 'Pacific' },
  { name: 'San Francisco Bay', lat: 37.7749, lon: -122.4194, water: 'Pacific' },
  { name: 'New Orleans Coast', lat: 29.9511, lon: -90.0715, water: 'Gulf' },
  { name: 'San Diego', lat: 32.7157, lon: -117.1611, water: 'Pacific' },
];

interface SpeciesPrediction {
  species_code: string;
  name_en: string;
  confidence_score: number;
  guild?: string;
  rationale?: string;
}

async function testPredictions(location: typeof testLocations[0]) {
  const cellId = findNearestGridCellId(location.lat, location.lon);
  const region = getWaterRegion(location.lat, location.lon);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📍 ${location.name} (${location.water})`);
  console.log(`   Grid Cell: ${cellId}`);
  console.log(`   Region: ${region}`);

  // Try to fetch predictions using the grid cell code (POST request)
  const url = `${API_BASE}/api/findr/predictions`;

  console.log(`   📡 POST /api/findr/predictions { rectangleCode: "${cellId}" }...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rectangleCode: cellId,
        latitude: location.lat,
        longitude: location.lon,
        language: 'en',
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      console.log(`   ⚠️  API Error (${response.status}): ${data.error || 'Unknown error'}`);
      console.log(`      Message: ${data.message || data.details || 'No details'}`);
      return;
    }

    if (data.predictions && Array.isArray(data.predictions)) {
      const predictions = data.predictions as SpeciesPrediction[];

      if (predictions.length === 0) {
        console.log(`   ℹ️  No species predictions available`);
        return;
      }

      console.log(`   🐟 Found ${predictions.length} species predictions:\n`);

      // Show top 10 species
      predictions.slice(0, 10).forEach((pred, idx) => {
        const score = pred.confidence_score?.toFixed(0) || 'N/A';
        const guild = pred.guild ? ` [${pred.guild}]` : '';
        console.log(`      ${idx + 1}. ${pred.name_en}${guild}`);
        console.log(`         Confidence: ${score}% | Code: ${pred.species_code}`);
        if (pred.rationale && idx < 3) {
          const shortRationale = pred.rationale.substring(0, 80);
          console.log(`         ${shortRationale}${pred.rationale.length > 80 ? '...' : ''}`);
        }
      });

      if (predictions.length > 10) {
        console.log(`\n      ... and ${predictions.length - 10} more species`);
      }

      // Summary stats
      const avgConfidence = predictions.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / predictions.length;
      const guilds = [...new Set(predictions.map(p => p.guild).filter(Boolean))];

      console.log(`\n      📊 Stats:`);
      console.log(`         Average confidence: ${avgConfidence.toFixed(1)}%`);
      console.log(`         Guilds: ${guilds.join(', ')}`);
    } else {
      console.log(`   ⚠️  Unexpected response format:`, data);
    }
  } catch (error) {
    console.log(`   ❌ Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function main() {
  console.log('🧪 Testing Species Predictions for US Waters\n');
  console.log('Making real API calls to /api/findr/predictions with grid cells...\n');

  for (const location of testLocations) {
    await testPredictions(location);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\n✅ Test Complete!\n');
}

main().catch(console.error);
