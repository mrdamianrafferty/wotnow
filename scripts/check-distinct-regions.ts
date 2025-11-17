import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRegions() {
  console.log('Checking distinct region values in ices_rectangles...\n');

  const { data } = await supabase
    .from('ices_rectangles')
    .select('region')
    .order('region');

  if (data) {
    const uniqueRegions = [...new Set(data.map(r => r.region))].filter(Boolean);
    console.log('Distinct region values:');
    uniqueRegions.forEach(r => console.log(`  - "${r}"`));
    console.log(`\nTotal: ${uniqueRegions.length} distinct regions`);

    console.log('\n\nExpected biogeographic region codes:');
    console.log('  - BALT, BIS, IBR, MED, NEA, NSEA, SCA');

    console.log('\n\nDo these match? NO - regions contain human-readable names, not codes!');
  }
}

checkRegions().catch(console.error);
