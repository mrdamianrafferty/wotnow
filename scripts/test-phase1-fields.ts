#!/usr/bin/env tsx
/**
 * Test Phase 1 Fields in Predictions
 *
 * Verifies that get_global_fishing_predictions returns the new Phase 1 fields:
 * - recommended_baits
 * - preferred_habitats
 * - effective_techniques
 * - best_times
 * - fun_fact_en
 * - conservation_status
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.cli
config({ path: path.join(process.cwd(), '.env.cli') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testPhase1Fields() {
  console.log('🧪 Testing Phase 1 Fields in Predictions Function\n');

  // Test location: London coordinates
  const testLat = 51.5;
  const testLon = -0.1;

  console.log(`📍 Test location: ${testLat}, ${testLon}\n`);

  const { data, error } = await supabase.rpc('get_global_fishing_predictions', {
    user_lat: testLat,
    user_lon: testLon,
    target_date: new Date().toISOString().split('T')[0],
    p_lang: 'en'
  });

  if (error) {
    console.error('❌ RPC call failed:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ No predictions returned');
    process.exit(1);
  }

  console.log(`✅ Received ${data.length} predictions\n`);

  // Check first 3 predictions for Phase 1 fields
  const samplesToCheck = Math.min(3, data.length);
  let allFieldsPresent = true;

  for (let i = 0; i < samplesToCheck; i++) {
    const prediction = data[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Species ${i + 1}: ${prediction.name_en} (${prediction.scientific_name})`);
    console.log('='.repeat(60));

    // Check each Phase 1 field
    const phase1Fields = [
      'recommended_baits',
      'preferred_habitats',
      'effective_techniques',
      'best_times',
      'fun_fact_en',
      'conservation_status'
    ];

    for (const field of phase1Fields) {
      const value = prediction[field];
      const isPresent = value !== undefined;
      const hasData = Array.isArray(value) ? value.length > 0 : value !== null;

      if (!isPresent) {
        console.log(`❌ ${field}: MISSING FROM RESPONSE`);
        allFieldsPresent = false;
      } else if (hasData) {
        console.log(`✅ ${field}: ${JSON.stringify(value)}`);
      } else {
        console.log(`⚠️  ${field}: present but null/empty`);
      }
    }
  }

  console.log(`\n${'='.repeat(60)}`);

  if (allFieldsPresent) {
    console.log('✅ SUCCESS: All Phase 1 fields are present in the API response!');
    console.log('\nNext step: Update UI components to display these fields.');
  } else {
    console.log('❌ FAILURE: Some Phase 1 fields are missing from the API response.');
    console.log('\nThe migration may not have been applied correctly.');
  }

  console.log('='.repeat(60));
}

testPhase1Fields()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
