#!/usr/bin/env npx tsx
/**
 * Remap orphaned UUID catches to their correct species codes.
 * Based on investigation results matching scientific names.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Mapping from orphaned UUID to correct species_code
// Based on investigation matching scientific names
const UUID_TO_SPECIES_CODE_MAP: Record<string, string> = {
  '33dc4780-c4e1-4346-9b9b-bc475252b8a2': 'WRB',  // Labrus bergylta → Ballan Wrasse
  'fecf4bb2-f522-4484-b349-6af516ecf70d': 'DEX',  // Dentex dentex → Dentex
  'a4d859a8-31f5-4079-8d7b-435090a64ebc': 'BSS',  // Dicentrarchus labrax → Sea Bass
  '70083afd-7e2c-4ebf-aa3e-9ce079647c83': 'MAC',  // Scomber scombrus → Mackerel
  'fb41c21b-d0c6-4630-9a03-43bcbcddc5bc': 'HER',  // Clupea harengus → Atlantic Herring
  '39d25a22-dea4-41b1-8af0-c55e501b715c': 'COD',  // Gadus morhua → Atlantic Cod
  'f9663a72-68d2-4978-ab35-1d1da19c154d': 'POL',  // Pollachius pollachius → Pollack
  '19b7422c-ea89-476a-86c9-d1959dfecd71': 'BBR',  // Helicolenus dactylopterus → Blackbelly Rosefish
  '7d5e3175-325e-4173-bf73-20cfa8149027': 'PLE',  // Pleuronectes platessa → Plaice
  '38f43103-d9be-4e48-8186-0c61070eb6a1': 'SBA',  // Sparus aurata → Sea Bream
};

async function remapOrphanedCatches() {
  console.log('🔄 Remapping orphaned catch entries to correct species codes...\n');

  let totalUpdated = 0;
  let totalErrors = 0;

  for (const [uuid, speciesCode] of Object.entries(UUID_TO_SPECIES_CODE_MAP)) {
    // Get the species details for logging
    const { data: species } = await supabase
      .from('species')
      .select('species_code, name_en, scientific_name')
      .eq('species_code', speciesCode)
      .single();

    if (!species) {
      console.log(`❌ Species code ${speciesCode} not found - skipping UUID ${uuid}`);
      totalErrors++;
      continue;
    }

    console.log(`\nUpdating UUID ${uuid} → ${speciesCode} (${species.name_en})`);

    // Count how many catches will be updated
    const { count } = await supabase
      .from('findr_catch_entries')
      .select('*', { count: 'exact', head: true })
      .eq('species_id', uuid);

    console.log(`  Found ${count} catches to update`);

    // Update the catches
    const { data, error } = await supabase
      .from('findr_catch_entries')
      .update({ species_id: speciesCode })
      .eq('species_id', uuid)
      .select('id');

    if (error) {
      console.error(`  ❌ Error updating catches:`, error);
      totalErrors++;
    } else {
      const updated = data?.length || 0;
      console.log(`  ✅ Successfully updated ${updated} catches`);
      totalUpdated += updated;
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\n📊 Summary:');
  console.log(`  Total catches updated: ${totalUpdated}`);
  console.log(`  Errors encountered: ${totalErrors}`);

  if (totalErrors === 0) {
    console.log(`\n✨ All orphaned catches have been successfully remapped!`);
  } else {
    console.log(`\n⚠️  Some errors occurred during remapping. Please review above.`);
  }

  // Verify no orphaned UUIDs remain
  console.log('\n🔍 Verifying cleanup...');
  const orphanedUuids = Object.keys(UUID_TO_SPECIES_CODE_MAP);

  const { count: remainingCount } = await supabase
    .from('findr_catch_entries')
    .select('*', { count: 'exact', head: true })
    .in('species_id', orphanedUuids);

  if (remainingCount === 0) {
    console.log('  ✅ No orphaned UUID catches remain');
  } else {
    console.log(`  ⚠️  ${remainingCount} orphaned catches still exist`);
  }

  console.log('');
}

remapOrphanedCatches().catch(console.error);
