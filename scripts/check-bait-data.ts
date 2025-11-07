import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

async function check() {
  // First get Sea Bass species_id
  const { data: species } = await supabase
    .from('species')
    .select('id, name_en, guild')
    .eq('name_en', 'Sea Bass')
    .single();

  if (!species) {
    console.log('Sea Bass not found');
    return;
  }

  console.log('Sea Bass ID:', species.id);
  console.log('Guild:', species.guild);
  console.log('');

  // Get bait data
  const { data: baitData } = await supabase
    .from('species_bait')
    .select(`
      bait_id,
      effectiveness,
      notes,
      bait!inner (
        id,
        name_en
      )
    `)
    .eq('species_id', species.id)
    .order('effectiveness', { ascending: false });

  console.log('Bait data from species_bait table:');
  console.log('');
  baitData?.forEach(b => {
    const baitInfo = Array.isArray(b.bait) ? b.bait[0] : b.bait;
    console.log(`Bait: ${baitInfo.name_en}`);
    console.log(`  Effectiveness: ${b.effectiveness}%`);
    console.log(`  Notes: ${b.notes || 'NULL'}`);
    console.log('');
  });
}

check();
