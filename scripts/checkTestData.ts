import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkData() {
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .select('*')
    .eq('rectangle_code', '37I0')
    .gte('captured_at', '2025-10-01')
    .lt('captured_at', '2025-10-02')
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkData();
