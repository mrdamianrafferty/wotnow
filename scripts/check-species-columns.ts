import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpeciesColumns() {
  console.log('🔍 Checking species table structure...\n');

  // Get first row to see all columns
  const { data, error } = await supabase
    .from('species')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ No data returned');
    return;
  }

  console.log('📋 First row columns:');
  console.log(JSON.stringify(data[0], null, 2));

  // Try to find a species by common name
  console.log('\n🔍 Searching for "Mackerel" by common_name_en:');
  const { data: mackerel } = await supabase
    .from('species')
    .select('*')
    .ilike('common_name_en', '%Mackerel%')
    .limit(1);

  if (mackerel && mackerel.length > 0) {
    console.log('Found:', JSON.stringify(mackerel[0], null, 2));
  }
}

checkSpeciesColumns()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
