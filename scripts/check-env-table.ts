import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Checking rectangle_environmental_conditions...');
  
  const { data: envData, error: envError } = await supabase
    .from('rectangle_environmental_conditions')
    .select('*')
    .limit(3);

  if (envError) {
    console.log('ERROR:', envError.message);
    console.log('Code:', envError.code);
  } else {
    console.log('Rows found:', envData?.length ?? 0);
    if (envData && envData.length > 0) {
      console.log('Sample:', JSON.stringify(envData[0], null, 2));
    }
  }

  console.log('\nChecking findr_conditions_snapshots...');
  
  const { data: snapData, error: snapError } = await supabase
    .from('findr_conditions_snapshots')
    .select('rectangle_code, sea_temp_c, source')
    .limit(3);

  if (snapError) {
    console.log('ERROR:', snapError.message);
  } else {
    console.log('Rows found:', snapData?.length ?? 0);
    if (snapData && snapData.length > 0) {
      console.log('Samples:', snapData);
    }
  }
}

main();
