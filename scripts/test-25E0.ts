import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test25E0() {
  console.log('Testing rectangle 25E0 with Confidence V2\n');
  console.log('Using today\'s date:', new Date().toISOString().split('T')[0]);

  const targetDate = new Date().toISOString().split('T')[0];
  const targetMonth = new Date().getMonth() + 1;

  const { data, error } = await supabase.rpc('get_fishing_confidence_v2', {
    target_rectangle: '25E0',
    target_date: targetDate,
    target_month: targetMonth
  });

  if (error) {
    console.error('RPC Error:', error);
    return;
  }

  console.log(`\nFound ${data?.length || 0} species for rectangle 25E0\n`);

  if (data && data.length > 0) {
    console.log('Top 10 species:');
    console.log('─'.repeat(80));
    data.slice(0, 10).forEach((r: any, i: number) => {
      console.log(`${i+1}. ${r.species_code} (${r.species_name}): ${r.confidence_percent}%`);
      console.log(`   Base Availability: ${r.base_availability_score}`);
      console.log(`   Environmental Match: ${r.environmental_match_score}`);
      console.log('');
    });

    // Show all species with their confidence scores
    console.log('\n\nAll species (Code - Name: Confidence%):');
    console.log('─'.repeat(80));
    data.forEach((r: any) => {
      console.log(`${r.species_code} - ${r.species_name}: ${r.confidence_percent}%`);
    });
  }
}

test25E0().catch(console.error);
