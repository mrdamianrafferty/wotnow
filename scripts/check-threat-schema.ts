#!/usr/bin/env npx tsx
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.from('garden_threat').select('*').limit(2);
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('garden_threat columns:', Object.keys(data?.[0] || {}));
  console.log('\nSample rows:');
  data?.forEach(row => {
    console.log(`\n--- ${row.common_name_en} ---`);
    console.log(JSON.stringify(row, null, 2));
  });
}

main();
