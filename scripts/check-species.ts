#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get all species data
  const { data: allSpecies, error } = await supabase
    .from('species')
    .select('species_code, name_en, catches_2024')
    .order('species_code');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!allSpecies) {
    console.log('No species found');
    return;
  }

  console.log(`Total species: ${allSpecies.length}`);

  const withData = allSpecies.filter(sp => sp.catches_2024 !== null);
  const needData = allSpecies.filter(sp => sp.catches_2024 === null);

  console.log(`\n✅ Species with preference data (${withData.length}):`);
  withData.forEach(sp => console.log(`  ${sp.species_code} - ${sp.name_en}`));

  console.log(`\n⚠️  Species needing preference data (${needData.length}):`);
  needData.forEach(sp => console.log(`  ${sp.species_code} - ${sp.name_en}`));
}

check().catch(console.error);
