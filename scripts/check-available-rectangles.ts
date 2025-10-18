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
    .select('rectangle_code')
    .order('rectangle_code');
    
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  const unique = [...new Set(data?.map(d => d.rectangle_code) || [])];
  console.log(`Rectangles with environmental data: ${unique.length}\n`);
  unique.forEach(r => console.log(`  - ${r}`));
}

check().catch(console.error);
