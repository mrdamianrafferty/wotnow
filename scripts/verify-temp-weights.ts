import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function verify() {
  const { data, error } = await supabase
    .from('species')
    .select('name_en, temp_weight, temp_opt_c')
    .order('temp_weight', { ascending: false })
    .limit(20);
    
  if (error) {
    console.log('Error:', error.message);
    return;
  }
  
  console.log('\nTop species by temperature weight:\n');
  data?.forEach(s => {
    const category = 
      s.temp_weight >= 0.30 ? '🔥 Highly migratory/temp sensitive' :
      s.temp_weight >= 0.20 ? '🌊 Moderately migratory' :
      s.temp_weight >= 0.15 ? '📊 Default' :
      '🏠 Resident/tolerant';
      
    console.log(`${s.temp_weight.toFixed(2)} - ${s.name_en.padEnd(30)} ${category} (opt: ${s.temp_opt_c || 'N/A'}°C)`);
  });
}

verify().catch(console.error);
