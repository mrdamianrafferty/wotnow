#!/usr/bin/env npx tsx
/**
 * Investigate orphaned UUID catches to identify what species they were.
 * Looks at catch metadata, common names, and patterns to map them to current species.
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

const ORPHANED_UUIDS = [
  '70083afd-7e2c-4ebf-aa3e-9ce079647c83',
  'f9663a72-68d2-4978-ab35-1d1da19c154d',
  '39d25a22-dea4-41b1-8af0-c55e501b715c',
  'a4d859a8-31f5-4079-8d7b-435090a64ebc',
  '38f43103-d9be-4e48-8186-0c61070eb6a1',
  '7d5e3175-325e-4173-bf73-20cfa8149027',
  '19b7422c-ea89-476a-86c9-d1959dfecd71',
  '33dc4780-c4e1-4346-9b9b-bc475252b8a2',
  'fecf4bb2-f522-4484-b349-6af516ecf70d',
  'fb41c21b-d0c6-4630-9a03-43bcbcddc5bc',
];

async function investigateOrphanedCatches() {
  console.log('🔍 Investigating orphaned catch entries...\n');

  // Get all catch entries with orphaned UUIDs
  const { data: catches, error } = await supabase
    .from('findr_catch_entries')
    .select('*')
    .in('species_id', ORPHANED_UUIDS)
    .order('logged_at', { ascending: false });

  if (error) {
    console.error('Error fetching catches:', error);
    process.exit(1);
  }

  if (!catches || catches.length === 0) {
    console.log('✅ No orphaned catches found');
    return;
  }

  console.log(`Found ${catches.length} orphaned catch entries\n`);

  // Group by UUID
  const groupedByUuid = new Map<string, typeof catches>();
  for (const c of catches) {
    const existing = groupedByUuid.get(c.species_id) || [];
    existing.push(c);
    groupedByUuid.set(c.species_id, existing);
  }

  // Investigate each UUID
  for (const [uuid, catchList] of groupedByUuid.entries()) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`UUID: ${uuid} (${catchList.length} catches)`);
    console.log(`${'='.repeat(80)}\n`);

    // Look for any name data that might help identify the species
    const namesFound = new Set<string>();
    const locationsFound = new Set<string>();
    const datesFound: string[] = [];

    for (const c of catchList) {
      // Check for any species name fields (they might exist even with UUID)
      if (c.species_name) namesFound.add(c.species_name);
      if (c.common_name) namesFound.add(c.common_name);
      if (c.scientific_name) namesFound.add(c.scientific_name);

      // Location data
      if (c.rectangle_code) locationsFound.add(c.rectangle_code);

      // Dates
      if (c.logged_at) datesFound.push(c.logged_at);
    }

    console.log('📋 Metadata Analysis:');
    console.log(`  Names found: ${namesFound.size > 0 ? Array.from(namesFound).join(', ') : 'None'}`);
    console.log(`  Rectangles: ${locationsFound.size > 0 ? Array.from(locationsFound).join(', ') : 'None'}`);
    console.log(`  Date range: ${datesFound.length > 0 ? `${datesFound[datesFound.length - 1]} to ${datesFound[0]}` : 'None'}`);

    // Display sample catch data
    console.log('\n📊 Sample Catch Details:');
    const sample = catchList[0];
    console.log(`  ID: ${sample.id}`);
    console.log(`  Quantity: ${sample.quantity}`);
    console.log(`  Method: ${sample.method || 'N/A'}`);
    console.log(`  Bait: ${sample.bait_used || 'N/A'}`);
    console.log(`  Habitat: ${sample.habitat_type || 'N/A'}`);
    console.log(`  Size: ${sample.size_category || 'N/A'}`);
    console.log(`  Weight: ${sample.weight_kg ? `${sample.weight_kg} kg` : 'N/A'}`);
    console.log(`  Length: ${sample.length_cm ? `${sample.length_cm} cm` : 'N/A'}`);
    console.log(`  User: ${sample.user_id || 'N/A'}`);
    console.log(`  Photo: ${sample.photo_url ? 'Yes' : 'No'}`);
    console.log(`  Notes: ${sample.notes || 'N/A'}`);

    // Try to find matching species by name
    if (namesFound.size > 0) {
      console.log('\n🔎 Searching for matching species...');

      const namesArray = Array.from(namesFound);
      const { data: matchingSpecies } = await supabase
        .from('species')
        .select('species_code, name_en, scientific_name, aliases')
        .or(namesArray.map(name =>
          `name_en.ilike.%${name}%,scientific_name.ilike.%${name}%`
        ).join(','));

      if (matchingSpecies && matchingSpecies.length > 0) {
        console.log(`\n✨ Potential matches found (${matchingSpecies.length}):`);
        for (const sp of matchingSpecies) {
          console.log(`  → ${sp.species_code}: ${sp.name_en} (${sp.scientific_name})`);
          if (sp.aliases && Array.isArray(sp.aliases) && sp.aliases.length > 0) {
            console.log(`    Aliases: ${sp.aliases.join(', ')}`);
          }
        }
      } else {
        console.log('  ❌ No matching species found');
      }
    }

    // Show all catch IDs for reference
    console.log(`\n📝 All Catch IDs (${catchList.length}):`);
    catchList.forEach((c, idx) => {
      console.log(`  ${idx + 1}. ${c.id} - ${c.logged_at}`);
    });
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('\n💡 Next Steps:');
  console.log('1. Review the potential matches above');
  console.log('2. Manually determine the correct species_code for each UUID');
  console.log('3. Run the remap script to update catch entries');
  console.log('4. If no match possible, delete the orphaned entries\n');
}

investigateOrphanedCatches().catch(console.error);
