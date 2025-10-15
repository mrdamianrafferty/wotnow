#!/usr/bin/env tsx
/**
 * Check species_frequency data for Polish Baltic
 */
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  console.log('🔍 Checking species_frequency data for Polish Baltic...\n');

  // Get rectangle ID for 21D8
  const { data: rect } = await client
    .from('ices_rectangles')
    .select('id, rectangle_code, region')
    .eq('rectangle_code', '21D8')
    .single();

  if (!rect) {
    console.log('❌ Rectangle 21D8 not found!');
    return;
  }

  console.log(`Rectangle: ${rect.rectangle_code} (${rect.region})`);
  console.log(`ID: ${rect.id}\n`);

  // Get species frequency data for this rectangle
  const { data: freqData } = await client
    .from('species_frequency')
    .select(`
      species_id,
      base_frequency,
      confidence_level,
      species:species_id (species_code, name_en, scientific_name)
    `)
    .eq('rectangle_id', rect.id)
    .order('base_frequency', { ascending: false })
    .limit(15);

  if (!freqData || freqData.length === 0) {
    console.log('❌ No species_frequency data for this rectangle!');
    return;
  }

  console.log(`📊 Species for ${rect.rectangle_code} (${rect.region}):\n`);
  freqData.forEach((row: any, i: number) => {
    const species = row.species;
    console.log(`${i + 1}. ${species?.name_en || 'Unknown'} (${species?.species_code || '?'})`);
    console.log(`   Frequency: ${row.base_frequency}, Confidence: ${row.confidence_level}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('🐟 ANALYSIS:');
  console.log('='.repeat(70));

  const expectedBalticSpecies = ['herring', 'sprat', 'cod', 'flounder', 'plaice'];
  const actualCodes = freqData
    .map((row: any) => row.species?.species_code?.toLowerCase())
    .filter(Boolean);

  const hasBalticSpecies = expectedBalticSpecies.some(sp => actualCodes.includes(sp));

  if (hasBalticSpecies) {
    console.log('\n✅ Has some Baltic species (herring, sprat, cod, etc.)');
  } else {
    console.log('\n❌ PROBLEM: No typical Baltic species found!');
    console.log('   This rectangle has wrong species data.');
    console.log('\n   Expected Baltic species:', expectedBalticSpecies.join(', '));
    console.log('   Actual top species:', actualCodes.slice(0, 5).join(', '));
  }
}

check().catch(console.error);
