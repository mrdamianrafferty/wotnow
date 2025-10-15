/**
 * PHASE 9.5 - STEP 3: POPULATE SPECIES WEIGHT PROFILES
 * 
 * This script assigns all 62 species to their appropriate guild weight profiles:
 * - pelagic: 9 species (Mackerel, Garfish, etc.)
 * - surf_estuary: 5 species (Bass, Mullet, Flounder, etc.)
 * - reef_kelp: 18 species (Wrasse, Pollock, Gurnard, etc.)
 * - benthic: 23 species (Flatfish, Rays, etc.)
 * - cephalopod: 3 species (Squid, Cuttlefish, Octopus)
 * - default_coastal: 4 species (unclassified)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';

// Load environment
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load guild classifications
const guilds = JSON.parse(fs.readFileSync('SPECIES_GUILD_CLASSIFICATIONS.json', 'utf8'));

interface GuildUpdate {
  species_code: string;
  weight_profile: string;
  name: string;
}

async function populateWeightProfiles() {
  console.log('🚀 Phase 9.5: Populating Species Weight Profiles\n');
  console.log('='.repeat(80));

  // Build update list
  const updates: GuildUpdate[] = [];

  // Process each guild
  for (const [guildName, species] of Object.entries(guilds)) {
    if (guildName.startsWith('_') || guildName === 'NOTES' || guildName === 'SUMMARY') {
      continue; // Skip metadata
    }

    const profile = guildName.toLowerCase();
    
    for (const sp of species as any[]) {
      updates.push({
        species_code: sp.code,
        weight_profile: profile,
        name: sp.name
      });
    }
  }

  console.log(`📊 Total species to update: ${updates.length}\n`);

  // Group by guild for reporting
  const byGuild = updates.reduce((acc, u) => {
    acc[u.weight_profile] = (acc[u.weight_profile] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('Guild Distribution:');
  for (const [guild, count] of Object.entries(byGuild)) {
    console.log(`  ${guild.padEnd(20, ' ')}: ${count} species`);
  }
  console.log('');

  // Update database
  console.log('🔄 Updating species weight profiles...\n');

  let successCount = 0;
  let errorCount = 0;
  const notFound: string[] = [];

  for (const update of updates) {
    try {
      const { data, error } = await supabase
        .from('species')
        .update({ weight_profile: update.weight_profile })
        .eq('species_code', update.species_code)
        .select('species_code, name_en, weight_profile');

      if (error) {
        console.error(`❌ Error updating ${update.species_code}:`, error.message);
        errorCount++;
      } else if (!data || data.length === 0) {
        console.warn(`⚠️  Species not found: ${update.species_code} (${update.name})`);
        notFound.push(update.species_code);
      } else {
        console.log(`✅ ${update.species_code.padEnd(6, ' ')} → ${update.weight_profile.padEnd(16, ' ')} (${data[0].name_en})`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception updating ${update.species_code}:`, err);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Update Summary:');
  console.log(`  ✅ Successfully updated: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⚠️  Not found in database: ${notFound.length}`);

  if (notFound.length > 0) {
    console.log(`\n  Not found species codes: ${notFound.join(', ')}`);
  }

  // Validation queries
  console.log('\n' + '='.repeat(80));
  console.log('🧪 Running Validation Queries...\n');

  // Query 1: Count by guild
  const { data: guildCounts } = await supabase
    .from('species')
    .select('weight_profile')
    .not('weight_profile', 'is', null);

  if (guildCounts) {
    const counts = guildCounts.reduce((acc, row) => {
      acc[row.weight_profile] = (acc[row.weight_profile] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Database Guild Distribution:');
    for (const [guild, count] of Object.entries(counts)) {
      console.log(`  ${guild.padEnd(20, ' ')}: ${count} species`);
    }
  }

  // Query 2: Check specific species
  console.log('\n' + '='.repeat(80));
  console.log('🔍 Spot Check Key Species:\n');

  const spotCheck = ['bss', 'wrb', 'mac', 'ple', 'sqc'];
  for (const code of spotCheck) {
    const { data } = await supabase
      .from('species')
      .select('species_code, name_en, weight_profile')
      .eq('species_code', code)
      .single();

    if (data) {
      console.log(`  ${data.species_code.padEnd(6, ' ')} - ${data.name_en.padEnd(30, ' ')} → ${data.weight_profile}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✨ Phase 9.5 Step 3 Complete!');
  
  if (successCount === updates.length) {
    console.log('🎉 Perfect! All species weight profiles populated successfully.');
  } else {
    console.log(`⚠️  ${updates.length - successCount} species need attention.`);
  }
  
  console.log('\nNext: Test guild weighting with comparison queries (Step 4)');
}

// Run
populateWeightProfiles().catch(console.error);
