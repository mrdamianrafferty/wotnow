import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
  console.log('🔍 EMERGENCY: Finding the conditions data\n');
  
  // Check findr_conditions_latest view
  console.log('1. Checking findr_conditions_latest view...');
  const { data: latest, error: latestError } = await supabase
    .from('findr_conditions_latest')
    .select('*')
    .limit(1);
  
  if (latestError) {
    console.log('   ❌ Error:', latestError.message);
  } else if (latest && latest.length > 0) {
    console.log('   ✅ Has data!');
    console.log('   Columns:', Object.keys(latest[0]).join(', '));
    
    // Check for 28E5
    const { data: e5 } = await supabase
      .from('findr_conditions_latest')
      .select('*')
      .eq('rectangle_code', '28E5')
      .single();
    
    if (e5) {
      console.log('\n   ✅ FOUND 28E5 in latest view!');
      console.log('   Temp:', e5.sea_temp_c);
      console.log('   Full record:', e5);
    } else {
      console.log('\n   ❌ 28E5 not in latest view');
    }
    
    // Get count
    const { count } = await supabase
      .from('findr_conditions_latest')
      .select('*', { count: 'exact', head: true });
    console.log('   Total records:', count);
  } else {
    console.log('   ❌ Empty');
  }
  
  // Check findr_conditions table
  console.log('\n2. Checking findr_conditions table...');
  const { data: cond, error: condError } = await supabase
    .from('findr_conditions')
    .select('*')
    .limit(1);
  
  if (condError) {
    console.log('   ❌ Error:', condError.message);
  } else if (cond && cond.length > 0) {
    console.log('   ✅ Has data!');
    console.log('   Columns:', Object.keys(cond[0]).join(', '));
    
    const { count } = await supabase
      .from('findr_conditions')
      .select('*', { count: 'exact', head: true });
    console.log('   Total records:', count);
  } else {
    console.log('   ❌ Empty');
  }
  
  // List all tables with "findr" or "conditions"
  console.log('\n3. All available tables with findr/conditions:');
  console.log('   (Try querying these manually in Supabase dashboard)');
  console.log('   - findr_conditions_snapshots (EMPTY)');
  console.log('   - findr_conditions_latest (checked above)');
  console.log('   - findr_conditions (checked above)');
}

main();
