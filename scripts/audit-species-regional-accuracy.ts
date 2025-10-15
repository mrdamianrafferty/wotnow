#!/usr/bin/env tsx
/**
 * Audit species data for multiple rectangles
 * Check if species match expected regional fauna
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Expected species by region type
const REGIONAL_SPECIES = {
  baltic: ['herring', 'sprat', 'cod', 'flounder', 'plaice'],
  atlantic_iberian: ['hake', 'bream', 'seabass', 'anchovy', 'sardine'],
  north_sea: ['cod', 'haddock', 'whiting', 'plaice', 'sole'],
  mediterranean: ['seabream', 'seabass', 'swordfish', 'bluefin', 'amberjack'],
};

async function auditRectangle(code: string) {
  const { data, error } = await client.rpc('get_fishing_predictions', {
    rectangle_code_input: code,
    prediction_date_input: '2025-10-11',
    user_language: 'en'
  });

  if (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }

  if (!data || data.length === 0) {
    console.log(`   ⚠️  No predictions returned`);
    return null;
  }

  const speciesList = data.map((p: any) => p.species_common_name || p.common_name);
  const speciesCodes = data.map((p: any) => p.species_code?.toLowerCase()).filter(Boolean);

  return { speciesList, speciesCodes, count: data.length };
}

async function audit() {
  console.log('🔍 Species Data Audit - Regional Accuracy Check\n');
  console.log('='.repeat(70));

  // Test rectangles from different regions
  const testRectangles = [
    { code: '21D8', expected: 'Galician (Atlantic Iberian)', region: 'atlantic_iberian' },
    { code: '20C5', expected: 'Spanish North Atlantic', region: 'atlantic_iberian' },
    { code: '22L5', expected: 'Polish Baltic', region: 'baltic' },
    { code: '38W5', expected: 'North Sea', region: 'north_sea' },
    { code: '40P1', expected: 'Unknown - Test', region: null },
  ];

  for (const rect of testRectangles) {
    console.log(`\n📍 Rectangle ${rect.code} - ${rect.expected}`);
    console.log('-'.repeat(70));

    const result = await auditRectangle(rect.code);

    if (!result) continue;

    console.log(`   Returned ${result.count} species:`);
    console.log(`   Top 5: ${result.speciesList.slice(0, 5).join(', ')}`);

    if (rect.region) {
      const expectedSpecies = REGIONAL_SPECIES[rect.region as keyof typeof REGIONAL_SPECIES];
      const matches = result.speciesCodes.filter(code => 
        expectedSpecies.some(expected => code.includes(expected))
      );

      const accuracy = (matches.length / result.count) * 100;

      if (accuracy > 50) {
        console.log(`   ✅ Regional match: ${accuracy.toFixed(0)}% (${matches.length}/${result.count} species)`);
      } else if (accuracy > 0) {
        console.log(`   🟡 Partial match: ${accuracy.toFixed(0)}% (${matches.length}/${result.count} species)`);
      } else {
        console.log(`   ❌ No regional match: 0% - Wrong species for this region!`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(70));
  console.log('\n✅ = Species match expected region');
  console.log('🟡 = Some species match, data may be mixed');
  console.log('❌ = No species match, wrong data for region');
  console.log('\nSee SPECIES_DATA_ACCURACY_REPORT.md for full analysis.');
}

audit().catch(console.error);
