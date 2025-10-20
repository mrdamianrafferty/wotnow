import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRectangle28E5() {
  console.log('Fixing rectangle 28E5...');
  
  // First check current value
  const { data: before } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, region, cmems_region')
    .eq('rectangle_code', '28E5')
    .single();
    
  console.log('Before:', before);
  
  // Update to Bay of Biscay
  const { data, error } = await supabase
    .from('ices_rectangles')
    .update({ region: 'Bay of Biscay' })
    .eq('rectangle_code', '28E5')
    .select();

  if (error) {
    console.error('Error updating:', error);
    return;
  }

  console.log('After:', data);
  console.log('✅ Fixed! Region is now "Bay of Biscay"');
}

fixRectangle28E5();
