import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function check() {
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', '25E1')
    .order('captured_at', { ascending: false })
    .limit(1);
    
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('❌ No data for rectangle 25E1');
    console.log('\nChecking what rectangles DO have data...\n');
    
    const { data: available } = await supabase
      .from('findr_conditions_snapshots')
      .select('rectangle_code')
      .order('rectangle_code')
      .limit(20);
      
    console.log('First 20 rectangles with data:');
    available?.forEach(r => console.log(`  - ${r.rectangle_code}`));
  } else {
    console.log('✅ Rectangle 25E1 HAS data:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

check().catch(console.error);
