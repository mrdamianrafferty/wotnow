#!/usr/bin/env tsx
/**
 * Run the species code case normalization migration
 * This script executes the SQL migration to convert all species codes to UPPERCASE
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting Species Code Case Normalization Migration\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Analyze current state
    console.log('\n📊 Step 1: Analyzing current state...\n');
    
    const { data: totalCount, error: totalError } = await supabase
      .from('species')
      .select('species_code', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    const { data: lowercaseSpecies, error: lowercaseError } = await supabase
      .from('species')
      .select('species_code, name_en')
      .neq('species_code', supabase.rpc('upper', { species_code: 'species_code' }))
      .order('species_code');
    
    // Manual check for lowercase since the above won't work
    const { data: allSpecies, error: allError } = await supabase
      .from('species')
      .select('species_code, name_en')
      .order('species_code');
    
    if (allError) throw allError;
    
    const needsUpdate = allSpecies?.filter(s => s.species_code !== s.species_code.toUpperCase()) || [];
    
    console.log(`Total species in database: ${allSpecies?.length || 0}`);
    console.log(`Species with lowercase codes: ${needsUpdate.length}`);
    console.log(`Species already uppercase: ${(allSpecies?.length || 0) - needsUpdate.length}\n`);
    
    if (needsUpdate.length > 0) {
      console.log('Species codes to be updated:');
      needsUpdate.slice(0, 20).forEach(s => {
        console.log(`  ${s.species_code} → ${s.species_code.toUpperCase()} (${s.name_en})`);
      });
      if (needsUpdate.length > 20) {
        console.log(`  ... and ${needsUpdate.length - 20} more`);
      }
      console.log();
    }
    
    // Step 2: Confirm before proceeding
    console.log('=' .repeat(60));
    console.log(`\n⚠️  About to update ${needsUpdate.length} species codes to UPPERCASE`);
    console.log('This action will:');
    console.log('  1. Update all lowercase species_code values to UPPERCASE');
    console.log('  2. Add a database constraint to enforce UPPERCASE in the future');
    console.log();
    
    // Step 3: Update species codes
    console.log('📝 Step 2: Updating species codes to UPPERCASE...\n');
    
    let updateCount = 0;
    for (const species of needsUpdate) {
      const { error } = await supabase
        .from('species')
        .update({ species_code: species.species_code.toUpperCase() })
        .eq('species_code', species.species_code);
      
      if (error) {
        console.error(`❌ Error updating ${species.species_code}:`, error.message);
      } else {
        updateCount++;
        if (updateCount <= 10) {
          console.log(`  ✅ ${species.species_code} → ${species.species_code.toUpperCase()}`);
        }
      }
    }
    
    if (updateCount > 10) {
      console.log(`  ... and ${updateCount - 10} more successfully updated`);
    }
    console.log();
    
    // Step 4: Verify updates
    console.log('🔍 Step 3: Verifying updates...\n');
    
    const { data: remainingLowercase, error: verifyError } = await supabase
      .from('species')
      .select('species_code, name_en')
      .order('species_code');
    
    if (verifyError) throw verifyError;
    
    const stillLowercase = remainingLowercase?.filter(s => s.species_code !== s.species_code.toUpperCase()) || [];
    
    console.log(`✅ Updated: ${updateCount} species codes`);
    console.log(`✅ Remaining lowercase: ${stillLowercase.length}`);
    
    if (stillLowercase.length > 0) {
      console.log('\n⚠️  Warning: Some codes still lowercase:');
      stillLowercase.forEach(s => console.log(`  - ${s.species_code}`));
    } else {
      console.log('✅ All species codes are now UPPERCASE!');
    }
    
    // Note about constraint
    console.log('\n📋 Note: Database constraints cannot be added via Supabase client');
    console.log('Please run this SQL in Supabase SQL Editor to add the constraint:\n');
    console.log('ALTER TABLE species ADD CONSTRAINT species_code_uppercase');
    console.log("CHECK (species_code = UPPER(species_code));\n");
    
    console.log('=' .repeat(60));
    console.log('\n✅ Migration complete!\n');
    console.log('Next steps:');
    console.log('  1. Add the constraint in Supabase SQL Editor (see above)');
    console.log('  2. Regenerate SPECIES_IMAGE_MAP: npx tsx scripts/generate-species-image-map.ts');
    console.log('  3. Test the application');
    console.log();
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
