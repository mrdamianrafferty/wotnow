import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!;
const supabase = createClient(url, key);

async function main() {
  // First check counts
  const { count: total } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  const { count: offshore } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true })
    .gt('distance_to_shore_km', 50);

  console.log(`\n📊 Current counts:`);
  console.log(`   Total rectangles: ${total}`);
  console.log(`   Offshore (>50km): ${offshore}`);
  console.log(`   Coastal (≤50km): ${total! - offshore!}`);

  // Delete offshore rectangles
  console.log(`\n🗑️  Deleting ${offshore} offshore rectangles...`);
  const { error, count: deleted } = await supabase
    .from('ices_rectangles')
    .delete({ count: 'exact' })
    .gt('distance_to_shore_km', 50);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Deleted ${deleted} rectangles`);
  }

  // Verify final count
  const { count: remaining } = await supabase
    .from('ices_rectangles')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Final count: ${remaining} rectangles (all ≤50km from shore)`);
}

main().catch(console.error);
