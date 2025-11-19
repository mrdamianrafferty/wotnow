import { createClient } from '@supabase/supabase-js';

async function checkAge() {
  const s = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check age distribution of data
  const { data } = await s
    .from('findr_conditions_snapshots')
    .select('rectangle_code, captured_at')
    .order('captured_at', { ascending: false })
    .limit(105);

  if (!data) {
    console.log('No data found');
    return;
  }

  const now = new Date();
  const ages = data.map(r => {
    const age = (now.getTime() - new Date(r.captured_at).getTime()) / (1000 * 60 * 60); // hours
    return { rect: r.rectangle_code, hours: age };
  });

  console.log('=== Data Age Distribution ===\n');
  const fresh = ages.filter(a => a.hours < 12);
  const stale = ages.filter(a => a.hours >= 12);

  console.log(`Fresh (<12h): ${fresh.length} rectangles`);
  console.log(`Stale (≥12h): ${stale.length} rectangles\n`);

  if (stale.length > 0) {
    console.log('Stale rectangles needing updates:');
    stale.forEach(a => console.log(`  ${a.rect}: ${a.hours.toFixed(1)}h old`));
  }

  if (fresh.length > 0) {
    console.log(`\nOldest fresh data: ${Math.max(...fresh.map(a => a.hours)).toFixed(1)}h`);
    console.log(`Newest fresh data: ${Math.min(...fresh.map(a => a.hours)).toFixed(1)}h`);
  }
}

checkAge().catch(console.error);
