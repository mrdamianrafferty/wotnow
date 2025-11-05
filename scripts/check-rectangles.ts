import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Expected region mappings based on regionRouter.ts
const EXPECTED_MAPPINGS: Record<string, string> = {
  // English Channel should be NWS
  'english channel': 'NWS',
  // North Sea should be NWS
  'north sea': 'NWS',
  // Celtic Sea could be IBI or NWS depending on exact location
  'celtic sea': 'IBI',
  // Bay of Biscay should be IBI
  'bay of biscay': 'IBI',
  // Irish Sea should be IBI
  'irish sea': 'IBI',
  'irish': 'IBI',
  // Portuguese waters should be IBI
  'portuguese': 'IBI',
  // Spanish Atlantic should be IBI
  'galician': 'IBI',
  // Scottish waters - depends on location
  'scottish': 'NWS',
  'west of scotland': 'IBI',
  // Norwegian waters should be NWS or ARC
  'norwegian': 'NWS',
  // Baltic should be BAL
  'baltic': 'BAL',
  'finnish': 'BAL',
  'swedish': 'BAL',
  'polish': 'BAL',
  'danish': 'NWS', // Danish North Sea
  // Mediterranean should be MED
  'mediterranean': 'MED',
  'adriatic': 'MED',
  // Black Sea should be BLK
  'black sea': 'BLK',
};

async function main() {
  // Fetch all coastal fishing zone rectangles
  const { data: rectangles, error } = await supabase
    .from('ices_rectangles')
    .select('rectangle_code, center_lat, center_lon, region, cmems_region')
    .eq('is_coastal_fishing_zone', true)
    .order('rectangle_code');

  if (error) {
    console.error('Error fetching rectangles:', error);
    return;
  }

  console.log(`\nAnalyzing ${rectangles?.length || 0} coastal rectangles...\n`);

  const issues: any[] = [];
  const regionCounts: Record<string, number> = {};

  for (const rect of rectangles || []) {
    const regionLower = (rect.region || '').toLowerCase();

    // Count by CMEMS region
    regionCounts[rect.cmems_region || 'NULL'] = (regionCounts[rect.cmems_region || 'NULL'] || 0) + 1;

    // Check for likely mismatches
    for (const [regionKey, expectedCmems] of Object.entries(EXPECTED_MAPPINGS)) {
      if (regionLower.includes(regionKey)) {
        if (rect.cmems_region !== expectedCmems) {
          issues.push({
            rectangle_code: rect.rectangle_code,
            lat: rect.center_lat,
            lon: rect.center_lon,
            region: rect.region,
            current_cmems: rect.cmems_region,
            expected_cmems: expectedCmems,
            reason: `"${rect.region}" should use ${expectedCmems}, not ${rect.cmems_region}`
          });
        }
        break;
      }
    }
  }

  console.log('📊 Region Distribution:');
  for (const [region, count] of Object.entries(regionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`   ${region}: ${count} rectangles`);
  }

  if (issues.length > 0) {
    console.log(`\n⚠️  Found ${issues.length} potential region mapping issues:\n`);
    for (const issue of issues) {
      console.log(`${issue.rectangle_code} (${issue.lat.toFixed(2)}, ${issue.lon.toFixed(2)})`);
      console.log(`  ${issue.reason}`);
      console.log('');
    }

    // Group by fix type
    const fixes: Record<string, string[]> = {};
    for (const issue of issues) {
      const key = `${issue.current_cmems} → ${issue.expected_cmems}`;
      if (!fixes[key]) fixes[key] = [];
      fixes[key].push(issue.rectangle_code);
    }

    console.log('\n📝 Suggested SQL fixes:\n');
    for (const [change, codes] of Object.entries(fixes)) {
      const [from, to] = change.split(' → ');
      console.log(`-- ${change} (${codes.length} rectangles)`);
      console.log(`UPDATE ices_rectangles SET cmems_region = '${to}'`);
      console.log(`WHERE rectangle_code IN (${codes.map(c => `'${c}'`).join(', ')});`);
      console.log('');
    }
  } else {
    console.log('\n✅ No obvious region mapping issues found!');
  }
}

main();
