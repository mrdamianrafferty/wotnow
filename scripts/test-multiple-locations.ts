// Test predictions for multiple worldwide locations
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const locations = [
  { name: 'San Francisco (US West)', lat: 37.7, lon: -122.4, expectedRegion: 'NE_Pacific' },
  { name: 'Florida Keys (Caribbean)', lat: 24.5, lon: -81.8, expectedRegion: 'Caribbean' },
  { name: 'New York (NW Atlantic)', lat: 40.7, lon: -74.0, expectedRegion: 'NW_Atlantic' },
  { name: 'English Channel (NE Atlantic)', lat: 51.5, lon: 1.5, expectedRegion: 'NE_Atlantic' },
  { name: 'Mediterranean (Spain)', lat: 41.5, lon: 2.5, expectedRegion: 'Mediterranean' },
];

async function testAll() {
  console.log('=== TESTING WORLDWIDE PREDICTIONS ===\n');

  for (const loc of locations) {
    const { data, error } = await supabase.rpc(
      'get_global_fishing_predictions',
      {
        user_lat: loc.lat,
        user_lon: loc.lon,
        target_date: '2025-10-24',
        p_lang: 'en',
      }
    );

    if (error) {
      console.log(`❌ ${loc.name}: ERROR - ${error.message}`);
      continue;
    }

    const count = data ? data.length : 0;
    if (count === 0) {
      console.log(`❌ ${loc.name}: NO PREDICTIONS (THIS SHOULD NEVER HAPPEN!)`);
      continue;
    }

    const firstRegions = data[0]?.biogeographic_regions || [];
    const hasExpectedRegion = firstRegions.includes(loc.expectedRegion);

    console.log(`${hasExpectedRegion ? '✅' : '⚠️ '} ${loc.name}:`);
    console.log(`   ${count} species | Grid: ${data[0].grid_cell_id} | ICES: ${data[0].ices_rectangle || 'N/A'}`);
    console.log(`   Top: ${data[0].name_en} (${firstRegions.join(', ')})`);
    console.log(`   Data: ${data[0].has_environmental_data ? 'YES' : 'NO'} | Source: ${data[0].data_source}`);
    console.log('');
  }

  console.log('=== TEST COMPLETE ===');
}

testAll();
