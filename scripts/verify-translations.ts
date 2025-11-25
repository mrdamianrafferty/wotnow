#!/usr/bin/env tsx

/**
 * Quick verification script to check imported translations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verify() {
  // Count total rows
  const { count, error: countError } = await supabase
    .from('ui_text_strings')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting rows:', countError);
    return;
  }

  console.log(`\n📊 Total rows in ui_text_strings: ${count}`);

  // Get sample translations
  const { data, error } = await supabase
    .from('ui_text_strings')
    .select('text_key, text_en, text_es, text_fr, text_de, category, page')
    .limit(5);

  if (error) {
    console.error('Error fetching sample:', error);
    return;
  }

  console.log('\n✅ Sample translations:');
  data?.forEach((row, idx) => {
    console.log(`\n${idx + 1}. [${row.category}] ${row.page}`);
    console.log(`   Key: ${row.text_key}`);
    console.log(`   EN: ${row.text_en.substring(0, 60)}${row.text_en.length > 60 ? '...' : ''}`);
    console.log(`   ES: ${row.text_es.substring(0, 60)}${row.text_es.length > 60 ? '...' : ''}`);
    console.log(`   FR: ${row.text_fr.substring(0, 60)}${row.text_fr.length > 60 ? '...' : ''}`);
    console.log(`   DE: ${row.text_de.substring(0, 60)}${row.text_de.length > 60 ? '...' : ''}`);
  });
}

verify();
