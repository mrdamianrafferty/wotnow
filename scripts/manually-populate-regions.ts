import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function populate() {
  console.log('Populating biogeographic_regions...\n');
  
  // First, set default for all species
  const { error: defaultError } = await supabase
    .from('species')
    .update({
      biogeographic_regions: ['Atlantic', 'Mediterranean', 'North Sea', 'Celtic Sea', 'English Channel', 'Irish Sea', 'Bay of Biscay', 'IBI']
    })
    .is('biogeographic_regions', null);
    
  if (defaultError) {
    console.error('Default update error:', defaultError);
    return;
  }
  
  console.log('✅ Set default regions for all species');
  
  // Now test
  const { data, error } = await supabase.rpc('get_environmental_predictions_basic', {
    target_rectangle: '25E1',
    target_date: '2025-10-18'
  });
  
  if (error) {
    console.error('RPC error:', error);
    return;
  }
  
  console.log(`\n✅ Predictions: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log('\nTop 5:');
    data.slice(0, 5).forEach((p: any) => {
      console.log(`  ${p.confidence}% - ${p.name_en}`);
    });
  }
}

populate().catch(console.error);
