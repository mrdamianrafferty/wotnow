import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('Checking species_regional_availability table...\n');

  // Check if table exists and has data
  const { data, error } = await supabase
    .from('species_regional_availability')
    .select('*')
    .limit(5);

  if (error) {
    console.log('Table query error:', error.message);
    return;
  }

  console.log('Sample data:');
  console.log(JSON.stringify(data, null, 2));

  // Get stats
  const { count, error: countError } = await supabase
    .from('species_regional_availability')
    .select('*', { count: 'exact', head: true });

  if (!countError) {
    console.log(`\nTotal records: ${count}`);
  }

  // Check for records with catch data
  const { data: withCatches } = await supabase
    .from('species_regional_availability')
    .select('species_code, region_id, catch_count')
    .gt('catch_count', 0)
    .limit(10);

  console.log(`\nRecords with catch data (sample):`, withCatches?.length || 0);
  if (withCatches && withCatches.length > 0) {
    console.log(JSON.stringify(withCatches, null, 2));
  }
}

main().catch(console.error);
