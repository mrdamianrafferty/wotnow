import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get all rectangles with their captured_at timestamps
  const { data: conditions, error } = await supabase
    .from('findr_conditions_latest')
    .select('rectangle_code, captured_at, source')
    .order('captured_at', { ascending: false });

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!conditions || conditions.length === 0) {
    console.log('No data found in findr_conditions_latest');
    return;
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let veryFresh = 0;  // < 1 hour
  let fresh = 0;      // < 24 hours
  let stale24_48 = 0; // 24-48 hours
  let stale48h_1w = 0; // 48 hours - 1 week
  let veryStale = 0;  // > 1 week
  let noTimestamp = 0;

  const oldestRecords: Array<{ code: string; age: string; captured: Date | null }> = [];

  conditions.forEach(c => {
    if (!c.captured_at) {
      noTimestamp++;
      return;
    }

    const capturedAt = new Date(c.captured_at);
    const ageMs = now.getTime() - capturedAt.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    if (capturedAt > oneHourAgo) {
      veryFresh++;
    } else if (capturedAt > twentyFourHoursAgo) {
      fresh++;
    } else if (capturedAt > fortyEightHoursAgo) {
      stale24_48++;
    } else if (capturedAt > oneWeekAgo) {
      stale48h_1w++;
    } else {
      veryStale++;
      oldestRecords.push({
        code: c.rectangle_code,
        age: `${Math.floor(ageHours / 24)}d ${Math.floor(ageHours % 24)}h`,
        captured: capturedAt
      });
    }
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                   CMEMS DATA FRESHNESS REPORT                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log(`📊 Total rectangles with data: ${conditions.length}\n`);

  console.log('🕐 Data Age Distribution:');
  console.log(`   ✨ Very Fresh (< 1 hour):     ${veryFresh.toString().padStart(3)} (${((veryFresh / conditions.length) * 100).toFixed(1)}%)`);
  console.log(`   ✅ Fresh (< 24 hours):        ${fresh.toString().padStart(3)} (${((fresh / conditions.length) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Stale (24-48 hours):      ${stale24_48.toString().padStart(3)} (${((stale24_48 / conditions.length) * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Stale (48h-1 week):       ${stale48h_1w.toString().padStart(3)} (${((stale48h_1w / conditions.length) * 100).toFixed(1)}%)`);
  console.log(`   ❌ Very Stale (> 1 week):     ${veryStale.toString().padStart(3)} (${((veryStale / conditions.length) * 100).toFixed(1)}%)`);
  if (noTimestamp > 0) {
    console.log(`   ❓ No timestamp:              ${noTimestamp.toString().padStart(3)} (${((noTimestamp / conditions.length) * 100).toFixed(1)}%)`);
  }

  const totalFresh = veryFresh + fresh;
  console.log(`\n📈 Total Fresh Data (< 24h): ${totalFresh}/${conditions.length} (${((totalFresh / conditions.length) * 100).toFixed(1)}%)`);

  // Show oldest and newest timestamps
  const sortedByAge = [...conditions].sort((a, b) => {
    const dateA = a.captured_at ? new Date(a.captured_at).getTime() : 0;
    const dateB = b.captured_at ? new Date(b.captured_at).getTime() : 0;
    return dateA - dateB;
  });

  const oldest = sortedByAge[0];
  const newest = sortedByAge[sortedByAge.length - 1];

  if (oldest?.captured_at) {
    const oldestDate = new Date(oldest.captured_at);
    const ageMs = now.getTime() - oldestDate.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    console.log(`\n📅 Oldest data: ${oldest.rectangle_code} - ${ageDays}d ${ageHours}h old (${oldestDate.toISOString()})`);
  }

  if (newest?.captured_at) {
    const newestDate = new Date(newest.captured_at);
    const ageMs = now.getTime() - newestDate.getTime();
    const ageMinutes = Math.floor(ageMs / (1000 * 60));
    console.log(`📅 Newest data: ${newest.rectangle_code} - ${ageMinutes}m ago (${newestDate.toISOString()})`);
  }

  // Show very stale rectangles if any
  if (veryStale > 0) {
    console.log(`\n⚠️  Rectangles with very stale data (> 1 week):`);
    oldestRecords.sort((a, b) => {
      const dateA = a.captured ? a.captured.getTime() : 0;
      const dateB = b.captured ? b.captured.getTime() : 0;
      return dateA - dateB;
    });
    oldestRecords.slice(0, 10).forEach(r => {
      console.log(`   ${r.code}: ${r.age} old (${r.captured?.toISOString()})`);
    });
    if (oldestRecords.length > 10) {
      console.log(`   ... and ${oldestRecords.length - 10} more`);
    }
  }

  console.log('');
}

main().catch(console.error);
