import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const rectangleCode = process.argv[2] || '37I0';
const date = process.argv[3] || '2025-10-01';

async function deleteTestData() {
  const { data, error } = await supabase
    .from('findr_conditions_snapshots')
    .delete()
    .eq('rectangle_code', rectangleCode)
    .gte('captured_at', date)
    .lt('captured_at', `${date.split('T')[0]}T23:59:59`);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Deleted test data for ${rectangleCode} on ${date}`);
  }
}

deleteTestData();
