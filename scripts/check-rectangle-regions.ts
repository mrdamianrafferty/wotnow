import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function checkRegions() {
  // Get unique regions
  const { data: regions } = await supabase
    .from('ices_rectangles')
    .select('region')
    .order('region');
    
  const uniqueRegions = [...new Set(regions?.map(r => r.region))];
  console.log('Available ICES regions:', uniqueRegions);
  
  // Get Bay of Biscay rectangles
  const { data: biscay } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region')
    .eq('region', 'Bay of Biscay')
    .limit(5);
    
  console.log('\nBay of Biscay samples:', biscay?.map(r => r.rectangle_code));
  
  // Check what regions we should filter FOR based on rectangle
  console.log('\nRegion mapping needed:');
  console.log('  Atlantic regions: North Sea, Celtic Sea, IBI, Bay of Biscay, English Channel');
  console.log('  Mediterranean regions: Western Mediterranean, Adriatic Sea, Aegean Sea');
}

checkRegions().catch(console.error);
